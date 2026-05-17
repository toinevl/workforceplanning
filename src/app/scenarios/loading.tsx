export default function ScenariosLoading() {
  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse shrink-0"></div>
      </div>

      {/* Scenario cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            {/* Card title */}
            <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse"></div>

            {/* Card description */}
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse"></div>
              <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse"></div>
            </div>

            {/* Stats section */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse"></div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <div className="h-8 flex-1 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-8 flex-1 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
