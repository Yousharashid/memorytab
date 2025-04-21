// src/pages/newtab/utils.ts

// Import the type from the correct location
// MemoryEntry import might not be needed here anymore if getTopDomains is removed
// import type { MemoryEntry } from '../../types'; 

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
 * Helper function to get a favicon URL using Google's service.
 * @param domain - The domain to get the favicon for.
 * @param size - The desired size of the favicon (default: 32).
 * @returns The URL to the favicon.
 */
export const getFaviconUrl = (domain: string, size = 32): string => {
  if (!domain) return ''; // Handle empty domain
  // Basic check to avoid constructing invalid URLs
  if (!domain.includes('.')) return ''; 
  
  try {
    // Validate if it's a plausible domain structure or full URL
    // If it's a full URL, extract the hostname
    if (domain.startsWith('http')) {
        const urlObject = new URL(domain);
        domain = urlObject.hostname;
    }
    // Basic validation to avoid obviously bad domains
    if (domain.length < 3 || domain.includes(' ')) return ''; 

  } catch (error) {
    console.error("Error parsing domain for favicon:", domain, error);
    return ''; // Return empty on error
  }
      
  return `https://www.google.com/s2/favicons?sz=${size}&domain_url=${encodeURIComponent(domain)}`;
};

// Define a structure for DockItem if it's not defined elsewhere
export interface DockItem {
  // ... rest of the file ...
} 