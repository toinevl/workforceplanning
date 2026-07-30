import { NextResponse } from 'next/server';
import { getScenarioBoardState } from '@/lib/api/scenarios';
import { analyzeBoard } from '@/lib/skills/analysis';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const board = await getScenarioBoardState(id);

  if (!board) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  const analysis = analyzeBoard(board.teams);
  return NextResponse.json({ data: analysis });
}
