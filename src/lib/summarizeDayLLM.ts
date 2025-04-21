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

// SIMPLIFIED Prompt Generation Function (Zero-Shot, Single Object)
export function generatePromptForSingleURLMemoryEntries(items: chrome.history.HistoryItem[]): string {
  const instructions = `
You are a memory summarizer. Analyze the following list of visited web pages.
Respond ONLY with a single JSON object containing:
1. A concise 'summary' (string) of the user's overall activity or main topics researched during this period.
2. An array of relevant 'tags' (string[]) based on the activity.

IMPORTANT: The entire response MUST be ONLY the single JSON object. Do not include any other text, explanations, or formatting like markdown code blocks.

Example format: {"summary": "Researched X and Y.", "tags": ["topic1", "topic2"]}
`.trim();

  // Filter, sanitize, and format links (limit to reduce input tokens)
  const links = items
    .filter(item => item.title && item.url) 
    .slice(0, 30) // Reduced slice for testing token limits
    .map((item) => {
      const safeTitle = sanitizeText(item.title!); 
      const safeUrl = sanitizeText(item.url!); 
      return `- ${safeTitle} (${safeUrl})`;
    });

  if (links.length === 0) {
    return "No processable browsing history found."; 
  }

  // Construct the final prompt
  return `${instructions}\n\nVisited Links:\n${links.join('\n')}`;
}

// Main function to generate memory entries using the Offscreen Document
export async function generateMemoryEntries(
  apiKey: string,
  historyItems: chrome.history.HistoryItem[]
): Promise<MemoryEntry[]> { // Return type remains array, but will likely contain only 0 or 1 entry now

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

  // 3. Generate Prompt using the SIMPLIFIED function
  const prompt = generatePromptForSingleURLMemoryEntries(historyItems);
  
  if (prompt === "No processable browsing history found.") {
      console.log('generateMemoryEntries: No relevant history items for prompt generation.');
      return [];
  }

  // 4. Send message to Offscreen document and get content
  let response: any; // Declare response outside try block to access in catch
  let content: string = ''; // Declare content outside try block
  try {
    if (import.meta.env.DEV) {
        console.log(`Memory Generator: Sending prompt to offscreen document...`);
    }
    
    // Assign the received response to the outer variable
    response = await chrome.runtime.sendMessage({ 
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
    // Assign content to the outer variable
    content = response.content;

  } catch (error: any) {
    console.error('Memory Generator: Error sending message to or receiving response from offscreen:', error);
    throw error; 
  }

  // 5. Parse and Validate the received content (expecting SINGLE object)
  try {
    // content variable is now accessible here
    if (!content) {
        // This check might be redundant if the try block above handles it, but safe to keep
        throw new Error("Offscreen document did not return content.");
    }

    console.log("Memory Generator: Attempting to parse received content:", content); 

    // Parse the JSON (expecting a single object now)
    const parsed: any = JSON.parse(content);

    // --- NEW VALIDATION LOGIC for SINGLE { summary, tags } object --- 
    let validatedEntry: MemoryEntry | null = null;

    // Basic object check
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // Check for summary field
        if (typeof parsed.summary === 'string' && parsed.summary.trim() !== '') {
            // Check for tags field (must be an array of strings)
            if (Array.isArray(parsed.tags) && parsed.tags.every((tag: any) => typeof tag === 'string')) {
                // If valid, create the entry
                validatedEntry = {
                    summary: parsed.summary.trim(),
                    tags: parsed.tags.map((tag: string) => tag.trim()).filter(Boolean)
                };
            } else {
                 console.warn('Memory Generator: Parsed object has invalid or missing tags array:', parsed);
            }
        } else {
            console.warn('Memory Generator: Parsed object has missing or empty summary:', parsed);
        }
    } else {
         console.error("Memory Generator: Expected a single JSON object, received:", parsed);
         throw new Error("Invalid response structure: Expected a single JSON object.");
    }
    // --- END NEW VALIDATION LOGIC ---

    if (validatedEntry) {
        console.log(`Memory Generator: Successfully parsed and validated 1 memory entry.`);
        return [validatedEntry]; // Return as an array containing the single entry
    } else {
         console.log(`Memory Generator: Parsed object failed validation.`);
         return []; // Return empty array if validation failed
    }
    
  } catch (err: any) { 
    console.error("Memory Generator: Failed to parse or validate memory entries:", err);
    // Log the problematic content if parsing failed
    if (err instanceof SyntaxError) {
        // Now 'content' is accessible here
        console.error("Problematic content:", content); 
    }
    throw err; 
  }
} 