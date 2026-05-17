export default function ScenarioLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Scenario header/stats area */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Stats line */}
        <div className="flex items-center gap-4 text-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
              <div className="text-gray-200">|</div>
            </div>
          ))}
        </div>
      </div>

      {/* Team columns grid skeleton */}
      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-x-auto">
          <div className="grid grid-flow-col auto-cols-[minmax(160px,1fr)] gap-3">
            {Array.from({ length: 4 }).map((_, colIdx) => (
              <div key={colIdx} className="space-y-3">
                {/* Column header */}
                <div className="bg-white rounded-lg border border-gray-200 p-3 h-16">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
                </div>

                {/* Member cards in column */}
                {Array.from({ length: 5 }).map((_, cardIdx) => (
                  <div
                    key={cardIdx}
                    className="bg-white rounded-lg border border-gray-200 p-3 space-y-2"
                  >
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
