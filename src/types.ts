/**
 * Represents a summarized memory entry derived from browsing history.
 */
export type MemoryEntry = {
  summary: string;  // Concise summary of the user's activity.
  tags: string[];   // Relevant tags associated with the activity.
}; 