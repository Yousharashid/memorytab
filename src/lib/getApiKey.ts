// src/lib/getApiKey.ts

export async function getApiKey(): Promise<string | null> {
  // Attempt to get the API key from synced storage
  const result = await chrome.storage.sync.get('openaiApiKey');
  return result.openaiApiKey || null;
}

export async function setApiKey(apiKey: string): Promise<void> {
  // Save the API key to synced storage
  await chrome.storage.sync.set({ openaiApiKey: apiKey });
} 