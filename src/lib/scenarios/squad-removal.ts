import type { StaffMember } from '../types/domain';
import type { SquadRemovalParams } from '../types/params';

export interface SquadRemovalResult {
  toRemove: Array<{ memberId: string; name: string; teamId: null; status: 'removed' }>;
  squadMembersFound: StaffMember[];
  notRemovedSquad: StaffMember[]; // SQUAD members the manager chose to keep
}

/**
 * Determines which members to remove based on the SQUAD removal params.
 * Only removes members explicitly listed in params.membersToRemove.
 * If the list is empty (initial default), auto-selects ALL squad members.
 */
export function computeSquadRemoval(
  allMembers: StaffMember[],
  params: SquadRemovalParams
): SquadRemovalResult {
  const squadMembers = allMembers.filter(m => m.isSquad);

  // If no explicit list, default to removing all squad members
  const targetIds = params.membersToRemove.length > 0
    ? new Set(params.membersToRemove)
    : new Set(squadMembers.map(m => m.id));

  const toRemove = squadMembers
    .filter(m => targetIds.has(m.id))
    .map(m => ({ memberId: m.id, name: m.name, teamId: null as null, status: 'removed' as const }));

  const notRemovedSquad = squadMembers.filter(m => !targetIds.has(m.id));

  return { toRemove, squadMembersFound: squadMembers, notRemovedSquad };
}

/**
 * Returns ScenarioMemberState entries to write to Azure Tables.
 */
export function applySquadRemoval(
  allMembers: StaffMember[],
  params: SquadRemovalParams
): Array<{ memberId: string; teamId: null; status: 'removed' }> {
  const { toRemove } = computeSquadRemoval(allMembers, params);
  return toRemove.map(r => ({ memberId: r.memberId, teamId: null, status: 'removed' as const }));
}
