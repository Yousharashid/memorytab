import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind styles
import type { MemoryEntry } from '../../lib/summarizeDayLLM'; // Import types

// Type for the object stored in chrome.storage.local
interface StoredDayData {
    entries: MemoryEntry[];
    lastUpdated: string;
    error?: string | null;
}

// Function to get today's date as YYYY-MM-DD string
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper component for rendering a single Memory Entry
function MemoryItem({ entry }: { entry: MemoryEntry }) {
  // Use a placeholder or logic to get a better icon later
  const iconUrl = entry.sourceIcon || `https://www.google.com/s2/favicons?sz=32&domain_url=${entry.urls?.[0] || 'google.com'}`;
  
  return (
    <div className={`flex items-start space-x-3 p-3 rounded-md ${entry.isDimmed ? 'opacity-60' : 'bg-white shadow-sm'}`}>
      <img src={iconUrl} alt="" width="20" height="20" className="flex-shrink-0 mt-1 rounded-full" />
      <div className="flex-grow">
        <p className="text-sm text-gray-800">
          <span className="font-medium text-gray-500 mr-2">{entry.time}</span>
          {entry.summary}
        </p>
        {/* Optional: Display source URLs */} 
        {entry.urls && entry.urls.length > 0 && (
            <div className="mt-1 space-x-2">
                {entry.urls.slice(0, 2).map(url => (
                    <a href={url} target="_blank" rel="noopener noreferrer" key={url} className="text-xs text-blue-500 hover:underline truncate inline-block max-w-[150px]">
                        {new URL(url).hostname}
                    </a>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

// Main New Tab component
function NewTabApp() {
  // State holds the entire object fetched from storage
  const [storedData, setStoredData] = useState<StoredDayData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [appError, setAppError] = useState<string | null>(null); // Separate state for fetch/render errors
  const todayKey = getTodayDateString();

  useEffect(() => {
    async function fetchDayData() {
      setLoading(true);
      setAppError(null);
      try {
        const result = await chrome.storage.local.get(todayKey);
        if (result && result[todayKey]) {
          // Validate fetched data structure if necessary
          setStoredData(result[todayKey] as StoredDayData);
        } else {
          setStoredData(null); // No data found for today
        }
      } catch (err) {
        console.error("Error fetching day data from storage:", err);
        setAppError("Failed to load memory data.");
        setStoredData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDayData();

    // Listener for storage changes
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[todayKey]) {
        if (import.meta.env.DEV) {
            console.log('Storage changed for today, reloading memory data:', changes[todayKey].newValue);
        }
        setStoredData(changes[todayKey].newValue as StoredDayData);
      }
    };
    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };

  }, [todayKey]);

  // --- Render Logic ---
  let content;
  if (loading) {
    content = <p className="text-center text-gray-500 py-10">Loading your memory timeline...</p>;
  } else if (appError) {
    content = <p className="text-center text-red-500 py-10">Error: {appError}</p>;
  } else if (!storedData || !storedData.entries || storedData.entries.length === 0) {
    // Check for processing error stored in the object
    const message = storedData?.error 
        ? `Could not generate memories for ${todayKey}: ${storedData.error}`
        : `No memories generated yet for ${todayKey}. Check back later or browse some more!`;
    content = <p className="text-center text-gray-500 py-10">{message}</p>;
  } else {
    // We have memory entries to display
    content = (
      <div className="space-y-3">
        {storedData.entries.map((entry) => (
          <MemoryItem key={entry.id} entry={entry} />
        ))}
        {/* Display processing error if entries were generated but there was still an error */} 
        {storedData.error && (
            <p className="text-center text-sm text-red-600 mt-4">Note: There was an error during processing: {storedData.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center">MemoryTab Timeline</h1>
        <p className="text-center text-gray-600">Your Browsing Activity for {todayKey}</p>
      </header>
      <main className="max-w-2xl mx-auto bg-gray-50 p-4 md:p-6 rounded-lg shadow-xl">
          {content}
      </main>
      {/* Optional: Footer with last updated time */} 
      {storedData?.lastUpdated && (
        <footer className="text-center text-xs text-gray-400 mt-4">
            Last updated: {new Date(storedData.lastUpdated).toLocaleString()}
        </footer>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NewTabApp />
  </React.StrictMode>
); 