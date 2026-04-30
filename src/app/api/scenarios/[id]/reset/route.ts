import { NextResponse } from 'next/server';
import { resetScenario } from '@/lib/api/scenarios';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await resetScenario(id);
  return NextResponse.json({ data: { success: true } });
}
