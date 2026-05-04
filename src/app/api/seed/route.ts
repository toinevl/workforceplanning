import { NextRequest, NextResponse } from 'next/server';
import { ensureTablesExist } from '@/lib/db/client';
import type { SeedOptions, SeedTeamConfig } from '@/lib/types/seed';

const MAX_TEAMS = 24;
const MAX_MEMBERS_PER_TEAM = 200;

export async function POST(request: NextRequest) {
  const { runSeed } = await import('@/lib/db/seed');
  const body = await request.json().catch(() => ({}));
  const membersPerTeamRaw = body?.membersPerTeam ?? process.env.SEED_MEMBERS_PER_TEAM;
  const membersPerTeam = Number.parseInt(String(membersPerTeamRaw), 10);
  const parsed = parseSeedTeams(body?.teams);

  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await ensureTablesExist();
  const options: SeedOptions = {
    membersPerTeam: Number.isFinite(membersPerTeam) && membersPerTeam > 0 ? membersPerTeam : undefined,
    resetFirst: body?.resetFirst === true || parsed.teams !== undefined,
    teams: parsed.teams,
  };
  const result = await runSeed(options);
  return NextResponse.json({ data: result });
}

function parseSeedTeams(value: unknown): { teams?: SeedTeamConfig[] } | { error: string } {
  if (value === undefined) return {};
  if (!Array.isArray(value)) return { error: 'teams must be an array' };
  if (value.length === 0) return { error: 'At least one team is required' };
  if (value.length > MAX_TEAMS) return { error: `A maximum of ${MAX_TEAMS} teams can be seeded at once` };

  const teams: SeedTeamConfig[] = [];
  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== 'object') return { error: `Team ${index + 1} is invalid` };
    const team = raw as Record<string, unknown>;
    const name = String(team.name ?? '').trim();
    const color = String(team.color ?? '');
    const members = toWholeNumber(team.members);
    const retirees = toWholeNumber(team.retirees);
    const squad = toWholeNumber(team.squad);

    if (!name) return { error: `Team ${index + 1} needs a name` };
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: `${name} needs a valid hex color` };
    if (members < 1 || members > MAX_MEMBERS_PER_TEAM) {
      return { error: `${name} members must be between 1 and ${MAX_MEMBERS_PER_TEAM}` };
    }
    if (retirees < 0 || retirees > members) return { error: `${name} retirees cannot exceed members` };
    if (squad < 0 || squad > members) return { error: `${name} SQUAD members cannot exceed members` };

    teams.push({
      id: typeof team.id === 'string' && team.id ? team.id : undefined,
      key: typeof team.key === 'string' && team.key ? team.key : undefined,
      name,
      color,
      members,
      retirees,
      squad,
    });
  }

  return { teams };
}

function toWholeNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : Number.NaN;
  if (typeof value === 'string' && value.trim()) return Number.parseInt(value, 10);
  return Number.NaN;
}
