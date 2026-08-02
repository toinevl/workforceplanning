import type { BoardState } from '@/lib/types/domain';
import { InfoHint } from '@/components/ui/InfoHint';

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
      <Stat
        label="Total"
        value={`${board.totalHeadcount}`}
        sub="members"
        hint="Total number of staff members currently in this scenario."
      />
      <Divider />
      <Stat
        label="FTE"
        value={board.totalFte.toFixed(1)}
        hint="Sum of full-time equivalents. Part-time staff count proportionally (e.g., 0.8 FTE = 0.8)."
      />
      <Divider />
      <Stat
        label="Removed"
        value={`${board.removedMembers.length}`}
        hint="Members removed from the scenario. These simulate departures like retirements or SQUAD endings."
      />
      {squadCount > 0 && (
        <>
          <Divider />
          <Stat
            label="SQUAD"
            value={`${squadCount}`}
            hint="Members on special temporary assignments. Often removed in planning scenarios."
          />
        </>
      )}
      {retirementRisk > 0 && (
        <>
          <Divider />
          <Stat
            label="Ret. Risk"
            value={`${retirementRisk}`}
            className="text-yellow-700"
            hint="Members eligible for retirement within the next 3 years."
          />
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  hint,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="font-semibold text-gray-900">{value}</span>
      {sub && <span className="text-gray-600 ml-1">{sub}</span>}
      <span className="text-gray-600 ml-1 text-xs inline-flex items-center gap-0.5">
        {label}
        {hint && <InfoHint text={hint} />}
      </span>
    </div>
  );
}

function Divider() {
  return <span className="text-gray-200">|</span>;
}
