// Basic placeholder skeleton loader
export function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="flex items-start space-x-3 p-3 rounded-md bg-white shadow-sm">
          <div className="w-5 h-5 rounded-full bg-gray-200 mt-1"></div>
          <div className="flex-grow space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
      <p className="text-center text-gray-400 pt-4 font-light">Loading your memory timeline...</p>
    </div>
  );
} 