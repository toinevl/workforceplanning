import { NextResponse } from 'next/server';
import { ensureTablesExist } from '@/lib/db/client';
import { getScenarioList, createScenario } from '@/lib/api/scenarios';
import type { ScenarioType } from '@/lib/types/domain';
import type { ScenarioParams } from '@/lib/types/params';

export async function GET() {
  try {
    await ensureTablesExist();
    const scenarios = await getScenarioList();
    return NextResponse.json({ data: scenarios });
  } catch (err) {
    console.error('GET /api/scenarios', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTablesExist();
    const body = await req.json() as { type: ScenarioType; name: string; description?: string; parameters?: ScenarioParams };
    if (!body.type || !body.name) {
      return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
    }
    const scenario = await createScenario(body.type, body.name, body.description, body.parameters);
    return NextResponse.json({ data: scenario }, { status: 201 });
  } catch (err) {
    console.error('POST /api/scenarios', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
