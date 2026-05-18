import { NextResponse } from 'next/server';
import { getAllTeams } from '@/lib/api/teams';

export async function GET(req: Request) {
  const teams = await getAllTeams();

  // Support optional departmentId query filter
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  if (departmentId) {
    // Filter teams by departmentId (teams with matching departmentId field)
    const filtered = teams.filter((t) => t.departmentId === departmentId);
    return NextResponse.json({ data: filtered });
  }

  return NextResponse.json({ data: teams });
}
