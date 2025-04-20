import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind styles
import { getApiKey, setApiKey } from '../../lib/getApiKey'; // Import storage functions

function OptionsApp() {
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValidFormat, setIsValidFormat] = useState<boolean>(false);

  // Fetch existing key on load
  useEffect(() => {
    setIsLoading(true);
    getApiKey().then(key => {
      if (key) {
        setApiKeyInput(key);
        setIsValidFormat(key.startsWith('sk-')); // Validate existing key
      }
      setIsLoading(false);
    });
  }, []);

  // Update validation state on input change
  useEffect(() => {
    setIsValidFormat(apiKeyInput.startsWith('sk-'));
  }, [apiKeyInput]);

  const handleSave = async () => {
    setStatusMessage('');
    if (!isValidFormat) {
      setStatusMessage('Error: API key should start with \'sk-\'.');
      return;
    }
    if (!apiKeyInput) {
        setStatusMessage('Error: API key cannot be empty.');
        return;
    }

    try {
      await setApiKey(apiKeyInput);
      setStatusMessage('API Key saved successfully!');
      // Clear message after a few seconds
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error("Error saving API key:", error);
      setStatusMessage('Error: Failed to save API Key.');
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md mt-10 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">MemoryTab Options</h1>
      
      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
          OpenAI API Key
        </label>
        <input
          type="password" // Use password type to mask the key
          id="apiKey"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="sk-..."
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!isValidFormat && apiKeyInput ? 'border-red-500' : 'border-gray-300'}`}
        />
        {!isValidFormat && apiKeyInput && (
          <p className="mt-1 text-xs text-red-600">API Key should start with 'sk-'.</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Your key is stored securely in synced browser storage.</p>
      </div>

      <button
        onClick={handleSave}
        disabled={!isValidFormat || !apiKeyInput}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save API Key
      </button>

      {statusMessage && (
        <p className={`text-sm text-center ${statusMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {statusMessage}
        </p>
      )}

      {/* Optional: Add a Test Key button here later */}
      {/* <button className="w-full mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md shadow hover:bg-gray-300">Test Key</button> */}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
); 