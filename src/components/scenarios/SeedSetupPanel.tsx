'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SeedTeamConfig } from '@/lib/types/seed';

const STORAGE_KEY = 'workforceplanning.seedSetup.v1';

const DEFAULT_TEAMS: SeedTeamConfig[] = [
  { id: 'team-alpha', key: 'alpha', name: 'Team Alpha', color: '#6366f1', members: 10, retirees: 1, squad: 1 },
  { id: 'team-bravo', key: 'bravo', name: 'Team Bravo', color: '#0ea5e9', members: 9, retirees: 1, squad: 1 },
  { id: 'team-charlie', key: 'charlie', name: 'Team Charlie', color: '#10b981', members: 10, retirees: 2, squad: 1 },
  { id: 'team-delta', key: 'delta', name: 'Team Delta', color: '#f59e0b', members: 9, retirees: 1, squad: 1 },
  { id: 'team-echo', key: 'echo', name: 'Team Echo', color: '#f43f5e', members: 9, retirees: 2, squad: 0 },
  { id: 'team-foxtrot', key: 'foxtrot', name: 'Team Foxtrot', color: '#8b5cf6', members: 9, retirees: 1, squad: 0 },
];

const PALETTE = ['#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#475569'];

interface SeedSetupPanelProps {
  isPending: boolean;
  result?: { teams: number; members: number; scenarios: number };
  error?: Error | null;
  onSeed: (teams: SeedTeamConfig[], resetFirst: boolean) => void;
}

export function SeedSetupPanel({ isPending, result, error, onSeed }: SeedSetupPanelProps) {
  const [teams, setTeams] = useState<SeedTeamConfig[]>(() => loadStoredTeams());
  const [activeAction, setActiveAction] = useState<'seed' | 'reset' | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
  }, [teams]);

  const totals = useMemo(() => {
    return teams.reduce(
      (acc, team) => ({
        members: acc.members + asNumber(team.members),
        retirees: acc.retirees + asNumber(team.retirees),
        squad: acc.squad + asNumber(team.squad),
      }),
      { members: 0, retirees: 0, squad: 0 }
    );
  }, [teams]);

  const validationMessage = validateTeams(teams);
  const canSeed = !validationMessage && !isPending;

  function updateTeam(index: number, patch: Partial<SeedTeamConfig>) {
    setTeams((current) =>
      current.map((team, i) => {
        if (i !== index) return team;
        const next = { ...team, ...patch };
        const members = asNumber(next.members);
        return {
          ...next,
          retirees: Math.min(asNumber(next.retirees), members),
          squad: Math.min(asNumber(next.squad), members),
        };
      })
    );
  }

  function addTeam() {
    const nextIndex = teams.length + 1;
    setTeams((current) => [
      ...current,
      {
        id: `team-custom-${nextIndex}`,
        name: `Team ${nextIndex}`,
        color: PALETTE[teams.length % PALETTE.length],
        members: 8,
        retirees: 1,
        squad: 0,
      },
    ]);
  }

  function resetDraft() {
    setTeams(cloneDefaultTeams());
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function submit(resetFirst: boolean) {
    setActiveAction(resetFirst ? 'reset' : 'seed');
    onSeed(teams, resetFirst);
  }

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Sample Data Setup</h2>
            <p className="mt-1 text-sm text-gray-500">
              Define the organization shape, then generate teams, members, retirees, SQUAD profiles, and scenarios.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:flex sm:items-center">
            <Metric label="Teams" value={teams.length} />
            <Metric label="Members" value={totals.members} />
            <Metric label="Retirees" value={totals.retirees} />
            <Metric label="SQUAD" value={totals.squad} className="hidden sm:block" />
          </div>
        </div>
      </div>

      <div className="hidden border-b border-gray-100 bg-gray-50/70 px-5 py-2 text-xs font-medium uppercase text-gray-500 md:grid md:grid-cols-[minmax(16rem,1fr)_7rem_7rem_7rem_5rem] md:gap-3">
        <span>Team</span>
        <span>Members</span>
        <span>Retirees</span>
        <span>SQUAD</span>
        <span className="text-right">Action</span>
      </div>

      <div className="divide-y divide-gray-100">
        {teams.map((team, index) => (
          <div key={team.id ?? index} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(16rem,1fr)_7rem_7rem_7rem_5rem] md:items-center md:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <input
                type="color"
                value={team.color}
                onChange={(event) => updateTeam(index, { color: event.target.value })}
                className="h-9 w-9 shrink-0 cursor-pointer rounded border border-gray-200 bg-white p-1"
                aria-label={`${team.name} color`}
              />
              <label className="min-w-0 flex-1">
                <span className="sr-only">Team name</span>
                <input
                  type="text"
                  value={team.name}
                  onChange={(event) => updateTeam(index, { name: event.target.value })}
                  className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                />
              </label>
            </div>

            <NumberField label="Members" value={team.members} min={1} max={200} onChange={(value) => updateTeam(index, { members: value })} />
            <NumberField label="Retirees" value={team.retirees} min={0} max={asNumber(team.members)} onChange={(value) => updateTeam(index, { retirees: value })} />
            <NumberField label="SQUAD" value={team.squad} min={0} max={asNumber(team.members)} onChange={(value) => updateTeam(index, { squad: value })} />

            <button
              type="button"
              onClick={() => setTeams((current) => current.filter((_, i) => i !== index))}
              disabled={teams.length <= 1}
              className="h-10 rounded-md border border-gray-200 px-3 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 md:text-right"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-h-5 text-sm">
          {validationMessage && <span className="text-red-600">{validationMessage}</span>}
          {!validationMessage && error && <span className="text-red-600">{error.message}</span>}
          {!validationMessage && !error && result && (
            <span className="text-emerald-700">
              Seeded {result.teams} teams, {result.members} members, and {result.scenarios} scenarios.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={addTeam}
            className="h-10 rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Add Team
          </button>
          <button
            type="button"
            onClick={resetDraft}
            className="h-10 rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={!canSeed}
            className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending && activeAction === 'seed' ? 'Generating...' : 'Generate Data'}
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={!canSeed}
            className="h-10 rounded-md bg-gray-950 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending && activeAction === 'reset' ? 'Reseeding...' : 'Reset & Reseed'}
          </button>
        </div>
      </div>
    </section>
  );
}

function cloneDefaultTeams(): SeedTeamConfig[] {
  return DEFAULT_TEAMS.map((team) => ({ ...team }));
}

function loadStoredTeams(): SeedTeamConfig[] {
  if (typeof window === 'undefined') return cloneDefaultTeams();
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored ? parseStoredTeams(stored) ?? cloneDefaultTeams() : cloneDefaultTeams();
}

function parseStoredTeams(value: string): SeedTeamConfig[] | null {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed
      .filter((team): team is Record<string, unknown> => Boolean(team) && typeof team === 'object')
      .map((team, index) => {
        const name = typeof team.name === 'string' && team.name.trim() ? team.name : `Team ${index + 1}`;
        const members = clampDraftNumber(team.members, 1, 200);
        return {
          id: typeof team.id === 'string' && team.id ? team.id : `team-custom-${index + 1}`,
          key: typeof team.key === 'string' && team.key ? team.key : undefined,
          name,
          color: typeof team.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(team.color)
            ? team.color
            : PALETTE[index % PALETTE.length],
          members,
          retirees: clampDraftNumber(team.retirees, 0, members),
          squad: clampDraftNumber(team.squad, 0, members),
        };
      });
  } catch {
    return null;
  }
}

function clampDraftNumber(value: unknown, min: number, max: number): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value, 10)
      : Number.NaN;
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function Metric({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div className={`rounded-md border border-gray-200 bg-gray-50 px-3 py-2 ${className}`}>
      <p className="text-base font-semibold leading-none text-gray-950">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-gray-500 md:hidden">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(asNumber(event.target.value))}
        className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      />
    </label>
  );
}

function validateTeams(teams: SeedTeamConfig[]): string | null {
  if (teams.length === 0) return 'Add at least one team.';
  const names = new Set<string>();
  for (const team of teams) {
    const name = team.name.trim();
    const members = asNumber(team.members);
    const retirees = asNumber(team.retirees);
    const squad = asNumber(team.squad);
    if (!name) return 'Every team needs a name.';
    if (names.has(name.toLowerCase())) return `${name} is duplicated. Team names must be unique.`;
    if (members < 1) return `${name} needs at least one member.`;
    if (retirees > members) return `${name} retirees cannot exceed members.`;
    if (squad > members) return `${name} SQUAD members cannot exceed members.`;
    names.add(name.toLowerCase());
  }
  return null;
}

function asNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}
