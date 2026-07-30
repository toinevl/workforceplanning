'use client';

import { coverageForTeam } from '@/lib/skills/roles';
import type { StaffMember, ScenarioMemberState } from '@/lib/types/domain';

interface TeamSkillBarsProps {
  members: Array<StaffMember & { scenarioState?: ScenarioMemberState }>;
  maxBars?: number;
}

/**
 * Compact skill gap visualization for team columns on the board.
 * Shows top-N skill gaps as horizontal bars (current vs ambition).
 */
export function TeamSkillBars({ members, maxBars = 3 }: TeamSkillBarsProps) {
  const coverage = coverageForTeam(
    members.map((m) => ({ role: m.role, skills: m.tags })),
    '',
    ''
  );

  const gaps = Object.entries(coverage.gapSkills)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, maxBars);

  if (gaps.length === 0) return null;

  const maxVal = Math.max(...gaps.map(([, g]) => Math.abs(g)), 1);

  return (
    <div className="px-2.5 py-2 border-t border-gray-100 bg-white space-y-1">
      {gaps.map(([skill, gap]) => {
        const current = coverage.currentSkills[skill] ?? 0;
        const ambition = coverage.ambitionSkills[skill] ?? 0;
        const barWidth = Math.max((Math.abs(gap) / maxVal) * 100, 5);
        const isSurplus = gap < 0;
        return (
          <div key={skill} className="flex items-center gap-1.5">
            <span className="text-[0.6875rem] text-gray-600 w-16 shrink-0 truncate" title={skill}>
              {skill}
            </span>
            <div className="flex-1 h-3.5 bg-gray-100 rounded-sm overflow-hidden relative">
              <div
                className={`h-full rounded-sm ${isSurplus ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className={`text-[0.6875rem] font-mono shrink-0 w-8 text-right ${isSurplus ? 'text-emerald-700' : 'text-amber-700'}`}>
              {gap > 0 ? '+' : ''}{gap.toFixed(0)}
            </span>
            <span className="text-[0.6875rem] text-gray-400 shrink-0">
              {current}/{ambition}
            </span>
          </div>
        );
      })}
    </div>
  );
}
