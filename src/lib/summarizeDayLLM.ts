// src/lib/summarizeDayLLM.ts

// Define the structure for a memory entry
export interface MemoryEntry {
  id: string; // Unique identifier (e.g., timestamp hash)
  time: string; // Formatted time (e.g., "09:45am")
  summary: string; // The LLM-generated summary for this moment
  sourceIcon?: string; // Optional: favicon URL or emoji
  isDimmed?: boolean; // Optional: UI hint
  urls?: string[]; // Optional: Source URLs contributing to this memory
}

// Helper to generate the prompt asking for structured JSON output for single-URL memories
function generatePromptForSingleURLMemoryEntries(items: chrome.history.HistoryItem[]): string {
  // Select relevant items and format for the prompt
  const links = items
    .filter(item => item.url && item.title) // Filter out items without url/title
    .slice(0, 30) // Limit history input
    .map((item, i) => `(${i + 1}) ${item.title} — ${item.url}`)
    .join("\n");

  // Check if there are any links to include
  if (!links) {
      return "No relevant browsing history found to generate memories."; // Or handle appropriately
  }

  // Construct the prompt using the new template
  return `\nYou are a memory assistant. Given the list of websites a user visited today, generate a list of concise memory entries. Each memory entry should summarize the *main intent or activity* behind a single page visit.\n\nOnly generate 5 memory entries. Each must include:\n- A unique id (timestamp + short suffix)\n- A short time label (e.g. "3:45pm") derived from the visit time\n- A one-sentence summary\n- A single sourceIcon (relevant emoji is best)\n- Exactly one URL in the 'urls' array (the most relevant one for that summary)\n\nRespond ONLY with a valid JSON array like this, starting immediately with \`\`\`json and ending immediately with \`\`\`:\n\n\`\`\`json\n[\n  {\n    "id": "1682739845000_abc123",\n    "time": "3:45pm",\n    "summary": "Explored Supabase auth docs.",\n    "sourceIcon": "📘",\n    "urls": ["https://supabase.com/docs/guides/auth"]\n  }\n]\n\`\`\`\n\nEnsure the entire response is valid JSON. Do not include any text before or after the JSON block.\n\nHere's the browsing history:\n\n${links}\n  `.trim();
}

// Main function to generate memory entries using OpenAI
export async function generateMemoryEntries(
  historyItems: chrome.history.HistoryItem[],
  apiKey: string | null | undefined
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

  // 4. Call OpenAI API, expecting JSON
  try {
    if (import.meta.env.DEV) {
        console.log(`Memory Generator: Calling OpenAI...
Prompt: ${prompt.substring(0, 300)}...`);
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo-0125", // Ensure model supports JSON mode if needed, or parse manually
          messages: [
            {
              role: "system",
              content: "You are an assistant that analyzes browsing history and generates a timeline of distinct activities as a JSON array. Follow the user's specified JSON structure precisely.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more focused, structured output
          max_tokens: 500, // Increase tokens slightly for potential JSON structure
          // response_format: { type: "json_object" }, // Use if model supports guaranteed JSON output
        }),
      });

    if (!res.ok) {
        const errorBody = await res.text();
        console.error("OpenAI API Error Response:", res.status, res.statusText, errorBody);
        throw new Error(`OpenAI error: ${res.status} ${res.statusText}. ${errorBody}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("OpenAI response content is empty.");
    }

    if (import.meta.env.DEV) {
        console.log("Memory Generator: Raw OpenAI response content:", content);
    }
    
    // Attempt to parse the JSON array from the response
    try {
      // Basic cleanup: Remove potential markdown code fences and trim whitespace
      const cleanedContent = content.replace(/^```json\n?|\n?```$/g, '').trim();
      
      // Handle potential empty string after cleanup
      if (!cleanedContent) {
          throw new Error("Cleaned response content is empty.");
      }

      const memoryEntries: MemoryEntry[] = JSON.parse(cleanedContent);
      
      // Basic validation (check if it's an array)
      if (!Array.isArray(memoryEntries)) {
          throw new Error("OpenAI response was not a valid JSON array after cleanup.");
      }
      
      // Ensure each entry has exactly one URL as per the new prompt design
      const validatedEntries = memoryEntries.map(entry => {
          if (entry.urls && entry.urls.length > 0) {
              // Keep only the first URL
              return { ...entry, urls: [entry.urls[0]] }; 
          } else {
              // Handle entries that might have been returned without a URL (or empty array)
              // Optionally filter these out or return them as is depending on strictness needed
              return { ...entry, urls: [] }; // Ensure urls is always an array
          }
      }).filter(entry => entry.urls && entry.urls.length > 0); // Optionally filter out entries without a URL

      console.log(`Memory Generator: Successfully parsed and validated ${validatedEntries.length} memory entries.`);
      return validatedEntries; // Return the validated/cleaned entries
    } catch (parseError) {
        console.error("Memory Generator: Failed to parse OpenAI JSON response:", parseError);
        console.error("Memory Generator: Received content:", content); // Log the problematic content
        throw new Error(`Failed to parse OpenAI response as JSON array. ${parseError instanceof Error ? parseError.message : parseError}`);
    }

  } catch (error) {
    console.error('Memory Generator: Error calling or processing OpenAI API:', error);
    // Re-throw error to be handled by the background script
    throw error; 
  }
} 