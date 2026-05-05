import { getTableClient } from '../db/client';
import {
  TABLE_MEMBER_STATES,
  TABLE_STAFF,
  TABLE_TEAM_DRIVERS,
  REMOVED_SENTINEL,
  type MemberStateEntity,
  type StaffMemberEntity,
  type TeamDriverEntity,
} from '../db/tables';
import type { BusinessDriver } from '../types/domain';
import { createAuditEvent } from './audit';

export interface MovePayload {
  memberId: string;
  toTeamId: string | null; // null = remove from all teams
  scenarioId: string;
  note?: string;
}

export interface BulkMovePayload {
  scenarioId: string;
  moves: MovePayload[];
}

export async function applyMove(move: MovePayload): Promise<void> {
  const client = getTableClient(TABLE_MEMBER_STATES);
  const now = new Date().toISOString();
  const [existingState, member] = await Promise.all([
    client.getEntity<MemberStateEntity>(move.scenarioId, move.memberId).catch(() => null),
    getTableClient(TABLE_STAFF).getEntity<StaffMemberEntity>('member', move.memberId),
  ]);
  const fromTeamId = existingState?.teamId === REMOVED_SENTINEL
    ? null
    : existingState?.teamId ?? member.baseTeamId;
  const nextStatus = move.toTeamId === null
    ? 'removed'
    : move.toTeamId === member.baseTeamId
      ? 'active'
      : 'transferred';

  const entity: MemberStateEntity = {
    partitionKey: move.scenarioId,
    rowKey: move.memberId,
    teamId: move.toTeamId ?? REMOVED_SENTINEL,
    status: nextStatus,
    updatedAt: now,
  };

  await client.upsertEntity<MemberStateEntity>(entity, 'Merge');
  await createAuditEvent({
    scenarioId: move.scenarioId,
    eventType: move.toTeamId === null ? 'member_removed' : 'member_moved',
    note: move.note,
    memberId: move.memberId,
    fromTeamId,
    toTeamId: move.toTeamId,
    payload: {
      previousStatus: existingState?.status ?? 'active',
      nextStatus,
    },
  });
}

export async function applyBulkMoves(payload: BulkMovePayload): Promise<void> {
  await Promise.all(
    payload.moves.map(m => applyMove({ ...m, scenarioId: m.scenarioId ?? payload.scenarioId }))
  );
}

export async function setTeamDriver(
  scenarioId: string,
  teamId: string,
  driver: BusinessDriver,
  priorityScore?: number,
  targetFteDelta?: number,
  options?: { logAudit?: boolean },
): Promise<void> {
  const client = getTableClient(TABLE_TEAM_DRIVERS);
  const previous = await client.getEntity<TeamDriverEntity>(scenarioId, teamId).catch(() => null);
  const entity: TeamDriverEntity = {
    partitionKey: scenarioId,
    rowKey: teamId,
    driver,
    priorityScore,
    targetFteDelta,
    updatedAt: new Date().toISOString(),
  };
  await client.upsertEntity<TeamDriverEntity>(entity, 'Merge');
  if (options?.logAudit !== false) {
    await createAuditEvent({
      scenarioId,
      eventType: 'team_driver_updated',
      payload: {
        teamId,
        previousDriver: previous?.driver,
        driver,
        previousPriorityScore: previous?.priorityScore,
        priorityScore,
        previousTargetFteDelta: previous?.targetFteDelta,
        targetFteDelta,
      },
    });
  }
}

export async function applyMemberStates(
  scenarioId: string,
  states: Array<{ memberId: string; teamId: string | null; status?: string; businessDriver?: BusinessDriver }>
): Promise<void> {
  const client = getTableClient(TABLE_MEMBER_STATES);
  const now = new Date().toISOString();

  await Promise.all(
    states.map(s =>
      client.upsertEntity<MemberStateEntity>({
        partitionKey: scenarioId,
        rowKey: s.memberId,
        teamId: s.teamId ?? REMOVED_SENTINEL,
        status: s.status ?? (s.teamId === null ? 'removed' : 'active'),
        businessDriver: s.businessDriver,
        updatedAt: now,
      }, 'Merge')
    )
  );
}
