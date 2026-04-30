import { getAllMembers } from '../api/members';
import { getAllTeams } from '../api/teams';
import { getScenario } from '../api/scenarios';
import { applyMemberStates, setTeamDriver } from '../api/assignments';
import { applySquadRemoval } from './squad-removal';
import { computeRetirementWaveStates } from './retirement-wave';
import { computeBusinessDriverStates } from './business-drivers';
import type { SquadRemovalParams, RetirementWaveParams, BusinessDriverParams } from '../types/params';

/**
 * Re-applies the scenario's default logic based on current parameters.
 * Clears existing member states and team drivers, then writes the computed ones.
 * Does NOT clear manually-applied changes — use resetScenario first if you want a full reset.
 */
export async function reapplyScenarioLogic(scenarioId: string): Promise<void> {
  const scenario = await getScenario(scenarioId);
  if (!scenario) throw new Error('Scenario not found');

  const params = JSON.parse(scenario.parameters);
  const [allMembers, allTeams] = await Promise.all([getAllMembers(), getAllTeams()]);

  if (scenario.type === 'squad_removal') {
    const states = applySquadRemoval(allMembers, params as SquadRemovalParams);
    await applyMemberStates(
      scenarioId,
      states.map(s => ({ memberId: s.memberId, teamId: s.teamId, status: s.status }))
    );
  } else if (scenario.type === 'retirement_wave') {
    const states = computeRetirementWaveStates(allMembers, params as RetirementWaveParams);
    if (states.length > 0) {
      await applyMemberStates(scenarioId, states.map(s => ({ memberId: s.memberId, teamId: s.teamId, status: s.status })));
    }
  } else if (scenario.type === 'business_drivers') {
    const driverStates = computeBusinessDriverStates(allTeams, params as BusinessDriverParams);
    await Promise.all(
      driverStates.map(d => setTeamDriver(scenarioId, d.teamId, d.driver, d.priorityScore, d.targetFteDelta))
    );
  }
}

export { computeSquadRemoval } from './squad-removal';
export { analyzeRetirementWave } from './retirement-wave';
export { analyzeBusinessDrivers } from './business-drivers';
export { computeRetirementRisk } from '../utils/retirement';
