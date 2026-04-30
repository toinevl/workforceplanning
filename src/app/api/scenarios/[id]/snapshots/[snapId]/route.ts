import { NextResponse } from 'next/server';
import { getSnapshot, deleteSnapshot } from '@/lib/api/snapshots';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; snapId: string }> }) {
  const { id, snapId } = await params;
  const snapshot = await getSnapshot(id, snapId);
  if (!snapshot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: snapshot });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; snapId: string }> }) {
  const { id, snapId } = await params;
  await deleteSnapshot(id, snapId);
  return NextResponse.json({ data: { success: true } });
}
