import { getTableClient } from '../db/client';
import { TABLE_MEMBER_STATES, TABLE_TEAM_DRIVERS, REMOVED_SENTINEL, type MemberStateEntity, type TeamDriverEntity } from '../db/tables';
import type { BusinessDriver } from '../types/domain';

export interface MovePayload {
  memberId: string;
  toTeamId: string | null; // null = remove from all teams
  scenarioId: string;
}

export interface BulkMovePayload {
  scenarioId: string;
  moves: MovePayload[];
}

export async function applyMove(move: MovePayload): Promise<void> {
  const client = getTableClient(TABLE_MEMBER_STATES);
  const now = new Date().toISOString();

  const entity: MemberStateEntity = {
    partitionKey: move.scenarioId,
    rowKey: move.memberId,
    teamId: move.toTeamId ?? REMOVED_SENTINEL,
    status: move.toTeamId === null ? 'removed' : 'transferred',
    updatedAt: now,
  };

  await client.upsertEntity<MemberStateEntity>(entity, 'Merge');
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
): Promise<void> {
  const client = getTableClient(TABLE_TEAM_DRIVERS);
  const entity: TeamDriverEntity = {
    partitionKey: scenarioId,
    rowKey: teamId,
    driver,
    priorityScore,
    targetFteDelta,
    updatedAt: new Date().toISOString(),
  };
  await client.upsertEntity<TeamDriverEntity>(entity, 'Merge');
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
