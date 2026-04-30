import { NextResponse } from 'next/server';
import { getScenario, updateScenario, deleteScenario } from '@/lib/api/scenarios';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenario = await getScenario(id);
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: scenario });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = await updateScenario(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteScenario(id);
  return NextResponse.json({ data: { success: true } });
}
