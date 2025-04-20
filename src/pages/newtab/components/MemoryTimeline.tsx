import type { MemoryEntry } from '../../../lib/summarizeDayLLM';
import { MemoryCard } from './MemoryCard';

// REMOVED Opacity Configuration

interface MemoryTimelineProps {
  entries: MemoryEntry[];
  error?: string | null;
}

export function MemoryTimeline({ entries, error }: MemoryTimelineProps) {
  return (
    <div className="space-y-4 flex-grow overflow-y-auto hide-scrollbar p-12 fade-scroll-edges">
      {/* Optional: Add "Today" or date heading here */}
      {/* <h2 className="text-sm font-medium text-gray-500 mb-2">Today</h2> */}
      
      {entries.map((entry) => {
        // REMOVED opacity calculation
        
        // Render MemoryCard directly
        return (
          <MemoryCard key={entry.id} entry={entry} />
        );
      })}

      {/* Display processing error if entries were generated but there was still an error */}
      {error && (
        <p className="text-center text-sm text-red-600 mt-4 font-light">
          Note: There was an error during processing: {error}
        </p>
      )}
    </div>
  );
} 