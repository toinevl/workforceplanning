import type { StaffMember, Team, BusinessDriver, TeamSnapshot } from '../types/domain';
import type { BusinessDriverParams } from '../types/params';

export interface SuggestedMove {
  memberId: string;
  memberName: string;
  fromTeamId: string;
  fromTeamName: string;
  toTeamId: string;
  toTeamName: string;
  reason: string;
  fte: number;
}

export interface BusinessDriverAnalysis {
  teamsByDriver: Record<BusinessDriver, TeamSnapshot[]>;
  suggestedMoves: SuggestedMove[];
  netFteByDriver: Record<BusinessDriver, number>;
  fteDeltaVsTarget: Record<string, number>; // teamId → delta vs targetFteDelta
}

export function analyzeBusinessDrivers(
  teams: Team[],
  teamSnapshots: TeamSnapshot[],
  params: BusinessDriverParams
): BusinessDriverAnalysis {
  // teams param available for future use
  void teams;

  const teamsByDriver: Record<BusinessDriver, TeamSnapshot[]> = {
    grow: [], contain: [], slim: [], neutral: [],
  };

  for (const ts of teamSnapshots) {
    const driver = (params.teamDrivers[ts.team.id] ?? 'neutral') as BusinessDriver;
    teamsByDriver[driver].push(ts);
  }

  // Generate suggested moves: transfer from slim teams to grow teams
  // Sort slim teams by priority (higher score = offer members first)
  // Sort grow teams by priority (higher score = receive members first)
  const slimTeams = [...teamsByDriver.slim].sort(
    (a, b) => (params.teamPriorityScore[b.team.id] ?? 1) - (params.teamPriorityScore[a.team.id] ?? 1)
  );
  const growTeams = [...teamsByDriver.grow].sort(
    (a, b) => (params.teamPriorityScore[b.team.id] ?? 1) - (params.teamPriorityScore[a.team.id] ?? 1)
  );

  const suggestedMoves: SuggestedMove[] = [];

  for (const slimTs of slimTeams) {
    const targetDelta = params.targetFteDelta.slim ?? -2;
    const targetFte = slimTs.totalFte + targetDelta; // target is current + negative delta
    let currentFte = slimTs.totalFte;

    // Find non-SQUAD members sorted by lowest FTE first (prefer part-timers for transfer)
    const candidates = [...slimTs.members]
      .filter(m => !m.isSquad)
      .sort((a, b) => a.fte - b.fte);

    for (const candidate of candidates) {
      if (currentFte <= targetFte) break;
      if (growTeams.length === 0) break;

      const targetTeam = growTeams[0]; // pick highest-priority grow team
      suggestedMoves.push({
        memberId: candidate.id,
        memberName: candidate.name,
        fromTeamId: slimTs.team.id,
        fromTeamName: slimTs.team.name,
        toTeamId: targetTeam.team.id,
        toTeamName: targetTeam.team.name,
        reason: `Transfer from slim team "${slimTs.team.name}" to grow team "${targetTeam.team.name}"`,
        fte: candidate.fte,
      });
      currentFte -= candidate.fte;
    }
  }

  const netFteByDriver: Record<BusinessDriver, number> = {
    grow: teamsByDriver.grow.reduce((s, t) => s + t.totalFte, 0),
    contain: teamsByDriver.contain.reduce((s, t) => s + t.totalFte, 0),
    slim: teamsByDriver.slim.reduce((s, t) => s + t.totalFte, 0),
    neutral: teamsByDriver.neutral.reduce((s, t) => s + t.totalFte, 0),
  };

  const fteDeltaVsTarget: Record<string, number> = {};
  for (const ts of teamSnapshots) {
    const driver = (params.teamDrivers[ts.team.id] ?? 'neutral') as BusinessDriver;
    const target = params.targetFteDelta[driver] ?? 0;
    fteDeltaVsTarget[ts.team.id] = Math.round((ts.totalFte - (ts.totalFte - target)) * 10) / 10;
  }

  return { teamsByDriver, suggestedMoves, netFteByDriver, fteDeltaVsTarget };
}

/**
 * Apply business drivers — writes team driver assignments.
 * Returns team driver entries to persist (not member state changes — those are suggestions only).
 */
export function computeBusinessDriverStates(
  teams: Team[],
  params: BusinessDriverParams
): Array<{ teamId: string; driver: BusinessDriver; priorityScore?: number; targetFteDelta?: number }> {
  return teams.map(team => ({
    teamId: team.id,
    driver: (params.teamDrivers[team.id] ?? 'neutral') as BusinessDriver,
    priorityScore: params.teamPriorityScore[team.id],
    targetFteDelta: params.targetFteDelta[params.teamDrivers[team.id] ?? 'neutral'],
  }));
}
