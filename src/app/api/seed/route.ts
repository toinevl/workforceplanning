import { NextRequest, NextResponse } from 'next/server';
import { ensureTablesExist } from '@/lib/db/client';

export async function POST(request: NextRequest) {
  const { runSeed } = await import('@/lib/db/seed');
  const body = await request.json().catch(() => ({}));
  const membersPerTeamRaw = body?.membersPerTeam ?? process.env.SEED_MEMBERS_PER_TEAM;
  const membersPerTeam = Number.parseInt(String(membersPerTeamRaw), 10);
  await ensureTablesExist();
  const result = await runSeed({
    membersPerTeam: Number.isFinite(membersPerTeam) && membersPerTeam > 0 ? membersPerTeam : undefined,
    resetFirst: body?.resetFirst === true,
  });
  return NextResponse.json({ data: result });
}
