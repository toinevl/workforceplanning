export default function DepartmentsLoading() {
  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"></div>
      </div>

      {/* Department card skeletons */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
            {/* Color badge */}
            <div className="h-4 w-4 flex-shrink-0 rounded-full bg-gray-200 animate-pulse"></div>

            {/* Name and description */}
            <div className="flex-1 space-y-1">
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 w-56 bg-gray-100 rounded animate-pulse"></div>
            </div>

            {/* Stat chips */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="h-5 w-16 rounded border border-gray-200 bg-gray-50 animate-pulse"></div>
              <div className="h-5 w-12 rounded border border-gray-200 bg-gray-50 animate-pulse"></div>
              <div className="h-5 w-14 rounded border border-gray-200 bg-gray-50 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
