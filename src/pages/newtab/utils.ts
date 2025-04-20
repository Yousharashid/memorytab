import type { MemoryEntry } from '../../lib/summarizeDayLLM';

/**
 * Formats a timestamp into a readable time string (e.g., "3:45pm").
 * Handles potential errors and undefined input.
 */
export const formatTime = (timestamp?: number): string => {
  if (timestamp === undefined || timestamp === null) return '';
  try {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (e) {
    console.error("Error formatting time:", e);
    return ''; // Handle potential errors
  }
};

/**
 * Extracts the top N unique domains from memory entries.
 */
export const getTopDomains = (entries: MemoryEntry[], count: number = 7): string[] => {
    const domainCounts: { [domain: string]: number } = {};
    const uniqueDomains = new Set<string>();

    for (const entry of entries) {
        if (entry.urls && entry.urls.length > 0) {
            try {
                const url = new URL(entry.urls[0]);
                // Basic domain extraction (might need refinement for subdomains etc.)
                const domain = url.hostname.replace(/^www\./, '');
                if (domain) {
                    uniqueDomains.add(domain);
                    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }
    }

    // Sort by count (desc) then alphabetically, take top N
    return Array.from(uniqueDomains)
        .sort((a, b) => (domainCounts[b] - domainCounts[a]) || a.localeCompare(b))
        .slice(0, count);
};

/**
 * Generates a URL for fetching a favicon (using Google's service).
 */
export const getFaviconUrl = (domainOrUrl?: string, size: number = 32): string => {
    if (!domainOrUrl) return ''; // Return empty or a default placeholder icon URL
    // Use domain if provided, otherwise try extracting from URL
    let domain = domainOrUrl;
    try {
        // Check if it's a full URL
        if (domainOrUrl.includes('://')) {
            const url = new URL(domainOrUrl);
            domain = url.hostname;
        }
    } catch (e) { /* Ignore if not a valid URL */ }
    
    return `https://www.google.com/s2/favicons?sz=${size}&domain_url=${encodeURIComponent(domain)}`;
}; 