import { NextResponse } from 'next/server';
import { listSnapshots, saveSnapshot } from '@/lib/api/snapshots';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshots = await listSnapshots(id);
  return NextResponse.json({ data: snapshots });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { label } = await req.json() as { label: string };
  if (!label?.trim()) return NextResponse.json({ error: 'label is required' }, { status: 400 });
  const snapshot = await saveSnapshot(id, label.trim());
  return NextResponse.json({ data: snapshot }, { status: 201 });
}
