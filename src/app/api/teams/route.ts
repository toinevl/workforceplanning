import { NextResponse } from 'next/server';
import { getAllTeams } from '@/lib/api/teams';
import { getAllMembers } from '@/lib/api/members';
import { coverageForTeam } from '@/lib/skills/roles';

export async function GET(req: Request) {
  const teams = await getAllTeams();

  // Support optional departmentId query filter
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  if (departmentId) {
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
      const coverage = coverageForTeam(
        teamMembers.map((m) => ({ role: m.role, skills: m.tags })),
        team.name,
        team.id
      );
      return {
        ...team,
        headcount: teamMembers.length,
        totalFte,
        skills: coverage,
      };
    });
    return NextResponse.json({ data: teamsWithStats });
  }

  return NextResponse.json({ data: teams });
}
