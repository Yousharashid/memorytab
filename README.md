# MemoryTab Chrome Extension

A Chrome extension that summarizes your daily browsing activity using AI.
Built with React, TypeScript, Vite, CRXJS, and Tailwind CSS.

## Features (MVP)

-   Automatically summarizes browsing history from the current day using the OpenAI API.
-   Displays the daily summary and top visited links on the New Tab page.
-   Provides an Options page to securely save your OpenAI API key.
-   Includes a Popup action to manually trigger the summary generation.

## Development Workflow (Build-Only)

This project uses a **Build-Only** workflow for development due to MV3 service worker limitations with HMR.

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Make Code Changes:**
    Edit files in the `src/` directory.

3.  **Build the Extension:**
    ```bash
    npm run build
    ```
    This command compiles the code and outputs the production-ready extension to the `dist/` directory.

4.  **Load in Chrome:**
    -   Open Chrome and navigate to `chrome://extensions`.
    -   Enable "Developer mode" (top right).
    -   If a previous version of MemoryTab is loaded, click "Remove".
    -   Click "Load unpacked".
    -   Select the `dist` directory inside your project folder (`memorytab/dist`).

5.  **Test:**
    -   Set your OpenAI API key via the extension's Options page.
    -   Browse some websites.
    -   Manually trigger the summary via the Popup action button or using the command below in the Service Worker console.
    -   Open a New Tab to view the summary.

## Manually Triggering Summary (for Testing)

While testing the loaded extension:

1.  Go to `chrome://extensions`.
2.  Find the MemoryTab extension.
3.  Click "Inspect service worker".
4.  In the Console tab that opens, run:
    ```javascript
    chrome.runtime.sendMessage({ command: "triggerManualSummary" });
    ```

## Project Structure

-   `dist/`: Built extension files (ignored by Git).
-   `public/`: Static assets (e.g., extension icons).
-   `src/`: Source code.
    -   `lib/`: Core logic (API calls, storage helpers).
    -   `pages/`: UI components for different extension views (Popup, New Tab, Options).
    -   `background.ts`: Background service worker logic (alarms, history fetching, summary triggering).
-   `manifest.config.ts`: Configuration file for generating `manifest.json` (via CRXJS).
-   `vite.config.ts`: Vite build configuration.
-   `tailwind.config.js`: Tailwind CSS configuration.
-   `postcss.config.js`: PostCSS configuration (for Tailwind).

## Key Technologies

-   [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)
-   [React](https://reactjs.org/)
-   [TypeScript](https://www.typescriptlang.org/)
-   [Vite](https://vitejs.dev/)
-   [Tailwind CSS](https://tailwindcss.com/)
