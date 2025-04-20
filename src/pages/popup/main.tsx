import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind styles

// Define the Popup component directly
function Popup() {
  // You can add state or effects here if needed later
  // const [data, setData] = React.useState(null);

  return (
    <div className="p-4 bg-gray-100 text-gray-900 rounded-lg shadow-md space-y-3 w-64">
      <h1 className="text-lg font-bold text-center">🚀 MemoryTab Popup</h1>
      <p className="text-sm text-center">
        This is the streamlined popup UI.
      </p>
      {/* Add more UI elements here */}
      <button className="w-full bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded text-white text-sm">
        Placeholder Action
      </button>
    </div>
  );
}

// Render the Popup component
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
