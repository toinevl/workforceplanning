import { NextResponse } from 'next/server';
import { ensureTablesExist } from '@/lib/db/client';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed endpoint disabled in production' }, { status: 403 });
  }

  // Dynamic import to avoid loading seed data in production bundle
  const { runSeed } = await import('@/lib/db/seed');
  await ensureTablesExist();
  const result = await runSeed();
  return NextResponse.json({ data: result });
}
