import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind styles

// Import Types
import type { StoredDayData } from '../../lib/summarizeDayLLM'; // Removed MemoryEntry import

// Import Components
import { MemoryTimeline } from './components/MemoryTimeline';
import { MemoryDock } from './components/MemoryDock';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { NoMemoryState } from './components/NoMemoryState';

// Import Utils
import { getTopDomains } from './utils'; // Re-added getTopDomains

// Function to get today's date as YYYY-MM-DD string
function getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Main New Tab component
function NewTabApp() {
  const [storedData, setStoredData] = useState<StoredDayData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [appError, setAppError] = useState<string | null>(null);
  // Use only todayKey
  const todayKey = getTodayDateString();

  useEffect(() => {
    // Simplified fetch function
    async function fetchDayData() {
        setLoading(true);
        setAppError(null);
        console.log(`NewTab: Fetching data for key: ${todayKey}`);
        try {
          const result = await chrome.storage.local.get(todayKey);
          if (result && result[todayKey]) {
            console.log("NewTab: Data received from storage:", result[todayKey]);
             // REMOVED: Timestamp fallback logic is no longer needed here. 
             // Data from storage should already have valid timestamps.
             // Ensure the fetched data structure matches StoredDayData
             const fetchedData: StoredDayData = result[todayKey];
             // Basic check to ensure entries exist and is an array before setting
             if (fetchedData && Array.isArray(fetchedData.entries)) {
                setStoredData(fetchedData);
             } else {
                console.warn("NewTab: Fetched data is missing 'entries' array or is invalid. Setting to null.", fetchedData);
                setStoredData(null); // Handle potentially invalid data from storage
             }
          } else {
            console.log("NewTab: No data found in storage for today.");
            setStoredData(null); // No data found for today
          }
        } catch (err) {
          console.error("NewTab: Error fetching day data:", err);
          setAppError("Failed to load memory data.");
          setStoredData(null);
        } finally {
          setLoading(false);
        }
      }
  
      fetchDayData();
  
      // Simplified listener
      const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
           if (areaName === 'local' && changes[todayKey]) {
               console.log(`NewTab: Storage changed for today, re-fetching.`);
               fetchDayData(); 
           }
      };
      chrome.storage.onChanged.addListener(storageListener);
  
      return () => {
        chrome.storage.onChanged.removeListener(storageListener);
      };

  }, [todayKey]); // Simplified dependencies

  // --- Prepare data for components --- 
  const memoryEntries = storedData?.entries || []; 
  const processingError = storedData?.error; 
  const hasMemories = memoryEntries.length > 0;

  // --- Create Dock Items using getTopDomains --- 
  const dockItems = hasMemories ? getTopDomains(memoryEntries, 16) : [];

  // REMOVED TEMPORARY DUPLICATION LOGIC
  const displayEntries = memoryEntries; // Use original entries for display
  
  // Get current time for display
  const currentTime = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // --- Render Logic for main content ---
  let mainContent;
  if (loading) {
    mainContent = <LoadingSkeleton />;
  } else if (appError) {
    mainContent = <NoMemoryState message={appError} />;
  } else if (displayEntries.length === 0) { // Use length of displayEntries for check
    mainContent = <NoMemoryState date={todayKey} processingError={processingError} />;
  } else {
    // Pass duplicated entries to the timeline
    mainContent = <MemoryTimeline entries={displayEntries} error={processingError} />;
  }

  return (
    <div 
      className="min-h-screen h-screen flex flex-col pt-12 px-12 text-gray-800"
      style={{
        background: 'linear-gradient(180deg, #C7C7D7 0%, #F1D7DF 42.75%, #DEC3DE 65.4%, #C7C7D7 100%)'
      }}
    >
      {/* --- Top Header: Updated font weight --- */}
      <header className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-light text-[rgba(0,0,0,0.45)]">Good morning, Yousha.</h1>
          <p className="text-3xl font-light text-[rgba(0,0,0,0.25)]">Here's what's on your mind.</p>
        </div>
        <div className="text-right">
            <p className="text-3xl font-light text-[rgba(0,0,0,0.45)]">{currentTime}</p>
            <p className="text-3xl font-light text-[rgba(0,0,0,0.25)]">{currentDate}</p>
        </div>
      </header>

      {/* --- Memory Dock: Uses dockItems --- */}
      <div className="mb-4 flex-shrink-0">
        {!loading && hasMemories && <MemoryDock items={dockItems} />} 
      </div>

      {/* --- RE-ADDED Spacer Div --- */}
      {/* This div will grow and push the main content down */}
      <div className="flex-grow"></div> 

      {/* --- Main Content Area (Timeline): Updated fixed height --- */}
      <main 
        className="flex flex-col h-[70vh] 
                   bg-[rgba(46,46,46,0.10)] 
                   backdrop-blur-[62px] 
                   rounded-t-[32px] 
                   shadow-[0px_8px_26px_-2px_rgba(255,255,255,0.60)_inset] 
                   overflow-hidden"
      >
          {mainContent}
          {/* Optional: Add last updated time subtly here if needed */} 
      </main>

      {/* Footer removed - integrated into main or header */}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NewTabApp />
  </React.StrictMode>
); 