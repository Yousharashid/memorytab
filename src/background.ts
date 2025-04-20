import { getApiKey } from './lib/getApiKey'; 
import { generateMemoryEntries, MemoryEntry } from './lib/summarizeDayLLM'; 

// --- Restore ALARM_NAME --- 
const ALARM_NAME = 'dailySummaryAlarm';

// --- Helper Functions ---

// Restore helper functions
// Function to get today's date as YYYY-MM-DD string
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getDailyHistory(): Promise<chrome.history.HistoryItem[]> {
  // Calculate start of today (00:00:00.000)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  // Fetch history from the start of today until now
  try {
      console.log(`[DEBUG] Fetching history starting from: ${todayStart.toISOString()}`);
      return await chrome.history.search({ 
          text: '', // All history
          startTime: todayStart.getTime(), // Use start of day timestamp
          // endTime: Date.now(), // Optional: Explicitly set end time to now
          maxResults: 1000 // Reasonable limit 
      });
  } catch (error) {
      console.error("Error fetching history:", error);
      return []; // Return empty array on error
  }
}

// Restore main summary logic function
async function performDailySummary() {
  console.log("[DEBUG] Entering performDailySummary...");
  const todayKey = getTodayDateString();
  if (import.meta.env.DEV) {
    console.log(`[${new Date().toISOString()}] Running daily memory generation task for key: ${todayKey}`);
  }

  let memoryEntries: MemoryEntry[] = []; // Initialize
  let processingError: string | null = null;

  try {
    console.log("[DEBUG] Attempting to get API key...");
    const apiKey = await getApiKey();
    console.log(`[DEBUG] API key retrieved: ${apiKey ? 'Exists' : 'null'}`);
    
    if (!apiKey) {
      processingError = 'API key not set.';
      console.warn('Background: No API key found. Skipping memory generation.');
      // Store empty array with error? Or just don't store?
      // Let's store an empty array for consistency in the new tab page
    } else {
        console.log("[DEBUG] Attempting to get history...");
        const historyItems = await getDailyHistory();
        console.log(`[DEBUG] History items retrieved: ${historyItems.length}`);

        if (historyItems.length === 0) {
            console.log(`Background: No history found for ${todayKey}.`);
            // Store empty array
        } else {
            console.log("[DEBUG] Attempting to call generateMemoryEntries...");
            try {
                memoryEntries = await generateMemoryEntries(historyItems, apiKey);
                console.log(`[DEBUG] generateMemoryEntries call completed. ${memoryEntries.length} entries generated.`);
            } catch (genError) {
                console.error("[DEBUG] Error during generateMemoryEntries call:", genError);
                processingError = (genError instanceof Error) ? genError.message : "Failed to generate memories.";
                // Keep memoryEntries as empty array on generation error
            }
        }
    }

    // Always attempt to save the result (even if empty or errored)
    console.log("[DEBUG] Attempting to save memory entries to storage...");
    const storageObject = { 
        entries: memoryEntries, // Store the array
        lastUpdated: new Date().toISOString(), // Add timestamp
        error: processingError // Store potential processing error
    };
    await chrome.storage.local.set({ [todayKey]: storageObject });
    console.log("[DEBUG] Memory entries (or error state) saved to storage for key:", todayKey);

  } catch (error) {
    // Catch errors from getApiKey, getHistory, or storage.set
    console.error('[DEBUG] CRITICAL ERROR inside performDailySummary try block:', error);
    processingError = "A critical background error occurred.";
    // Attempt to save error state
    const errorObject = { entries: [], lastUpdated: new Date().toISOString(), error: processingError };
    try {
        await chrome.storage.local.set({ [todayKey]: errorObject });
    } catch (storageError) {
        console.error("[DEBUG] Failed even to save critical error state to storage:", storageError);
    }
  }
  console.log("[DEBUG] Exiting performDailySummary.");
}

// --- Event Listeners ---

// On Install/Update: Set up the alarm
chrome.runtime.onInstalled.addListener((details) => {
  if (import.meta.env.DEV) {
    console.log('[DEBUG] Extension installed/updated. Attempting alarm creation.', details);
  }
  // --- Restore Alarm Creation --- 
  const periodInMinutes = import.meta.env.DEV ? 5 : 60 * 24; 
  chrome.alarms.create(ALARM_NAME, {
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
  if (alarm.name === ALARM_NAME) {
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