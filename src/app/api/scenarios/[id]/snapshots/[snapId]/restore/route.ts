import { NextResponse } from 'next/server';
import { restoreSnapshot } from '@/lib/api/snapshots';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; snapId: string }> }) {
  const { id, snapId } = await params;
  await restoreSnapshot(id, snapId);
  return NextResponse.json({ data: { success: true } });
}
