// import React from 'react'; // Removed unused import
import type { MemoryEntry } from '../../../types'; // Use relative path

type Props = {
  entry: MemoryEntry;
};

/**
 * Renders a single memory entry card with summary and tags.
 */
export default function MemoryCard({ entry }: Props) {
  return (
    <div className="rounded-xl bg-white shadow p-4 mb-3 last:mb-0 ring-1 ring-black ring-opacity-5">
      {/* Display the summary */}
      <p className="text-sm text-gray-900 leading-relaxed">{entry.summary}</p>
      
      {/* Display tags if they exist */}
      {entry.tags && entry.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.tags.map((tag: string) => (
              <span
                key={tag} // Use tag itself as key, assuming tags are unique within an entry
                className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
      )}
    </div>
  );
} 