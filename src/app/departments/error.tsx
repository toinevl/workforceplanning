'use client';

import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DepartmentsError({ error, reset }: ErrorProps) {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold text-red-900 mb-2">Failed to load departments</h2>
        <p className="text-red-800 mb-6 text-sm">
          {error.message || 'An error occurred while loading the departments. Please try again.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2.5 bg-red-900 text-white text-sm rounded-lg hover:bg-red-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2.5 border border-red-300 text-red-900 text-sm rounded-lg hover:bg-red-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Go back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
