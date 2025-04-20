import { getApiKey } from './lib/getApiKey'; 
import { summarizeDayLLM, DailySummary } from './lib/summarizeDayLLM'; 

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
  console.log("[DEBUG] Entering performDailySummary..."); // Log entry
  const todayKey = getTodayDateString();
  if (import.meta.env.DEV) {
    console.log(`[${new Date().toISOString()}] Running daily summary task for key: ${todayKey}`);
  }

  try { // Add top-level try for safety
    console.log("[DEBUG] Attempting to get API key...");
    const apiKey = await getApiKey();
    console.log(`[DEBUG] API key retrieved: ${apiKey ? 'Exists' : 'null'}`);
    if (!apiKey) {
      if (import.meta.env.DEV) {
        console.warn('Background: No API key found. Skipping daily summary.');
      }
      return; // Exit if no API key
    }

    console.log("[DEBUG] Attempting to get history...");
    const historyItems = await getDailyHistory();
    console.log(`[DEBUG] History items retrieved: ${historyItems.length}`);
    
    if (historyItems.length === 0) {
        const noHistorySummary: DailySummary = { summaryText: 'No browsing activity recorded for today.', itemCount: 0, topLinks: [] };
        await chrome.storage.local.set({ [todayKey]: noHistorySummary });
        if (import.meta.env.DEV) {
            console.log(`Background: No history found. Stored empty state for ${todayKey}`);
        }
        return;
    }

    console.log("[DEBUG] Attempting to call summarizeDayLLM...");
    // --- Restore summarizeDayLLM Call ---
    const summaryResult: DailySummary = await summarizeDayLLM(historyItems, apiKey);
    console.log("[DEBUG] summarizeDayLLM call completed.");
    
    console.log("[DEBUG] Attempting to save summary to storage...");
    await chrome.storage.local.set({ [todayKey]: summaryResult });
    console.log("[DEBUG] Summary saved to storage.");
    // --- End Restore ---

    if (import.meta.env.DEV) {
      if (summaryResult.error) {
        console.error('Background: Summary generation failed:', summaryResult.error);
      } else {
        console.log(`Background: Daily summary completed and stored for ${todayKey}.`, summaryResult);
      }
    }
  } catch (error) {
    console.error('[DEBUG] CRITICAL ERROR inside performDailySummary try block:', error);
    // Optionally store an error state
    const errorSummary: DailySummary = {
        summaryText: '', 
        itemCount: 0,
        topLinks: [],
        error: 'An unexpected CRITICAL error occurred in the background task.'
    };
    try {
        await chrome.storage.local.set({ [todayKey]: errorSummary });
    } catch (storageError) {
        console.error("[DEBUG] Failed even to save error state to storage:", storageError);
    }
  }
  console.log("[DEBUG] Exiting performDailySummary."); // Log exit
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
                // Send success response (optional)
                sendResponse({ status: "Summary triggered successfully." }); 
            } catch (error) {
                console.error("[DEBUG] Error during manually triggered summary:", error);
                // Send error response (optional)
                sendResponse({ status: "Error during summary trigger.", error: error });
            }
        })();
        // Return true to indicate you wish to send a response asynchronously
        return true; 
    }
    // Handle other potential messages if needed
});

if (import.meta.env.DEV) {
  console.log('Background script loaded (fully restored).');
} 