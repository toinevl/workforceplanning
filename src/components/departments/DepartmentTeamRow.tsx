'use client';

import type { TeamWithStats } from '@/lib/types/domain';

interface DepartmentTeamRowProps {
  team: TeamWithStats;
}

export function DepartmentTeamRow({ team }: DepartmentTeamRowProps) {
  const totalFte = typeof team.totalFte === 'number' && Number.isFinite(team.totalFte)
    ? team.totalFte
    : 0;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <span
        className="w-3 h-3 rounded-full shrink-0 border border-gray-200"
        style={{ backgroundColor: team.color }}
        aria-hidden="true"
      />
      <p className="flex-1 text-sm font-bold text-gray-900">{team.name}</p>
      <div className="flex items-center gap-2 shrink-0">
        <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-normal text-gray-700">
          {team.headcount} people
        </span>
        <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-normal text-gray-700">
          {totalFte.toFixed(1)} FTE
        </span>
      </div>
    </div>
  );
}
