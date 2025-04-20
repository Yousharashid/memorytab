// src/lib/summarizeDayLLM.ts

// Define the structure for a memory entry
export interface MemoryEntry {
  id: string;       // Unique identifier (e.g., UUID)
  time: string;     // Short time label (e.g., "9:45am")
  timestamp: number; // Numerical timestamp for sorting (e.g., Date.now())
  summary: string;  // One-sentence summary of the activity
  sourceIcon?: string; // Optional: favicon URL or emoji
  isDimmed?: boolean; // Optional: UI hint
  urls: string[];   // Associated URL(s), should ideally be just one
}

// Type for the object stored in chrome.storage.local for a given day
export interface StoredDayData {
    entries: MemoryEntry[];
    lastUpdated: string;
    error?: string | null;
}

// Helper to generate the prompt asking for structured JSON output for single-URL memories
function generatePromptForSingleURLMemoryEntries(items: chrome.history.HistoryItem[]): string {
  // Select relevant items and format for the prompt, including timestamp
  const links = items
    .filter(item => item.url && item.title && item.lastVisitTime) // Ensure timestamp exists
    .slice(0, 50) 
    // Include lastVisitTime in the formatted string
    .map((item, i) => `(${i + 1}) Time:${item.lastVisitTime} Title:${item.title} URL:${item.url}`)
    .join("\n");

  // Check if there are any links to include
  if (!links) {
      return "No relevant browsing history found to generate memories."; // Or handle appropriately
  }

  // Construct the prompt using the new template
  return `\nYou are a memory assistant. Given the list of websites a user visited today (with timestamps), generate a list of concise memory entries. Each memory entry should summarize the *main intent or activity* behind a single page visit.\n\nGenerate up to 16 memory entries. Each must include:\n- A unique id (timestamp + short suffix)\n- A short time label (e.g. "3:45pm") derived from the visit time\n- A numerical timestamp (the original milliseconds since epoch from the input Time: field)\n- A one-sentence summary\n- A single sourceIcon (relevant emoji is best)\n- Exactly one URL in the 'urls' array (the most relevant one for that summary)\n\nRespond ONLY with a valid JSON array like this, starting immediately with \`\`\`json and ending immediately with \`\`\`:\n\n\`\`\`json\n[\n  {\n    "id": "1682739845000_abc123",\n    "time": "3:45pm",\n    "timestamp": 1682739845000,\n    "summary": "Explored Supabase auth docs.",\n    "sourceIcon": "📘",\n    "urls": ["https://supabase.com/docs/guides/auth"]\n  }\n]\n\`\`\`\n\nEnsure the entire response is valid JSON. Do not include any text before or after the JSON block.\n\nHere's the browsing history:\n\n${links}\n  `.trim();
}

// Main function to generate memory entries using the Offscreen Document
export async function generateMemoryEntries(
  apiKey: string,
  historyItems: chrome.history.HistoryItem[]
): Promise<MemoryEntry[]> {

  // 1. Check for API Key
  if (!apiKey || !apiKey.startsWith("sk-")) {
    console.warn('generateMemoryEntries: Invalid or missing API key.');
    // Return empty array, error handled/logged in background
    throw new Error('Invalid API key'); 
  }

  // 2. Check for history items
  if (historyItems.length === 0) {
    console.log('generateMemoryEntries: No history items provided.');
    return []; // Return empty array if no history
  }

  // 3. Generate Prompt using the NEW function
  const prompt = generatePromptForSingleURLMemoryEntries(historyItems);
  
  // Handle case where prompt generation might indicate no data
  if (prompt === "No relevant browsing history found to generate memories.") {
      console.log('generateMemoryEntries: No relevant history items for prompt generation.');
      return [];
  }

  // 4. Send message to Offscreen document and get content
  let content: string;
  try {
    if (import.meta.env.DEV) {
        console.log(`Memory Generator: Sending prompt to offscreen document...`);
    }
    
    const response = await chrome.runtime.sendMessage({ 
        type: 'callOpenAI', 
        apiKey: apiKey, 
        prompt: prompt 
    });

    if (import.meta.env.DEV) {
        console.log("Memory Generator: Received response from offscreen:", response);
    }

    if (!response) {
        // This might happen if the offscreen document was closed unexpectedly
        throw new Error("No response received from offscreen document.");
    }
    if (!response.success) {
        // Bubble up the error from the offscreen document
        throw new Error(`Offscreen document error: ${response.error || 'Unknown error'}${response.details ? JSON.stringify(response.details) : ''}`);
    }
    if (!response.content) {
        throw new Error("Offscreen document did not return content.");
    }
    content = response.content;

  } catch (error: any) {
    console.error('Memory Generator: Error sending message to or receiving response from offscreen:', error);
    // Re-throw error to be handled by the background script
    throw error; 
  }

  // 5. Parse and Validate the received content
  try {
    const cleanedText = content.replace(/^```json\n?|\n?```$/g, '').trim();

    let memoryEntries: MemoryEntry[] = [];
    if (!cleanedText) {
      throw new Error("Received empty response content after cleaning.");
    }

    try {
      memoryEntries = JSON.parse(cleanedText);
    } catch (error: any) {
      // Log the problematic text before throwing
      console.error("Memory Generator: Failed to parse JSON. Problematic text:", cleanedText);
      console.error("Memory Generator: Original parsing error:", error);
      throw new Error(`Invalid JSON response content: ${error.message}`);
    }

    // Validate structure: Ensure it's an array
    if (!Array.isArray(memoryEntries)) {
        console.error("Memory Generator: Parsed response is not an array:", memoryEntries);
        throw new Error("Invalid response structure: Expected an array.");
    }

    // Validate and sanitize individual entries
    const validatedEntries = memoryEntries.filter(entry => {
        if (!entry || typeof entry !== 'object') return false;
        if (!Array.isArray(entry.urls) || entry.urls.length === 0 || typeof entry.urls[0] !== 'string') return false;
        entry.urls = [entry.urls[0]];
        try {
            const url = new URL(entry.urls[0]);
            if (!['http:', 'https:'].includes(url.protocol)) return false;
        } catch (e) { return false; } 
        
        // Ensure core fields exist and have correct type
        if (typeof entry.summary !== 'string' 
            || typeof entry.time !== 'string' 
            || typeof entry.timestamp !== 'number' // Changed: Check for number type
            || typeof entry.id !== 'string' // Added: Check for string ID
           ) { 
            console.warn('Memory Generator: Filtering entry due to missing/invalid core fields (summary, time, timestamp, id):', entry);
            return false;
        }

        // Defaults for optional fields
        entry.sourceIcon = entry.sourceIcon || undefined;
        entry.isDimmed = entry.isDimmed || false;     
       
        return true; 
    });

    console.log(`Memory Generator: Successfully parsed and validated ${validatedEntries.length} memory entries.`);
    return validatedEntries;
    
  } catch (parseError: any) {
      console.error('Memory Generator: Error parsing or validating content from offscreen:', parseError);
      throw parseError;
  }
} 