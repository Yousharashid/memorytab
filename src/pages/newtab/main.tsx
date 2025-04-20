import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind styles
import type { DailySummary, NormalizedItem } from '../../lib/summarizeDayLLM'; // Import types

// Function to get today's date as YYYY-MM-DD string
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper component for rendering a single link item
function LinkItem({ item }: { item: NormalizedItem }) {
  const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(item.url)}`;
  return (
    <a 
      href={item.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center p-2 bg-white rounded-md shadow hover:shadow-lg transition-shadow duration-150 ease-in-out space-x-2"
    >
      <img src={faviconUrl} alt="" width="16" height="16" className="flex-shrink-0" />
      <span className="text-sm text-gray-700 truncate" title={item.title}>{item.title}</span>
    </a>
  );
}

// Main New Tab component
function NewTabApp() {
  const [summaryData, setSummaryData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const todayKey = getTodayDateString();

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const result = await chrome.storage.local.get(todayKey);
        if (result && result[todayKey]) {
          setSummaryData(result[todayKey] as DailySummary);
        } else {
          // No data found for today yet
          setSummaryData(null); 
        }
      } catch (err) {
        console.error("Error fetching summary from storage:", err);
        setError("Failed to load summary data.");
        setSummaryData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();

    // Optional: Set up a listener for storage changes to update UI automatically
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[todayKey]) {
        if (import.meta.env.DEV) {
            console.log('Storage changed for today, reloading summary:', changes[todayKey].newValue);
        }
        setSummaryData(changes[todayKey].newValue as DailySummary);
      }
    };
    chrome.storage.onChanged.addListener(storageListener);

    // Cleanup listener on component unmount
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };

  }, [todayKey]); // Re-run if the date changes (e.g., after midnight)

  // --- Render Logic ---
  let content;
  if (loading) {
    content = <p className="text-center text-gray-500">Loading your memory summary...</p>;
  } else if (error) {
    content = <p className="text-center text-red-500">Error: {error}</p>;
  } else if (!summaryData || !summaryData.summaryText) {
    content = <p className="text-center text-gray-500">No summary available yet for {todayKey}. Check back later or browse some more!</p>;
  } else {
    content = (
      <div className="space-y-4">
        {/* Summary Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Today's Summary:</h2>
          <p className="text-gray-700 bg-gray-50 p-3 rounded-md shadow-sm whitespace-pre-wrap">{summaryData.summaryText}</p>
          {summaryData.error && (
              <p className="text-sm text-red-600 mt-2">Note: There was an error generating this summary ({summaryData.error}).</p>
          )}
        </div>

        {/* Links Section */}
        {summaryData.topLinks && summaryData.topLinks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Top Links Visited:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {summaryData.topLinks.map((link) => (
                <LinkItem key={link.url} item={link} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center">MemoryTab</h1>
        <p className="text-center text-gray-600">Your Daily Browsing Summary for {todayKey}</p>
      </header>
      <main className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-xl">
          {content}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NewTabApp />
  </React.StrictMode>
); 