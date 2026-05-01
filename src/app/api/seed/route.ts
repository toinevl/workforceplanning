import { NextResponse } from 'next/server';
import { ensureTablesExist } from '@/lib/db/client';

export async function POST() {
  const { runSeed } = await import('@/lib/db/seed');
  await ensureTablesExist();
  const result = await runSeed();
  return NextResponse.json({ data: result });
}
