import type { StaffMember, Team, TeamSnapshot } from '../types/domain';
import type { RetirementWaveParams } from '../types/params';
import { computeRetirementRisk, isWithinHorizon, type RetirementRisk } from '../utils/retirement';

export interface RetirementWaveAnalysis {
  byTier: {
    immediate: RetirementRisk[];   // eligible this year or already eligible
    near: RetirementRisk[];        // 2–3 years
    medium: RetirementRisk[];      // 4–5 years
    low: RetirementRisk[];         // >5 years
  };
  withinHorizon: RetirementRisk[];
  teamRisk: Array<{
    teamId: string;
    teamName: string;
    membersAtRisk: number;
    fteAtRisk: number;
    riskScore: number; // 0–100
  }>;
  totalFteAtRisk: number;
}

export function analyzeRetirementWave(
  allMembers: StaffMember[],
  teams: Team[],
  teamSnapshots: TeamSnapshot[],
  params: RetirementWaveParams
): RetirementWaveAnalysis {
  const risks = allMembers.map(m => computeRetirementRisk(m, params));

  const byTier = {
    immediate: risks.filter(r => r.riskTier === 'immediate'),
    near: risks.filter(r => r.riskTier === 'near'),
    medium: risks.filter(r => r.riskTier === 'medium'),
    low: risks.filter(r => r.riskTier === 'low'),
  };

  const withinHorizon = risks.filter(r => isWithinHorizon(r, params.horizonYears));
  const withinHorizonIds = new Set(withinHorizon.map(r => r.memberId));

  const teamRisk = teamSnapshots.map(ts => {
    const atRisk = ts.members.filter(m => withinHorizonIds.has(m.id));
    const fteAtRisk = atRisk.reduce((sum, m) => sum + m.fte, 0);
    const riskScore = ts.headcount > 0
      ? Math.round((atRisk.length / ts.headcount) * 100)
      : 0;
    return {
      teamId: ts.team.id,
      teamName: ts.team.name,
      membersAtRisk: atRisk.length,
      fteAtRisk: Math.round(fteAtRisk * 10) / 10,
      riskScore,
    };
  });

  const totalFteAtRisk = allMembers
    .filter(m => withinHorizonIds.has(m.id))
    .reduce((sum, m) => sum + m.fte, 0);

  // teams param available for future use (e.g., team-level metadata lookups)
  void teams;

  return { byTier, withinHorizon, teamRisk, totalFteAtRisk: Math.round(totalFteAtRisk * 10) / 10 };
}

/**
 * Retirement wave does NOT auto-remove members.
 * It returns member states only if autoFlagEligible is true
 * (adds a businessDriver tag of 'neutral' with a note — purely informational).
 * Managers decide manually who to remove.
 */
export function computeRetirementWaveStates(
  allMembers: StaffMember[],
  params: RetirementWaveParams
): Array<{ memberId: string; teamId: string; status: 'active' }> {
  // No automatic removals for retirement wave — just flag via analysis
  // Return empty array: board state = baseline (no changes)
  void allMembers;
  void params;
  return [];
}
