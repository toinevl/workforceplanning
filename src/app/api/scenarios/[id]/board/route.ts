import { NextResponse } from 'next/server';
import { getScenarioBoardState } from '@/lib/api/scenarios';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await getScenarioBoardState(id);
  if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: board });
}
