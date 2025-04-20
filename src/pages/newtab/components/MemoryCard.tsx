import type { MemoryEntry } from '../../../lib/summarizeDayLLM';
import { useFaviconFallback } from '../hooks/useFaviconFallback';

interface MemoryCardProps {
  entry: MemoryEntry;
}

export function MemoryCard({ entry }: MemoryCardProps) {
  const primaryUrl = entry.urls?.[0];
  
  // Use the hook to get the src and error handler
  const { iconSrc, handleError } = useFaviconFallback(primaryUrl); 

  // Base classes
  const cardClasses = "flex items-center space-x-3 p-6 rounded-2xl transition-all duration-200 ease-in-out";
  // Hover classes - Only add drop shadow
  const hoverClasses = primaryUrl ? "hover:shadow-lg cursor-pointer" : "cursor-default";
  // Dimmed classes - Apply new bg/shadow when NOT dimmed
  const dimmedClasses = entry.isDimmed 
    ? "opacity-60" 
    : "bg-[rgba(255,255,255,0.30)] shadow-[0px_0px_10px_3px_rgba(255,255,255,0.30)_inset]"; // Replaced bg-white/70 shadow-sm

  const cardContent = (
    <div className={`${cardClasses} ${dimmedClasses} ${hoverClasses}`}>
      <img
        key={iconSrc} // Use iconSrc as key to trigger re-render on src change
        src={iconSrc} // Use src from hook
        alt={`Favicon for ${entry.summary}`}
        width="24"
        height="24"
        className="flex-shrink-0 rounded-full w-6 h-6 object-contain text-gray-400"
        onError={handleError} // Use error handler from hook
      />
      {/* --- Text Area (Flex Container) --- */}
      <div className="flex-grow min-w-0 flex justify-between items-center space-x-4"> 
        {/* Summary Text */}
        <span className="text-2xl text-[rgba(0,0,0,0.45)] truncate font-light min-w-0 flex-grow">
          {entry.summary}
        </span>
        {/* Time Text */}
        <span className="text-2xl text-[rgba(0,0,0,0.25)] font-light flex-shrink-0">
          {entry.time}
        </span>
      </div>
    </div>
  );

  // If a URL exists, wrap the card content in a link
  if (primaryUrl) {
    return (
      <a href={primaryUrl} target="_blank" rel="noopener noreferrer" className="block">
        {cardContent}
      </a>
    );
  }

  // Otherwise, just render the card content without a link
  return cardContent;
} 