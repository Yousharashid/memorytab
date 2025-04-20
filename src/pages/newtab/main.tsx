import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind styles

function NewTabApp() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <h1 className="text-4xl font-bold text-white shadow-lg p-6 rounded-lg">
        MemoryTab New Tab Page
      </h1>
       {/* New Tab UI will go here */}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NewTabApp />
  </React.StrictMode>
); 