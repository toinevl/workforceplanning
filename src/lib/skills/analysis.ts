import { roleProfileCoverageForTeam, getRoleProfile } from '@/lib/skills/roles';
import type { TeamSnapshot } from '@/lib/types/domain';

export interface SkillGapSuggestion {
  skill: string;
  gap: number;
  affectedTeams: string[];
  severity: 'critical' | 'moderate' | 'low';
}

export interface MoveSuggestion {
  memberId: string;
  memberName: string;
  fromTeamId: string;
  fromTeamName: string;
  toTeamId: string;
  toTeamName: string;
  reason: string;
  fte: number;
  skillsGained: string[];
}

export interface ScenarioAnalysis {
  totalGap: number;
  criticalGaps: SkillGapSuggestion[];
  suggestions: MoveSuggestion[];
  surplusTeams: Array<{ teamId: string; teamName: string; surplusSkills: string[] }>;
  deficitTeams: Array<{ teamId: string; teamName: string; deficitSkills: string[] }>;
  summary: string;
}

/**
 * Analyze the current board state and generate AI-assisted suggestions
 * for rebalancing teams based on skill gaps and surpluses.
 *
 * This is the engine behind #38: AI-assisted scenario generation.
 * It identifies teams with skill surpluses and teams with skill deficits,
 * then suggests member moves that would improve coverage.
 */
export function analyzeBoard(teams: TeamSnapshot[]): ScenarioAnalysis {
  const teamCoverages = teams.map((ts) => ({
    teamSnapshot: ts,
    coverage: roleProfileCoverageForTeam(
      ts.members.map((m) => ({ role: m.role, skills: m.tags })),
      ts.team.name,
      ts.team.id
    ),
  }));

  // Identify surplus and deficit skills across the org
  const surplusTeams: ScenarioAnalysis['surplusTeams'] = [];
  const deficitTeams: ScenarioAnalysis['deficitTeams'] = [];

  for (const { teamSnapshot, coverage } of teamCoverages) {
    const surplus: string[] = [];
    const deficit: string[] = [];
    for (const [skill, gap] of Object.entries(coverage.gapSkills)) {
      if (gap < -0.5) surplus.push(skill);
      if (gap > 0.5) deficit.push(skill);
    }
    if (surplus.length > 0) {
      surplusTeams.push({ teamId: teamSnapshot.team.id, teamName: teamSnapshot.team.name, surplusSkills: surplus });
    }
    if (deficit.length > 0) {
      deficitTeams.push({ teamId: teamSnapshot.team.id, teamName: teamSnapshot.team.name, deficitSkills: deficit });
    }
  }

  // Aggregate critical gaps
  const allGaps = new Map<string, { totalGap: number; teams: Set<string> }>();
  for (const { coverage } of teamCoverages) {
    for (const [skill, gap] of Object.entries(coverage.gapSkills)) {
      if (gap > 0) {
        const existing = allGaps.get(skill) ?? { totalGap: 0, teams: new Set() };
        existing.totalGap += gap;
        existing.teams.add('');
        allGaps.set(skill, existing);
      }
    }
  }

  const criticalGaps: SkillGapSuggestion[] = Array.from(allGaps.entries())
    .map(([skill, { totalGap, teams }]) => ({
      skill,
      gap: totalGap,
      affectedTeams: Array.from(teams),
      severity: totalGap > 4 ? 'critical' as const : totalGap > 2 ? 'moderate' as const : 'low' as const,
    }))
    .sort((a, b) => b.gap - a.gap);

  // Generate move suggestions: find members in surplus teams whose skills
  // match deficits in other teams
  const suggestions: MoveSuggestion[] = [];
  const deficitSkillMap = new Map<string, string[]>();
  for (const dt of deficitTeams) {
    for (const skill of dt.deficitSkills) {
      const arr = deficitSkillMap.get(skill) ?? [];
      arr.push(dt.teamId);
      deficitSkillMap.set(skill, arr);
    }
  }

  for (const { teamSnapshot } of teamCoverages) {
    const surplusTeam = surplusTeams.find((st) => st.teamId === teamSnapshot.team.id);
    if (!surplusTeam) continue;

    for (const member of teamSnapshot.members) {
      const memberSkills = member.tags ?? [];
      const roleSkills = Object.keys(getRoleProfile(member.role));

      // Check if this member's skills would help a deficit team
      for (const skill of [...memberSkills, ...roleSkills]) {
        const targetTeamIds = deficitSkillMap.get(skill);
        if (!targetTeamIds) continue;

        for (const targetTeamId of targetTeamIds) {
          if (targetTeamId === teamSnapshot.team.id) continue;
          const targetTs = teams.find((t) => t.team.id === targetTeamId);
          if (!targetTs) continue;

          const skillsGained = (member.tags ?? []).filter((s) =>
            deficitTeams.find((dt) => dt.teamId === targetTeamId)?.deficitSkills.includes(s)
          );

          if (skillsGained.length > 0 || roleSkills.includes(skill)) {
            suggestions.push({
              memberId: member.id,
              memberName: member.name,
              fromTeamId: teamSnapshot.team.id,
              fromTeamName: teamSnapshot.team.name,
              toTeamId: targetTeamId,
              toTeamName: targetTs.team.name,
              reason: `${member.role} with ${skill} skill — ${targetTs.team.name} has a deficit`,
              fte: member.fte,
              skillsGained: skillsGained.length > 0 ? skillsGained : [skill],
            });
          }
        }
        break; // Only suggest one move per member
      }
    }
  }

  // Deduplicate: one suggestion per member
  const seenMembers = new Set<string>();
  const uniqueSuggestions = suggestions.filter((s) => {
    if (seenMembers.has(s.memberId)) return false;
    seenMembers.add(s.memberId);
    return true;
  }).slice(0, 10);

  const totalGap = criticalGaps.reduce((sum, g) => sum + g.gap, 0);
  const summary = uniqueSuggestions.length > 0
    ? `${uniqueSuggestions.length} move suggestion(s) could address ${criticalGaps.filter(g => g.severity !== 'low').length} critical skill gap(s). Total skill deficit: ${totalGap.toFixed(0)} across ${deficitTeams.length} team(s).`
    : `No move suggestions. ${criticalGaps.length} skill gap(s) identified across ${deficitTeams.length} team(s). Consider hiring or training.`;

  return {
    totalGap,
    criticalGaps,
    suggestions: uniqueSuggestions,
    surplusTeams,
    deficitTeams,
    summary,
  };
}
