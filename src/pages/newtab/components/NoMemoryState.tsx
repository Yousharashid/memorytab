interface NoMemoryStateProps {
  message?: string;
  date?: string;
  processingError?: string | null;
}

export function NoMemoryState({ message, date, processingError }: NoMemoryStateProps) {
  const defaultMessage = processingError
    ? `Could not generate memories for ${date || 'today'}: ${processingError}`
    : `No memories generated yet for ${date || 'today'}. Check back later or browse some more!`;

  return (
    <div className="text-center text-gray-500 py-10 px-4">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="mt-2 text-sm font-light text-gray-900">No Memories Yet</h3>
      <p className="mt-1 text-sm text-gray-500 font-light">
        {message || defaultMessage}
      </p>
      {/* Optional: Add a button to trigger manual refresh? */}
    </div>
  );
} 