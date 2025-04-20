import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

// Define a strict CSP
const csp = {
  // Allow scripts, styles, and objects from the extension's own origin
  'extension_pages': "script-src 'self'; style-src 'self'; object-src 'self';"
  // Add 'connect-src https://api.openai.com' when needed
  // Add 'style-src-elem 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;' if using external fonts
}

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  // Required permissions
  permissions: [
    'storage',      // For storing API key and summaries
    'alarms',       // For scheduling daily summary
    'history',      // For accessing browsing history
    // 'identity', // Add later for Google Auth
  ],
  // Define host permissions required (e.g., for OpenAI API)
  host_permissions: [
    // 'https://api.openai.com/*' // Add when OpenAI integration is implemented
  ],
  // Background service worker
  background: {
    service_worker: 'src/background.ts',
    type: 'module', // Use ES module format
  },
  // Browser action popup
  action: {
    default_icon: {
      16: 'public/logo.png',
      48: 'public/logo.png',
      128: 'public/logo.png',
    },
    // Corrected path
    default_popup: 'src/pages/popup/index.html',
  },
  // Options page
  options_page: 'src/pages/options/index.html',
  // New Tab page override
  chrome_url_overrides: {
    newtab: 'src/pages/newtab/index.html',
  },
  // Content script (if needed later, keep placeholder or remove)
  content_scripts: [{
    js: ['src/content/main.ts'], // Assuming TS, CRXJS handles build
    matches: ['<all_urls>'], // Example: If you need content scripts
  }],
  // Content Security Policy
  content_security_policy: csp,
  // Web accessible resources (if needed for content scripts/iframes)
  // web_accessible_resources: [
  //   {
  //     resources: ['assets/*'],
  //     matches: ['<all_urls>'],
  //   },
  // ],
})
