import { v4 as uuidv4 } from 'uuid';
import { getTableClient } from '../db/client';
import { TABLE_SNAPSHOTS, TABLE_MEMBER_STATES, TABLE_TEAM_DRIVERS, REMOVED_SENTINEL, type SnapshotEntity, type MemberStateEntity, type TeamDriverEntity } from '../db/tables';
import type { ScenarioSnapshot, SnapshotSummary } from '../types/snapshot';
import { getScenarioBoardState, getScenario, updateScenario } from './scenarios';
import type { ScenarioParams } from '../types/params';

function entityToSummary(e: SnapshotEntity): SnapshotSummary {
  return {
    id: e.rowKey,
    scenarioId: e.partitionKey,
    label: e.label,
    createdAt: e.createdAt,
    headcount: e.headcount,
    totalFte: e.totalFte,
    removedCount: e.removedCount,
  };
}

export async function listSnapshots(scenarioId: string): Promise<SnapshotSummary[]> {
  const client = getTableClient(TABLE_SNAPSHOTS);
  const snapshots: SnapshotSummary[] = [];
  for await (const e of client.listEntities<SnapshotEntity>({ queryOptions: { filter: `PartitionKey eq '${scenarioId}'` } })) {
    snapshots.push(entityToSummary(e as SnapshotEntity));
  }
  return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveSnapshot(scenarioId: string, label: string): Promise<SnapshotSummary> {
  const boardState = await getScenarioBoardState(scenarioId);
  if (!boardState) throw new Error('Scenario not found');

  const scenario = await getScenario(scenarioId);
  if (!scenario) throw new Error('Scenario not found');

  const snapshotId = uuidv4();
  const now = new Date().toISOString();
  const params = JSON.parse(scenario.parameters) as ScenarioParams;

  const entity: SnapshotEntity = {
    partitionKey: scenarioId,
    rowKey: snapshotId,
    label,
    parametersJson: JSON.stringify(params),
    boardStateJson: JSON.stringify(boardState),
    headcount: boardState.totalHeadcount,
    totalFte: boardState.totalFte,
    removedCount: boardState.removedMembers.length,
    createdAt: now,
  };

  const client = getTableClient(TABLE_SNAPSHOTS);
  await client.upsertEntity<SnapshotEntity>(entity, 'Replace');

  return {
    id: snapshotId,
    scenarioId,
    label,
    createdAt: now,
    headcount: boardState.totalHeadcount,
    totalFte: boardState.totalFte,
    removedCount: boardState.removedMembers.length,
  };
}

export async function getSnapshot(scenarioId: string, snapshotId: string): Promise<ScenarioSnapshot | null> {
  try {
    const client = getTableClient(TABLE_SNAPSHOTS);
    const entity = await client.getEntity<SnapshotEntity>(scenarioId, snapshotId);
    const e = entity as SnapshotEntity;
    return {
      id: e.rowKey,
      scenarioId: e.partitionKey,
      label: e.label,
      parameters: JSON.parse(e.parametersJson),
      boardState: JSON.parse(e.boardStateJson),
      createdAt: e.createdAt,
    };
  } catch {
    return null;
  }
}

export async function restoreSnapshot(scenarioId: string, snapshotId: string): Promise<void> {
  const snapshot = await getSnapshot(scenarioId, snapshotId);
  if (!snapshot) throw new Error('Snapshot not found');

  const stateClient = getTableClient(TABLE_MEMBER_STATES);
  const driverClient = getTableClient(TABLE_TEAM_DRIVERS);

  // Clear current member states
  const toDelete: Array<{ partitionKey: string; rowKey: string }> = [];
  for await (const e of stateClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${scenarioId}'` } })) {
    toDelete.push({ partitionKey: e.partitionKey as string, rowKey: e.rowKey as string });
  }
  await Promise.all(toDelete.map(e => stateClient.deleteEntity(e.partitionKey, e.rowKey).catch(() => {})));

  // Clear current team drivers
  const driverToDelete: Array<{ partitionKey: string; rowKey: string }> = [];
  for await (const e of driverClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${scenarioId}'` } })) {
    driverToDelete.push({ partitionKey: e.partitionKey as string, rowKey: e.rowKey as string });
  }
  await Promise.all(driverToDelete.map(e => driverClient.deleteEntity(e.partitionKey, e.rowKey).catch(() => {})));

  // Restore member states from snapshot board state
  const now = new Date().toISOString();
  const boardState = snapshot.boardState;

  const stateWrites = boardState.teams.flatMap(ts =>
    ts.members
      .filter(m => m.scenarioState && m.scenarioState.teamId !== m.baseTeamId)
      .map(m => stateClient.upsertEntity<MemberStateEntity>({
        partitionKey: scenarioId,
        rowKey: m.id,
        teamId: ts.team.id,
        status: m.scenarioState?.status ?? 'active',
        businessDriver: m.scenarioState?.businessDriver,
        updatedAt: now,
      }, 'Replace'))
  );

  const removedWrites = boardState.removedMembers.map(m =>
    stateClient.upsertEntity<MemberStateEntity>({
      partitionKey: scenarioId,
      rowKey: m.id,
      teamId: REMOVED_SENTINEL,
      status: 'removed',
      updatedAt: now,
    }, 'Replace')
  );

  const driverWrites = boardState.teams
    .filter(ts => ts.driver)
    .map(ts => driverClient.upsertEntity<TeamDriverEntity>({
      partitionKey: scenarioId,
      rowKey: ts.team.id,
      driver: ts.driver!,
      priorityScore: ts.priorityScore,
      targetFteDelta: ts.targetFteDelta,
      updatedAt: now,
    }, 'Replace'));

  await Promise.all([...stateWrites, ...removedWrites, ...driverWrites]);

  // Update scenario parameters to the snapshot's parameters
  await updateScenario(scenarioId, { parameters: JSON.stringify(snapshot.parameters) });
}

export async function deleteSnapshot(scenarioId: string, snapshotId: string): Promise<void> {
  const client = getTableClient(TABLE_SNAPSHOTS);
  await client.deleteEntity(scenarioId, snapshotId);
}
