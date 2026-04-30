import { NextResponse } from 'next/server';
import { reapplyScenarioLogic } from '@/lib/scenarios/index';
import { getScenarioBoardState } from '@/lib/api/scenarios';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await reapplyScenarioLogic(id);
    const board = await getScenarioBoardState(id);
    return NextResponse.json({ data: board });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
