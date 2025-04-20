import { generateMemoryEntries, MemoryEntry, StoredDayData } from './lib/summarizeDayLLM'; 

// --- Constants ---
const DAILY_SUMMARY_ALARM_NAME = 'dailySummaryAlarm';
const OFFSCREEN_DOCUMENT_PATH = 'src/pages/offscreen/index.html';

// --- Helper Functions ---

// --- Offscreen Document Management ---
let creatingOffscreenDocument: Promise<void> | null = null; // Prevent race conditions

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
    // ADDED: Get the correct date key for the current execution
    const todayKey = getTodayDateString();
    console.log(`Entering performDailySummary for key: ${todayKey}...`);

    let apiKey = '';
    let memoryEntries: MemoryEntry[] = [];

    try {
        // --- Ensure Offscreen Document Exists --- 
        const offscreenReady = await setupOffscreenDocument();
        if (!offscreenReady) {
            console.error("Failed to setup offscreen document. Aborting summary.");
            // Optionally save an error state specific to offscreen failure
            throw new Error("Offscreen document setup failed."); // Throw to trigger general error handling
        }

        // --- 1. Get API Key ---
        console.log("Attempting to get API key...");
        const data = await chrome.storage.local.get('openaiApiKey');
        apiKey = data.openaiApiKey;
        if (!apiKey || !apiKey.startsWith("sk-")) {
            throw new Error('Invalid API key found'); 
        }
        console.log("API key retrieved: Exists");

        // --- 2. Fetch History ---
        console.log("Attempting to get history...");
        const endTime = new Date(); 
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        console.log(`Fetching history starting from: ${startTime.toISOString()}`);
        let historyItems = await chrome.history.search({ 
            text: '', // Empty string matches all history
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
            maxResults: 1000 // Get a decent number to process
        });
        console.log(`History items retrieved: ${historyItems.length}`);

        // --- Filter out non-web pages BEFORE sending to LLM ---
        const webHistoryItems = historyItems.filter(item => 
            item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'))
        );
        console.log(`Filtered web history items: ${webHistoryItems.length}`);

        // --- 3. Generate Memories via Offscreen Document --- 
        if (webHistoryItems.length > 0) {
            console.log("Attempting to call generateMemoryEntries (via Offscreen)...");
            // Call the refactored function (which now sends message to offscreen)
            memoryEntries = await generateMemoryEntries(apiKey, webHistoryItems);
            console.log(`generateMemoryEntries call completed. ${memoryEntries.length} entries generated.`);
        } else {
            // UPDATED: Log with the correct todayKey
            console.log(`No relevant web history found for ${todayKey}.`);
        }

        // --- 4. Save results ---
        console.log("Attempting to save memory entries to storage...");
        const dataToStore: StoredDayData = { entries: memoryEntries, lastUpdated: new Date().toISOString(), error: null };
        // Use the correctly calculated todayKey for saving
        await chrome.storage.local.set({ [todayKey]: dataToStore });
        console.log(`Memory entries (or empty) saved to storage for key: ${todayKey}`);

    } catch (error: any) {
        console.error("Error during performDailySummary:", error);
        // Save error state to storage so UI can display it
        const errorData: StoredDayData = { entries: [], lastUpdated: new Date().toISOString(), error: error.message || 'Unknown error' };
        try {
            // Use the correctly calculated todayKey for saving error state
            await chrome.storage.local.set({ [todayKey]: errorData });
            console.log(`Error state saved to storage for key: ${todayKey}`);
        } catch (saveError) {
            console.error("Failed to save error state to storage:", saveError);
        }
    }
    // UPDATED: Log with the correct todayKey
    console.log(`Exiting performDailySummary for key: ${todayKey}.`);
}

// --- Event Listeners ---

// On Install/Update: Set up the alarm
chrome.runtime.onInstalled.addListener((details) => {
  if (import.meta.env.DEV) {
    console.log('[DEBUG] Extension installed/updated. Attempting alarm creation.', details);
  }
  // --- Restore Alarm Creation --- 
  const periodInMinutes = import.meta.env.DEV ? 5 : 60 * 24; 
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

// On Alarm Trigger: Run the summary function
chrome.alarms.onAlarm.addListener((alarm) => {
  if (import.meta.env.DEV) {
    console.log('[DEBUG] Alarm triggered. Attempting to run summary execution.', alarm);
  }
  // --- Restore Alarm Execution Logic ---
  if (alarm.name === DAILY_SUMMARY_ALARM_NAME) {
    performDailySummary();
  }
  // --- End Restore ---
});

// Listener for manual trigger message
// Mark sender as unused with underscore prefix
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.command === "triggerManualSummary") {
        console.log("[DEBUG] Manual summary trigger received.");
        // Use an IIFE to handle the async function call properly
        (async () => {
            try {
                await performDailySummary();
                sendResponse({ status: "Summary triggered successfully." }); 
            } catch (error) {
                console.error("[DEBUG] Error during manually triggered summary:", error);
                sendResponse({ status: "Error during summary trigger.", error: error });
            }
        })();
        return true; // Keep channel open for async response

    } else if (message.command === "clearMemory") {
        console.log("[DEBUG] Clear memory command received.");
        (async () => {
            try {
                await chrome.storage.local.clear();
                console.log("[DEBUG] chrome.storage.local cleared successfully.");
                sendResponse({ status: "Memory cleared successfully." });
            } catch (error) {
                console.error("[DEBUG] Error clearing local storage:", error);
                sendResponse({ status: "Error clearing memory.", error: error });
            }
        })();
        return true; // Keep channel open for async response
    }
    // Can add more else if blocks for other commands later
});

if (import.meta.env.DEV) {
  console.log('Background script loaded (fully restored).');
} 