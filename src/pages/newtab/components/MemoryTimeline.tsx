// import React from 'react'; // Removed unused import
import type { MemoryEntry } from '../../../types';
import MemoryCard from './MemoryCard';

// REMOVED Opacity Configuration

interface MemoryTimelineProps {
  entries: MemoryEntry[];
  error?: string | null;
}

export function MemoryTimeline({ entries, error }: MemoryTimelineProps) {
  // Display error message if present
  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Error generating memories: {error}</p>
      </div>
    );
  }

  // Display message if no entries exist (and no error)
  if (!entries || entries.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No memory entries found for today.</p>
      </div>
    );
  }

  // Render the timeline with the new MemoryCard component
  return (
    <div className="p-6 space-y-3 overflow-y-auto h-full">
      {entries.map((entry, idx) => (
        <MemoryCard key={idx} entry={entry} />
      ))}
    </div>
  );
} 