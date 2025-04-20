import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind styles

function OptionsApp() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">MemoryTab Options</h1>
      {/* Options UI will go here */}
      <p className="mt-4 text-green-600">Options page styled with Tailwind!</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>
); 