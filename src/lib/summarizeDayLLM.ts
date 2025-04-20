// src/lib/summarizeDayLLM.ts

// Define the structure for a processed link
export interface NormalizedItem {
  url: string;
  title: string;
  lastVisitTime?: number; // Keep optional for now
}

// Define the structure for the summary result
export interface DailySummary {
  summaryText: string;
  itemCount: number;
  topLinks: NormalizedItem[];
  error?: string;
}

// Helper to generate the prompt for OpenAI
function generatePrompt(items: chrome.history.HistoryItem[]): string {
  const lines = items
    .slice(0, 30) // Limit prompt length
    .map((item) => `- ${item.title || 'Untitled'} (${item.url || 'N/A'})`)
    .join("\n");

  return `Here's a list of pages I visited today:\n\n${lines}\n\nPlease summarize what I was focused on or trying to achieve today in 1-2 concise sentences.`;
}

// Helper to select top links (simple placeholder logic)
function selectTopLinks(historyItems: chrome.history.HistoryItem[], count: number = 5): NormalizedItem[] {
  const uniqueLinks = new Map<string, NormalizedItem>();
  for (const item of historyItems) {
    if (item.url && item.title && !uniqueLinks.has(item.url) && uniqueLinks.size < count) {
      uniqueLinks.set(item.url, {
        url: item.url,
        title: item.title,
        lastVisitTime: item.lastVisitTime
      });
    }
    if (uniqueLinks.size >= count) break;
  }
  return Array.from(uniqueLinks.values());
}

// Main function to summarize history using OpenAI
export async function summarizeDayLLM(
  historyItems: chrome.history.HistoryItem[], 
  apiKey: string | null | undefined
): Promise<DailySummary> {
  
  // Select top links first (can be done even if API call fails)
  const topLinks = selectTopLinks(historyItems);

  // 1. Check for API Key
  if (!apiKey || !apiKey.startsWith("sk-")) {
    if (import.meta.env.DEV) {
      console.warn('summarizeDayLLM: Invalid or missing API key.');
    }
    return { 
        summaryText: 'API key is missing or invalid. Please set it in options.',
        itemCount: historyItems.length,
        topLinks: topLinks,
        error: 'Invalid API key' 
    };
  }

  // 2. Check for history items
  if (historyItems.length === 0) {
    return { summaryText: 'No browsing activity recorded.', itemCount: 0, topLinks: [] };
  }

  // 3. Generate Prompt
  const prompt = generatePrompt(historyItems);
  
  // 4. Call OpenAI API
  try {
    if (import.meta.env.DEV) {
        console.log(`Summarizer: Calling OpenAI with prompt (key: ${apiKey.substring(0, 5)}...):\n${prompt.substring(0, 200)}...`);
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo-0125", // Or a newer/cheaper model if preferred
          messages: [
            {
              role: "system",
              content: "You are a productivity assistant. Summarize the user's web browsing activity for the day based on the provided list of visited page titles and URLs. Focus on the main themes or tasks in 1-2 concise sentences.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.5, // Adjust for creativity vs determinism
          max_tokens: 100, // Limit response length
        }),
      });

    if (!res.ok) {
        const errorBody = await res.text();
        console.error("OpenAI API Error Response:", res.status, res.statusText, errorBody);
        throw new Error(`OpenAI error: ${res.status} ${res.statusText}. ${errorBody}`);
    }

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "No summary generated.";
    
    if (import.meta.env.DEV) {
        console.log("Summarizer: OpenAI response received:", summary);
    }

    return {
      summaryText: summary,
      itemCount: historyItems.length,
      topLinks: topLinks,
    };

  } catch (error) {
    console.error('summarizeDayLLM: Error calling OpenAI API:', error);
    let errorMessage = 'Failed to generate summary due to an API error.';
    if (error instanceof Error) {
      errorMessage = `Failed to generate summary: ${error.message}`;
    }
    // Return error state but still include the links
    return {
      summaryText: '', 
      itemCount: historyItems.length,
      topLinks: topLinks,
      error: errorMessage,
    };
  }
} 