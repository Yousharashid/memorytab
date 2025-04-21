import { generateMemoryEntries, StoredDayData } from './lib/summarizeDayLLM'; 
import type { MemoryEntry } from './types';

// --- Constants ---
const DAILY_SUMMARY_ALARM_NAME = 'dailySummaryAlarm';
const OFFSCREEN_DOCUMENT_PATH = 'src/pages/offscreen/index.html';

// --- State Variables ---
let creatingOffscreenDocument: Promise<void> | null = null; // Prevent race conditions for creation
let isSummaryRunning = false; // Concurrency lock for performDailySummary

// --- Helper Functions ---

// --- Offscreen Document Management ---

// Function to get today's date as YYYY-MM-DD string
function getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function hasOffscreenDocument(): Promise<boolean> {
  // Check if the document is already open
  const existingContexts = await chrome.runtime.getContexts({ 
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)] 
  });
  return existingContexts.length > 0;
}

async function setupOffscreenDocument(): Promise<boolean> {
  if (await hasOffscreenDocument()) {
    console.log("Offscreen document already exists.");
    return true;
  }

  // Avoid race conditions during creation
  if (creatingOffscreenDocument) {
    console.log("Offscreen document creation already in progress. Waiting...");
    await creatingOffscreenDocument;
    // Check again after waiting
    return await hasOffscreenDocument(); 
  }

  console.log("Creating offscreen document...");
  creatingOffscreenDocument = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.LOCAL_STORAGE], 
    justification: 'Perform long-running OpenAI API fetch request.',
  });

  let success = false;
  try {
    await creatingOffscreenDocument;
    console.log("Offscreen document created successfully.");
    success = true;
  } catch (error: any) {
    console.error("Error creating offscreen document:", error);
    success = false; // Explicitly false on error
  } finally {
    creatingOffscreenDocument = null; // Reset the creation lock
  }
  return success;
}

// Close the offscreen document when the service worker becomes inactive (optional, but good practice)
// Note: This listener might not always fire reliably before timeout.
// chrome.runtime.onSuspend.addListener(() => { 
//   chrome.offscreen.closeDocument().catch(e => console.error("Error closing offscreen doc on suspend:", e));
// });

// --- Main Summary Logic ---
async function performDailySummary() {
    const todayKey = getTodayDateString();
    console.log(`[Hourly Append] Entering performDailySummary for key: ${todayKey}...`);

    let apiKey = '';
    let newlyGeneratedEntries: MemoryEntry[] = [];
    let existingEntries: MemoryEntry[] = [];
    let previousError: string | null = null;

    try {
        // --- Ensure Offscreen Document Exists --- 
        const offscreenReady = await setupOffscreenDocument();
        if (!offscreenReady) {
            throw new Error("Offscreen document setup failed.");
        }

        // --- Fetch Existing Data for Today (if any) ---
        try {
            const existingDataResult = await chrome.storage.local.get(todayKey);
            if (existingDataResult && existingDataResult[todayKey]) {
                const existingStoredData = existingDataResult[todayKey] as StoredDayData;
                existingEntries = existingStoredData.entries || [];
                previousError = existingStoredData.error || null; // Preserve previous error status if entries exist
                console.log(`[Hourly Append] Found ${existingEntries.length} existing entries for ${todayKey}.`);
            }
        } catch (fetchError) {
            console.warn(`[Hourly Append] Could not fetch existing data for ${todayKey}, starting fresh.`, fetchError);
        }

        // --- 1. Get API Key --- 
        console.log("Attempting to get API key...");
        const apiKeyData = await chrome.storage.local.get('openaiApiKey');
        apiKey = apiKeyData.openaiApiKey;
        if (!apiKey || !apiKey.startsWith("sk-")) {
            throw new Error('Invalid API key found');
        }
        console.log("API key retrieved: Exists");

        // --- 2. Fetch History for the LAST HOUR --- 
        console.log("[Hourly Append] Attempting to get history for the last hour...");
        const endTime = new Date();
        // Modify startTime to be 60 minutes ago
        const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); 
        console.log(`[Hourly Append] Fetching history from ${startTime.toISOString()} to ${endTime.toISOString()}`);
        let historyItems = await chrome.history.search({
            text: '',
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
            maxResults: 500 // Adjust maxResults if needed for hourly volume
        });
        console.log(`[Hourly Append] History items retrieved: ${historyItems.length}`);

        // --- Filter non-web pages ---
        const webHistoryItems = historyItems.filter(item =>
            item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'))
        );
        console.log(`[Hourly Append] Filtered web history items: ${webHistoryItems.length}`);

        // --- 3. Generate NEW Memories via Offscreen Document --- 
        if (webHistoryItems.length > 0) {
            console.log("[Hourly Append] Attempting to call generateMemoryEntries (via Offscreen)...");
            newlyGeneratedEntries = await generateMemoryEntries(apiKey, webHistoryItems);
            console.log(`[Hourly Append] generateMemoryEntries call completed. ${newlyGeneratedEntries.length} new entries generated.`);
        } else {
            console.log(`[Hourly Append] No relevant web history found in the last hour for ${todayKey}.`);
            // No new entries generated, we will just re-save existing ones + timestamp
        }

        // --- 4. Combine and Save results --- 
        // Prepend new entries to existing ones for chronological order (newest first)
        const combinedEntries = [...newlyGeneratedEntries, ...existingEntries];
        // Optional: Add duplicate filtering here if needed based on summary/tags
        
        console.log(`[Hourly Append] Attempting to save ${combinedEntries.length} total entries to storage...`);
        // Save combined entries, clear any previous error on success
        const dataToStore: StoredDayData = { 
            entries: combinedEntries, 
            lastUpdated: new Date().toISOString(), 
            error: null // Clear error on successful run
        };
        await chrome.storage.local.set({ [todayKey]: dataToStore });
        console.log(`[Hourly Append] Combined memory entries saved to storage for key: ${todayKey}`);

    } catch (error: any) {
        console.error("[Hourly Append] Error during performDailySummary:", error);
        // Save error state, preserving existing entries if possible
        const errorData: StoredDayData = { 
            entries: existingEntries, // Keep existing entries when saving error
            lastUpdated: new Date().toISOString(), 
            // Use the new error message, or keep the previous one if the new error is about API key and entries exist?
            // Let's prioritize the new error message for clarity.
            error: error.message || 'Unknown error' 
        };
        try {
            await chrome.storage.local.set({ [todayKey]: errorData });
            console.log(`[Hourly Append] Error state saved to storage for key: ${todayKey}, preserving ${existingEntries.length} entries.`);
        } catch (saveError) {
            console.error("[Hourly Append] Failed to save error state to storage:", saveError);
        }
    }
    console.log(`[Hourly Append] Exiting performDailySummary for key: ${todayKey}.`);
}

// --- Event Listeners ---

// On Install/Update: Set up the alarm
chrome.runtime.onInstalled.addListener((details) => {
  if (import.meta.env.DEV) {
    console.log('[DEBUG] Extension installed/updated. Attempting alarm creation.', details);
  }
  // --- Restore Alarm Creation --- 
  // Set period to 5 minutes in dev, 60 minutes (1 hour) in production
  const periodInMinutes = import.meta.env.DEV ? 5 : 60; 
  chrome.alarms.create(DAILY_SUMMARY_ALARM_NAME, {
    periodInMinutes: periodInMinutes 
  });
  if (import.meta.env.DEV) {
    console.log(`Daily summary alarm created/updated. Running every ${periodInMinutes} minutes.`);
  }
  // --- End Restore ---
});

// On Startup: (Optional) You could run summary on browser start if needed
// chrome.runtime.onStartup.addListener(() => {
//   if (import.meta.env.DEV) {
//     console.log('Browser startup detected.');
//   }
//   // Potentially trigger summary or check alarm state
// });

// On Alarm Trigger: Run the summary function (Check lock here too? Optional but safer)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (import.meta.env.DEV) {
    console.log('[DEBUG] Alarm triggered.', alarm);
  }
  if (alarm.name === DAILY_SUMMARY_ALARM_NAME) {
    if (isSummaryRunning) {
        console.log("[DEBUG] Alarm trigger skipped: Summary already running.");
        return; 
    }
    // Set lock immediately before starting async operation
    isSummaryRunning = true; 
    performDailySummary().finally(() => {
        isSummaryRunning = false; // Release lock when done
        console.log("[DEBUG] Summary via alarm finished. Lock released.");
    });
  }
});

// Listener for manual trigger message
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.command === "triggerManualSummary") {
        console.log("[DEBUG] Manual summary trigger received.");

        // Check concurrency lock
        if (isSummaryRunning) {
            console.log("[DEBUG] Summary is already running. Ignoring trigger.");
            // Send immediate response indicating it's busy
            sendResponse({ status: "Summary process is already running." });
            // Return false as we responded synchronously
            return false; 
        }

        // Set the lock BEFORE starting the async operation
        isSummaryRunning = true;
        console.log("[DEBUG] Set summary lock.");

        // Use an IIFE to handle the async function call properly
        (async () => {
            try {
                await performDailySummary();
                sendResponse({ status: "Summary triggered successfully." }); 
            } catch (error: any) {
                console.error("[DEBUG] Error during manually triggered summary:", error);
                // Ensure error is structured clonable for sendResponse
                const errorMessage = error instanceof Error ? error.message : String(error);
                sendResponse({ status: "Error during summary trigger.", error: errorMessage });
            } finally {
                // Release the lock whether success or error
                isSummaryRunning = false;
                console.log("[DEBUG] Summary finished. Lock released.");
            }
        })();
        // Return true because we will respond asynchronously
        return true; 

    } else if (message.command === "clearMemory") {
        console.log("[DEBUG] Clear memory command received.");
        (async () => {
            try {
                // --- MODIFIED CLEARING LOGIC ---
                // 1. Get all keys from local storage
                const allData = await chrome.storage.local.get(null);
                const allKeys = Object.keys(allData);

                // 2. Filter keys to find only the daily data keys (YYYY-MM-DD format)
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                const keysToRemove = allKeys.filter(key => dateRegex.test(key));

                // 3. Remove only the identified daily data keys
                if (keysToRemove.length > 0) {
                    await chrome.storage.local.remove(keysToRemove);
                    console.log(`[DEBUG] Removed stored memories for keys: ${keysToRemove.join(', ')}`);
                    sendResponse({ status: "Stored memories cleared successfully." });
                } else {
                     console.log("[DEBUG] No stored daily memories found to clear.");
                     sendResponse({ status: "No stored memories to clear." });
                }
                // --- END MODIFIED CLEARING LOGIC ---

            } catch (error: any) {
                 console.error("[DEBUG] Error clearing stored memories:", error);
                 const errorMessage = error instanceof Error ? error.message : String(error);
                 sendResponse({ status: "Error clearing memories.", error: errorMessage });
            }
        })();
        return true; // Keep channel open for async response
    }
    
    // If the command wasn't handled, return undefined (or false) implicitly.
    // This signals Chrome that this listener won't send an async response for this message.
});

if (import.meta.env.DEV) {
  console.log('Background script loaded (fully restored).');
} 