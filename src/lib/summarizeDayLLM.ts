// src/lib/summarizeDayLLM.ts

// Define the structure for a processed link
export interface NormalizedItem {
  url: string;
  title: string;
  // faviconUrl?: string; // Add later
}

// Define the structure for the summary result
export interface DailySummary {
  summaryText: string;
  itemCount: number;
  topLinks: NormalizedItem[]; // Add top links array
  error?: string; // Optional error message
}

// Placeholder for actual API call logic
async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  if (import.meta.env.DEV) {
    console.log('DEV: Simulating OpenAI call with key:', apiKey.substring(0, 5) + '...');
    console.log('DEV: Prompt:', prompt.substring(0, 100) + '...');
  }
  // Fake delay to simulate network request
  await new Promise(resolve => setTimeout(resolve, 500)); 

  // TODO: Replace with actual fetch call to OpenAI API
  // Example structure:
  // const response = await fetch('https://api.openai.com/v1/...', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${apiKey}`
  //   },
  //   body: JSON.stringify({ prompt: prompt, ... })
  // });
  // if (!response.ok) { 
  //    throw new Error(`OpenAI API Error: ${response.statusText}`);
  // }
  // const data = await response.json();
  // return data.choices[0].text; // Adjust based on actual response structure

  // Placeholder successful response
  return `This is a placeholder summary based on the prompt: ${prompt.substring(0,50)}...`;
}

// Helper to select top links (simple placeholder logic)
function selectTopLinks(historyItems: chrome.history.HistoryItem[], count: number = 5): NormalizedItem[] {
  // Simple logic: return the first few unique items with titles/urls
  const uniqueLinks = new Map<string, NormalizedItem>();
  for (const item of historyItems) {
    if (item.url && item.title && !uniqueLinks.has(item.url) && uniqueLinks.size < count) {
      uniqueLinks.set(item.url, {
        url: item.url,
        title: item.title,
      });
    }
    if (uniqueLinks.size >= count) break;
  }
  return Array.from(uniqueLinks.values());
}

export async function summarizeDayLLM(
  historyItems: chrome.history.HistoryItem[], 
  apiKey: string | null | undefined
): Promise<DailySummary> {
  
  // 1. Check for API Key
  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.warn('summarizeDayLLM: API key is missing. Skipping summary.');
    }
    return { summaryText: '', itemCount: 0, topLinks: [], error: 'API key not provided.' };
  }

  // 2. Check for history items
  if (historyItems.length === 0) {
    // This case is handled in background.ts now, but keep safeguard
    return { summaryText: 'No browsing activity found for today.', itemCount: 0, topLinks: [] };
  }

  // 3. Prepare the prompt (basic example)
  const titles = historyItems.map(item => item.title || 'Untitled Page').join('\n - ');
  const prompt = `Summarize the following browsing activity for the day:\n - ${titles}`;
  
  // 4. Select top links (placeholder)
  const topLinks = selectTopLinks(historyItems);

  // 5. Call the LLM API with error handling
  try {
    const summary = await callOpenAI(prompt, apiKey);
    return {
      summaryText: summary,
      itemCount: historyItems.length,
      topLinks: topLinks, // Include top links
    };
  } catch (error) {
    console.error('summarizeDayLLM: Error calling OpenAI API:', error);
    let errorMessage = 'Failed to generate summary due to an unknown error.';
    if (error instanceof Error) {
      errorMessage = `Failed to generate summary: ${error.message}`;
    }
    return {
      summaryText: '',
      itemCount: historyItems.length,
      topLinks: topLinks, // Still return the links we found
      error: errorMessage,
    };
  }
} 