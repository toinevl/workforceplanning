import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h2>
        <p className="text-gray-600 mb-6 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <Link
          href="/"
          className="px-4 py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
