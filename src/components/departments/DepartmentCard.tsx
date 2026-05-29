'use client';

import Link from 'next/link';
import type { DepartmentWithStats } from '@/lib/types/domain';

interface DepartmentCardProps {
  dept: DepartmentWithStats;
}

export function DepartmentCard({ dept }: DepartmentCardProps) {
  const isUnassigned = dept.id === 'unassigned';
  const totalFte = typeof dept.totalFte === 'number' && Number.isFinite(dept.totalFte)
    ? dept.totalFte
    : 0;

  const containerClasses = isUnassigned
    ? 'flex items-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4'
    : 'flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500';

  const badgeClasses = isUnassigned
    ? 'h-4 w-4 flex-shrink-0 rounded-full border border-dashed border-gray-400 bg-gray-300'
    : 'h-4 w-4 flex-shrink-0 rounded-full border border-gray-200';

  const badgeStyle = isUnassigned ? undefined : { backgroundColor: dept.color };

  const content = (
    <>
      {/* Color badge */}
      <span
        className={badgeClasses}
        style={badgeStyle}
        aria-hidden="true"
      />

      {/* Name and description */}
      <div className="flex-1">
        {isUnassigned ? (
          <p className="text-sm italic text-gray-500">Unassigned</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-900">{dept.name}</p>
            {dept.description && (
              <p className="mt-0.5 text-xs text-gray-500">{dept.description}</p>
            )}
          </>
        )}
      </div>

      {/* Stat chips */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700">
          {dept.headcount} people
        </span>
        <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700">
          {totalFte.toFixed(1)} FTE
        </span>
        <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700">
          {dept.teamCount} {dept.teamCount === 1 ? 'team' : 'teams'}
        </span>
      </div>
    </>
  );

  if (isUnassigned) {
    return <div className={containerClasses}>{content}</div>;
  }

  return (
    <Link href={`/departments/${dept.id}`} className={containerClasses}>
      {content}
    </Link>
  );
}
