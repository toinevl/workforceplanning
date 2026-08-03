'use client';

import type { TeamWithStats } from '@/lib/types/domain';
import { SkillRadarChart } from '@/components/skills/SkillRadarChart';
import { InfoHint } from '@/components/ui/InfoHint';

interface SkillCoveragePoint {
  id: string;
  name: string;
  current: number;
  ambition: number;
  gap: number;
}

interface DepartmentTeamRowProps {
  team: TeamWithStats & {
    skillOverrides?: Record<string, number>;
    skills?: SkillCoveragePoint[];
  };
}

export function DepartmentTeamRow({ team }: DepartmentTeamRowProps) {
  const skills = team.skills;
  const data = (skills ?? []).map((s) => ({ skill: s.name, current: s.current, ambition: s.ambition }));
  const sortedGaps = [...(skills ?? [])].sort((a, b) => b.gap - a.gap);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-4 p-4">
        <span
          className="w-3 h-3 rounded-full shrink-0 border border-gray-200"
          style={{ backgroundColor: team.color }}
          aria-hidden="true"
        />
        <p className="flex-1 text-sm font-bold text-gray-900">{team.name}</p>
        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-700">
          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1">{team.headcount} people</span>
          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1">{team.totalFte.toFixed(1)} FTE</span>
        </div>
      </div>
      <div className="border-t border-gray-100 bg-gray-50/50 p-4">
        {!skills ? (
          <div className="flex gap-2">
            <div className="h-48 flex-1 bg-gray-100 rounded animate-pulse" />
            <div className="h-48 flex-1 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : skills.length === 0 ? (
          <p className="text-xs text-gray-500">
            No skills configured for this department yet — add some in Settings → Departments.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <SkillRadarChart data={data} size={220} />
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
              <div className="mb-2 flex items-center gap-1">
                <h3 className="font-semibold text-gray-900">Skill coverage</h3>
                <InfoHint text="Ambition = required headcount set by the department (or overridden for this team). Gap = ambition minus current." />
              </div>
              <ul className="space-y-1">
                {sortedGaps.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4">
                    <span className="text-gray-700">{s.name}</span>
                    <span className="font-mono text-gray-900">
                      {s.gap > 0 ? '+' : ''}
                      {s.gap}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
