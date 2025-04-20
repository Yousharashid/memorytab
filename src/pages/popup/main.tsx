import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind styles

// Define the Popup component directly
function Popup() {
  // State for button feedback
  const [triggerStatus, setTriggerStatus] = useState<string>('');
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  // State for clear memory button feedback
  const [clearStatus, setClearStatus] = useState<string>('');
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const handleManualTrigger = () => {
    setIsTriggering(true);
    setTriggerStatus('Triggering summary...');
    console.log('Popup: Sending triggerManualSummary message...');

    chrome.runtime.sendMessage({ command: "triggerManualSummary" }, (response) => {
      if (chrome.runtime.lastError) {
        // Handle errors like the background script not being available
        console.error('Popup: Error sending message:', chrome.runtime.lastError.message);
        setTriggerStatus(`Error: ${chrome.runtime.lastError.message || 'Could not connect to background script.'}`);
      } else if (response && response.status) {
        console.log('Popup: Received response:', response);
        setTriggerStatus(response.status); // Display status from background
      } else {
          console.log('Popup: Received unexpected or no response.');
        setTriggerStatus('Background script did not respond.'); 
      }
      setIsTriggering(false);
      // Optional: Clear status after a delay
      setTimeout(() => setTriggerStatus(''), 4000);
    });
  };

  // Handler for clearing memory
  const handleClearMemory = () => {
    setIsClearing(true);
    setClearStatus('Clearing memory...');
    console.log('Popup: Sending clearMemory message...');

    chrome.runtime.sendMessage({ command: "clearMemory" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Popup: Error sending clearMemory message:', chrome.runtime.lastError.message);
        setClearStatus(`Error: ${chrome.runtime.lastError.message || 'Could not connect to background.'}`);
      } else if (response && response.status) {
        console.log('Popup: Received clearMemory response:', response);
        setClearStatus(response.status); 
      } else {
        console.log('Popup: Received unexpected or no response for clearMemory.');
        setClearStatus('Background script did not respond.'); 
      }
      setIsClearing(false);
      setTimeout(() => setClearStatus(''), 4000); // Clear status after delay
    });
  };

  return (
    <div className="p-4 bg-gray-100 text-gray-900 rounded-lg shadow-md space-y-3 w-64">
      <h1 className="text-lg font-bold text-center">🚀 MemoryTab Popup</h1>
      <p className="text-sm text-center">
        Control your daily summary.
      </p>
      
      {/* Manual Trigger Button */}
      <button 
        onClick={handleManualTrigger}
        disabled={isTriggering} // Disable while triggering
        className="w-full bg-green-500 hover:bg-green-600 px-4 py-2 rounded text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isTriggering ? 'Processing...' : 'Trigger Summary Manually'}
      </button>
      
      {/* Status Message Area */}
      {triggerStatus && (
          <p className={`text-xs text-center ${triggerStatus.startsWith('Error') ? 'text-red-600' : 'text-gray-600'}`}>
              {triggerStatus}
          </p>
      )}

      {/* Clear Memory Button */}
      <button 
        onClick={handleClearMemory}
        disabled={isClearing}
        className="w-full bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isClearing ? 'Clearing...' : 'Clear Stored Memory'}
      </button>

      {/* Clear Status Message Area */}
      {clearStatus && (
          <p className={`text-xs text-center ${clearStatus.startsWith('Error') ? 'text-red-600' : 'text-gray-600'}`}>
              {clearStatus}
          </p>
      )}

      {/* Original Placeholder Button (can remove or repurpose) */}
      {/* <button className="w-full bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded text-white text-sm"> */}
      {/*   Placeholder Action */}
      {/* </button> */}
    </div>
  );
}

// Render the Popup component
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
