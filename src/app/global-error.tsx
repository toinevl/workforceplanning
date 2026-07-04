'use client';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <div className="max-w-2xl mx-auto py-12 px-4 w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Application error</h2>
            <p className="text-red-800 mb-6 text-sm">
              {error.message || 'A runtime error occurred. Please try again.'}
            </p>
            <button
              onClick={unstable_retry}
              className="px-4 py-2.5 bg-red-900 text-white text-sm rounded-lg hover:bg-red-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
