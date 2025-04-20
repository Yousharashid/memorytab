import { defineManifest } from '@crxjs/vite-plugin'
// Use default import for JSON
import packageJson from "./package.json"

// Define base CSP directives
const baseCsp = {
    'script-src': "'self'",
    'style-src': "'self'", // Allow own stylesheets
    'object-src': "'self'",
    'connect-src': "'self' https://api.openai.com/ https://www.google.com/s2/favicons", // Allow self, OpenAI, Google Favicons
};

// Add development-specific directives
if (process.env.NODE_ENV !== 'production') {
    // Allow connections to Vite dev server & WebSockets
    baseCsp['connect-src'] += ' http://localhost:5173 ws://localhost:5173';
    // Allow inline styles (often needed for HMR or dev tools)
    baseCsp['style-src'] += " 'unsafe-inline'"; 
    // You might potentially need 'unsafe-eval' for script-src in some dev scenarios,
    // but try to avoid it if possible.
    // baseCsp['script-src'] += " 'unsafe-eval'"; 
}

// Construct the final CSP string
const cspString = Object.entries(baseCsp)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');

const csp = {
  'extension_pages': cspString
}

const manifest = defineManifest({
  manifest_version: 3,
  name: packageJson.name,
  version: packageJson.version,
  // Required permissions - consolidated
  permissions: [
    "tabs", 
    "history", 
    "storage", 
    "alarms", 
    "scripting", 
    "activeTab", // Likely needed for popup interaction or future features
    "offscreen" // Needed for OpenAI API calls
  ],
  // Define host permissions required
  host_permissions: [
    "https://api.openai.com/" // Added for OpenAI API calls
  ],
  // --- Restore Background Script Entry ---
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  // --- End Restore ---
  // Browser action popup
  action: {
    default_popup: "src/pages/popup/index.html",
    default_icon: "public/logo.png",
  },
  // Options page
  options_page: "src/pages/options/index.html",
  // New Tab page override
  chrome_url_overrides: {
    newtab: "src/pages/newtab/index.html",
  },
  // Content Security Policy
  content_security_policy: csp,
  // Remove web accessible resources for content script if not needed
  web_accessible_resources: [
    {
      resources: [
        // 'src/pages/offscreen/index.html', // Removed - HTML itself doesn't need to be web accessible
        'globe-icon.svg' 
      ],
      matches: ["<all_urls>"],
    },
  ],
})

export default manifest;
