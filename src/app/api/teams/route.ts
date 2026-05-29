import { NextResponse } from 'next/server';
import { getAllTeams } from '@/lib/api/teams';
import { getAllMembers } from '@/lib/api/members';

export async function GET(req: Request) {
  const teams = await getAllTeams();

  // Support optional departmentId query filter
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  if (departmentId) {
    // Filter teams by departmentId (teams with matching departmentId field)
    const filtered = teams.filter((t) => t.departmentId === departmentId);
    const members = await getAllMembers();
    const membersByTeam = new Map<string, typeof members>();
    for (const member of members) {
      const teamMembers = membersByTeam.get(member.baseTeamId) ?? [];
      teamMembers.push(member);
      membersByTeam.set(member.baseTeamId, teamMembers);
    }
    const teamsWithStats = filtered.map((team) => {
      const teamMembers = membersByTeam.get(team.id) ?? [];
      const totalFte = teamMembers.reduce((sum, member) => sum + member.fte, 0);
      return {
        ...team,
        headcount: teamMembers.length,
        totalFte,
      };
    });
    return NextResponse.json({ data: teamsWithStats });
  }

  return NextResponse.json({ data: teams });
}
