'use client';

import { useState } from 'react';
import type { TeamWithStats } from '@/lib/types/domain';
import { SkillRadarChart } from '@/components/skills/SkillRadarChart';
import { InfoHint } from '@/components/ui/InfoHint';
import { useUpdateTeam } from '@/lib/hooks/useTeams';

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

function EditableSkillGap({
  skill,
  isOverridden,
  onSave,
  onReset,
  isSaving,
}: {
  skill: SkillCoveragePoint;
  isOverridden: boolean;
  onSave: (skillId: string, value: number) => void;
  onReset: (skillId: string) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(skill.ambition));

  function startEditing() {
    setDraft(String(skill.ambition));
    setEditing(true);
  }

  function commit() {
    const value = Number(draft);
    setEditing(false);
    if (!Number.isFinite(value) || value < 0 || Math.trunc(value) !== value) {
      setDraft(String(skill.ambition));
      return;
    }
    if (value !== skill.ambition) onSave(skill.id, value);
  }

  return (
    <li className="flex items-center justify-between gap-4">
      <span className="text-gray-700">{skill.name}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-gray-900">
          {skill.gap > 0 ? '+' : ''}
          {skill.gap}
        </span>
        {editing ? (
          <input
            type="number"
            min={0}
            step={1}
            autoFocus
            aria-label={`Edit required headcount for ${skill.name}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(String(skill.ambition));
                setEditing(false);
              }
            }}
            disabled={isSaving}
            className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            disabled={isSaving}
            aria-label={`Edit required headcount for ${skill.name}`}
            className="rounded border border-transparent px-1.5 py-0.5 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed"
          >
            req: {skill.ambition}
          </button>
        )}
        {isOverridden && (
          <button
            type="button"
            onClick={() => onReset(skill.id)}
            disabled={isSaving}
            className="text-xs text-gray-400 underline hover:text-gray-700 disabled:cursor-not-allowed"
          >
            reset
          </button>
        )}
      </span>
    </li>
  );
}

export function DepartmentTeamRow({ team }: DepartmentTeamRowProps) {
  const updateTeam = useUpdateTeam();
  const skills = team.skills;
  const data = (skills ?? []).map((s) => ({ skill: s.name, current: s.current, ambition: s.ambition }));
  const sortedGaps = [...(skills ?? [])].sort((a, b) => b.gap - a.gap);

  function handleSaveOverride(skillId: string, value: number) {
    const nextOverrides = { ...(team.skillOverrides ?? {}), [skillId]: value };
    updateTeam.mutate({ id: team.id, updates: { skillOverrides: nextOverrides } });
  }

  function handleResetOverride(skillId: string) {
    const nextOverrides = { ...(team.skillOverrides ?? {}) };
    delete nextOverrides[skillId];
    updateTeam.mutate({ id: team.id, updates: { skillOverrides: nextOverrides } });
  }

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
                <InfoHint text="Ambition = required headcount set by the department (or overridden for this team). Click a skill's number to change this team's requirement. Gap = ambition minus current." />
              </div>
              <ul className="space-y-1">
                {sortedGaps.map((s) => (
                  <EditableSkillGap
                    key={s.id}
                    skill={s}
                    isOverridden={team.skillOverrides?.[s.id] !== undefined}
                    onSave={handleSaveOverride}
                    onReset={handleResetOverride}
                    isSaving={updateTeam.isPending}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
