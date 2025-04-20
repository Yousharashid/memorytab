// src/lib/getApiKey.ts

export async function getApiKey(): Promise<string | null> {
  // Use local storage
  const result = await chrome.storage.local.get('openaiApiKey');
  return result.openaiApiKey || null;
}

export async function setApiKey(apiKey: string): Promise<void> {
  // Use local storage
  await chrome.storage.local.set({ openaiApiKey: apiKey });
} 