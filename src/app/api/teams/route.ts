import { NextResponse } from 'next/server';
import { getAllTeams } from '@/lib/api/teams';
import { getAllMembers } from '@/lib/api/members';
import { getDepartmentById } from '@/lib/api/departments';
import { resolveTeamSkills, coverageForTeam } from '@/lib/skills/departmentSkills';

export async function GET(req: Request) {
  const teams = await getAllTeams();

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  if (departmentId) {
    const filtered = teams.filter((t) => t.departmentId === departmentId);
    const [members, department] = await Promise.all([getAllMembers(), getDepartmentById(departmentId)]);
    const membersByTeam = new Map<string, typeof members>();
    for (const member of members) {
      const teamMembers = membersByTeam.get(member.baseTeamId) ?? [];
      teamMembers.push(member);
      membersByTeam.set(member.baseTeamId, teamMembers);
    }
    const teamsWithStats = filtered.map((team) => {
      const teamMembers = membersByTeam.get(team.id) ?? [];
      const totalFte = teamMembers.reduce((sum, member) => sum + member.fte, 0);
      const resolvedSkills = department ? resolveTeamSkills(department, team) : [];
      const skills = coverageForTeam(resolvedSkills, teamMembers);
      return {
        ...team,
        headcount: teamMembers.length,
        totalFte,
        skills,
      };
    });
    return NextResponse.json({ data: teamsWithStats });
  }

  return NextResponse.json({ data: teams });
}
