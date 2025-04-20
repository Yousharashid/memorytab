import { getApiKey } from './lib/getApiKey';
import { summarizeDayLLM, DailySummary } from './lib/summarizeDayLLM';

const ALARM_NAME = 'dailySummaryAlarm';
// const SUMMARY_STORAGE_KEY = 'dailySummary'; // Use date instead

// --- Helper Functions ---

// Function to get today's date as YYYY-MM-DD string
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getDailyHistory(): Promise<chrome.history.HistoryItem[]> {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  // Fetch history for the last 24 hours
  try {
      return await chrome.history.search({ 
          text: '', // All history
          startTime: oneDayAgo,
          maxResults: 1000 // Reasonable limit 
      });
  } catch (error) {
      console.error("Error fetching history:", error);
      return []; // Return empty array on error
  }
}

async function performDailySummary() {
  const todayKey = getTodayDateString();
  if (import.meta.env.DEV) {
    console.log(`[${new Date().toISOString()}] Running daily summary task for key: ${todayKey}`);
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.warn('Background: No API key found. Skipping daily summary.');
    }
    // Store a specific state indicating no API key for today?
    // Or just leave it empty?
    return; // Exit if no API key
  }

  try {
    const historyItems = await getDailyHistory();
    if (import.meta.env.DEV) {
      console.log(`Background: Found ${historyItems.length} history items for summary.`);
    }

    // Skip if no history, store empty state
    if (historyItems.length === 0) {
        const noHistorySummary: DailySummary = { summaryText: 'No browsing activity recorded for today.', itemCount: 0, topLinks: [] };
        await chrome.storage.local.set({ [todayKey]: noHistorySummary });
        if (import.meta.env.DEV) {
            console.log(`Background: No history found. Stored empty state for ${todayKey}`);
        }
        return;
    }

    const summaryResult: DailySummary = await summarizeDayLLM(historyItems, apiKey);

    // Store the summary (or error) in local storage using date key
    await chrome.storage.local.set({ [todayKey]: summaryResult });

    if (import.meta.env.DEV) {
      if (summaryResult.error) {
        console.error('Background: Summary generation failed:', summaryResult.error);
      } else {
        console.log(`Background: Daily summary completed and stored for ${todayKey}.`, summaryResult);
      }
    }
  } catch (error) {
    console.error('Background: Unhandled error during daily summary:', error);
    // Optionally store an error state
    const errorSummary: DailySummary = {
        summaryText: '', 
        itemCount: 0,
        topLinks: [],
        error: 'An unexpected error occurred in the background task.'
    };
    await chrome.storage.local.set({ [todayKey]: errorSummary });
  }
}

// --- Event Listeners ---

// On Install/Update: Set up the alarm
chrome.runtime.onInstalled.addListener((details) => {
  if (import.meta.env.DEV) {
    console.log('Extension installed or updated:', details);
  }
  // Create alarm 
  // For development, run more frequently (e.g., every 5 mins). Target is daily (1440 mins).
  const periodInMinutes = import.meta.env.DEV ? 5 : 60 * 24; 
  chrome.alarms.create(ALARM_NAME, {
    // delayInMinutes: 1, // Optional: Delay first run
    periodInMinutes: periodInMinutes 
  });
  if (import.meta.env.DEV) {
    console.log(`Daily summary alarm created/updated. Running every ${periodInMinutes} minutes.`);
    // Optional: Run immediately on install for testing
    // performDailySummary(); 
  }
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
  if (alarm.name === ALARM_NAME) {
    performDailySummary();
  }
});

if (import.meta.env.DEV) {
  console.log('Background script loaded.');
} 