import { useFaviconFallback } from '../hooks/useFaviconFallback';

interface MemoryDockProps {
  items: string[];
}

export function MemoryDock({ items }: MemoryDockProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-start items-center space-x-4 p-2 rounded-full">
      {items.map((item) => {
        const { iconSrc, handleError } = useFaviconFallback(item);
        const targetUrl = `http://${item}`;
        
        return (
          <a 
            href={targetUrl} 
            key={`${item}-${iconSrc}`} 
            target="_blank" 
            rel="noopener noreferrer"
            title={item}
          >
            <div 
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/40 p-1 backdrop-blur-sm shadow-sm hover:bg-white/60 transition-colors duration-150 ease-in-out"
            >
              <img
                key={iconSrc}
                src={iconSrc}
                alt={item}
                width="28"
                height="28"
                className="w-7 h-7 object-contain text-gray-500"
                onError={handleError}
              />
            </div>
          </a>
        );
      })}
    </div>
  );
} 