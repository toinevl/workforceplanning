import { NextResponse } from 'next/server';
import { getAllTeams } from '@/lib/api/teams';

export async function GET() {
  const teams = await getAllTeams();
  return NextResponse.json({ data: teams });
}
