export default function DepartmentDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Breadcrumb */}
      <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>

      {/* Title with badge */}
      <div className="mt-4 flex items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Description */}
      <div className="mt-2 space-y-1">
        <div className="h-4 w-96 max-w-full bg-gray-100 rounded animate-pulse"></div>
        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
      </div>

      {/* Teams section */}
      <div className="mt-8">
        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
            >
              {/* Color dot */}
              <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse"></div>

              {/* Team name */}
              <div className="flex-1 h-4 w-40 bg-gray-200 rounded animate-pulse"></div>

              {/* Stat chips */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-5 w-16 rounded border border-gray-200 bg-gray-50 animate-pulse"></div>
                <div className="h-5 w-12 rounded border border-gray-200 bg-gray-50 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
