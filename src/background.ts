import { getApiKey } from './lib/getApiKey';
import { summarizeDayLLM, DailySummary } from './lib/summarizeDayLLM';

const ALARM_NAME = 'dailySummaryAlarm';
const SUMMARY_STORAGE_KEY = 'dailySummary';

// --- Helper Functions ---

async function getDailyHistory(): Promise<chrome.history.HistoryItem[]> {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  return chrome.history.search({ 
    text: '', // All history
    startTime: oneDayAgo,
    maxResults: 1000 // Reasonable limit 
  });
}

async function performDailySummary() {
  if (import.meta.env.DEV) {
    console.log(`[${new Date().toISOString()}] Running daily summary task...`);
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.warn('Background: No API key found. Skipping daily summary.');
    }
    // Clear previous summary if key removed?
    // await chrome.storage.local.remove(SUMMARY_STORAGE_KEY);
    return; // Exit if no API key
  }

  try {
    const historyItems = await getDailyHistory();
    if (import.meta.env.DEV) {
      console.log(`Background: Found ${historyItems.length} history items for summary.`);
    }

    const summaryResult: DailySummary = await summarizeDayLLM(historyItems, apiKey);

    // Store the summary (or error) in local storage
    await chrome.storage.local.set({ [SUMMARY_STORAGE_KEY]: summaryResult });

    if (import.meta.env.DEV) {
      if (summaryResult.error) {
        console.error('Background: Summary generation failed:', summaryResult.error);
      } else {
        console.log('Background: Daily summary completed and stored.', summaryResult);
      }
    }
  } catch (error) {
    console.error('Background: Unhandled error during daily summary:', error);
    // Optionally store an error state
    await chrome.storage.local.set({
      [SUMMARY_STORAGE_KEY]: {
        summaryText: '', 
        itemCount: 0,
        error: 'An unexpected error occurred in the background task.'
      } as DailySummary
    });
  }
}

// --- Event Listeners ---

// On Install/Update: Set up the daily alarm
chrome.runtime.onInstalled.addListener((details) => {
  if (import.meta.env.DEV) {
    console.log('Extension installed or updated:', details);
  }
  // Create alarm to run roughly every 24 hours
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 60 * 24 // Run daily
  });
  if (import.meta.env.DEV) {
    console.log('Daily summary alarm created.');
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