'use client';

import type { BoardState } from '@/lib/types/domain';

interface ScenarioStatsProps {
  board: BoardState;
}

export function ScenarioStats({ board }: ScenarioStatsProps) {
  const squadCount = board.teams
    .flatMap((t) => t.members)
    .filter((m) => m.isSquad).length;

  const retirementRisk = board.teams
    .flatMap((t) => t.members)
    .filter(
      (m) =>
        m.retirementEligibleYear !== undefined &&
        m.retirementEligibleYear <= new Date().getFullYear() + 3
    ).length;

  return (
    <div className="flex items-center gap-4 text-sm">
      <Stat label="Total" value={`${board.totalHeadcount}`} sub="members" />
      <Divider />
      <Stat label="FTE" value={board.totalFte.toFixed(1)} />
      <Divider />
      <Stat label="Removed" value={`${board.removedMembers.length}`} />
      {squadCount > 0 && (
        <>
          <Divider />
          <Stat label="SQUAD" value={`${squadCount}`} />
        </>
      )}
      {retirementRisk > 0 && (
        <>
          <Divider />
          <Stat label="Ret. Risk" value={`${retirementRisk}`} className="text-yellow-700" />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, className }: { label: string; value: string; sub?: string; className?: string }) {
  return (
    <div className={className}>
      <span className="font-semibold text-gray-900">{value}</span>
      {sub && <span className="text-gray-500 ml-1">{sub}</span>}
      <span className="text-gray-400 ml-1 text-xs">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="text-gray-200">|</span>;
}
