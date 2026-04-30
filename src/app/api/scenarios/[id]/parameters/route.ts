import { NextResponse } from 'next/server';
import { getScenario, updateScenario } from '@/lib/api/scenarios';
import type { ScenarioParams } from '@/lib/types/params';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenario = await getScenario(id);
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: JSON.parse(scenario.parameters) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as ScenarioParams;
  const updated = await updateScenario(id, { parameters: JSON.stringify(body) });
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: JSON.parse(updated.parameters) });
}
