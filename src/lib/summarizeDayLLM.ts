// src/lib/summarizeDayLLM.ts

// IMPORT NEW TYPE
import type { MemoryEntry } from '../types';

// Type for the object stored in chrome.storage.local for a given day
export interface StoredDayData {
    entries: MemoryEntry[]; // Use the new type
    lastUpdated: string;
    error?: string | null;
}

// Helper to sanitize text input for prompts
function sanitizeText(input: string): string {
  // Handle potential null/undefined input gracefully
  if (!input) {
    return '';
  }
  return input
    .replace(/[`{}[\]<>]/g, '') // Remove special formatting characters
    .replace(/[\"']/g, '')       // Strip quotes
    .replace(/[\\x00-\\x1F\\x7F]/g, '') // Control characters (ensure backslash is escaped)
    .slice(0, 200);             // Truncate to avoid overlong titles
}

// NEW Few-Shot Prompt Generation Function (Reinforced)
export function generatePromptForSingleURLMemoryEntries(items: chrome.history.HistoryItem[]): string {
  const examples = `
You are a memory summarizer. Based on a list of visited links, return ONLY a JSON object containing a concise 'summary' of the user's main activity and an array of relevant 'tags'.

IMPORTANT: 
- ONLY return the JSON object.
- DO NOT include fields like 'id', 'time', 'timestamp', 'sourceIcon', or 'urls' in the JSON.
- The entire response must be ONLY the JSON object, wrapped in \`\`\`json ... \`\`\`.

### Example 1
Links:
- Visited GitHub project page (https://github.com/user/project)
- Searched Stack Overflow for errors (https://stackoverflow.com/questions/67890)

Memory:
\`\`\`json
{
  "summary": "Worked on a coding project and debugged issues using StackOverflow.",
  "tags": ["programming", "debugging"]
}
\`\`\`

### Example 2
Links:
- Watched music video (https://youtube.com/watch?v=xyz)
- Played song on Spotify (https://open.spotify.com/track/abc)

Memory:
\`\`\`json
{
  "summary": "Listened to music and watched a YouTube video for entertainment.",
  "tags": ["entertainment", "relaxation"]
}
\`\`\`

### Your Turn
Links:
`.trim();

  // Filter for items with title and URL, then sanitize and format
  const links = items
    .filter(item => item.title && item.url) // Ensure title and url exist
    .slice(0, 50) // Limit the number of items processed
    .map((item) => {
      const safeTitle = sanitizeText(item.title!); 
      const safeUrl = sanitizeText(item.url!); 
      return `- ${safeTitle} (${safeUrl})`;
    });

  if (links.length === 0) {
    return "No processable browsing history found."; 
  }

  return `${examples}\n${links.join('\n')}\n\nMemory:\n\`\`\`json`;
}

// Main function to generate memory entries using the Offscreen Document
// Update the return type to use the imported MemoryEntry
export async function generateMemoryEntries(
  apiKey: string,
  historyItems: chrome.history.HistoryItem[]
): Promise<MemoryEntry[]> { // Updated return type

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
  if (prompt === "No processable browsing history found.") {
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
        throw new Error("No response received from offscreen document.");
    }
    if (!response.success) {
        throw new Error(`Offscreen document error: ${response.error || 'Unknown error'}${response.details ? JSON.stringify(response.details) : ''}`);
    }
    if (!response.content) {
        throw new Error("Offscreen document did not return content.");
    }
    content = response.content;

  } catch (error: any) {
    console.error('Memory Generator: Error sending message to or receiving response from offscreen:', error);
    throw error; 
  }

  // 5. Parse and Validate the received content using the new strategy
  try {
    // Clean the raw content received from the LLM
    const cleanedText = content.replace(/^```json\n?|\n?```$/g, '').trim();
    if (!cleanedText) {
        throw new Error("Received empty response content after cleaning.");
    }

    // Parse the JSON
    const parsed = JSON.parse(cleanedText);

    // Ensure it's an array (as requested in the prompt examples)
    if (!Array.isArray(parsed)) {
        // If the prompt explicitly asks for an array, treat non-array as error
        console.error("Memory Generator: Expected an array from LLM, received:", parsed);
        throw new Error("Invalid response structure: Expected a JSON array.");
        // If a single object response is sometimes acceptable, you might wrap it:
        // parsed = [parsed]; 
    }

    // Validate each entry using map, throwing on the first invalid entry
    const validatedEntries: MemoryEntry[] = parsed.map((entry: any, index: number) => {
      // Validate the structure and types of each entry
      if (
        !entry || typeof entry !== 'object' || // Check if entry is a valid object
        typeof entry.summary !== 'string' || entry.summary.trim() === '' || // Summary must be a non-empty string
        !Array.isArray(entry.tags) || // Tags must be an array
        !entry.tags.every((tag: any) => typeof tag === 'string') // Each tag must be a string
      ) {
        console.error(`Memory Generator: Invalid entry format found at index ${index}:`, entry);
        throw new Error(`Invalid entry format at index ${index}. Entry: ${JSON.stringify(entry)}`);
      }

      // Return the validated and trimmed entry
      return {
        summary: entry.summary.trim(),
        // Also trim tags and filter out any empty strings resulting from trimming
        tags: entry.tags.map((t: string) => t.trim()).filter(Boolean) 
      };
    });

    console.log(`Memory Generator: Successfully parsed and validated ${validatedEntries.length} memory entries.`);
    return validatedEntries;
    
  } catch (err: any) { // Catch parsing/validation errors specifically
    console.error("Memory Generator: Failed to parse or validate memory entries:", err);
    // Re-throw the error to be handled by the calling function (performDailySummary)
    // This ensures the error state is saved correctly in storage.
    throw err; 
  }
} 