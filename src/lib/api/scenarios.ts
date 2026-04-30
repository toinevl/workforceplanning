import { v4 as uuidv4 } from 'uuid';
import { getTableClient } from '../db/client';
import {
  TABLE_SCENARIOS, TABLE_STAFF, TABLE_TEAMS, TABLE_MEMBER_STATES, TABLE_TEAM_DRIVERS, TABLE_SNAPSHOTS,
  REMOVED_SENTINEL,
  type ScenarioEntity, type StaffMemberEntity, type TeamEntity,
  type MemberStateEntity, type TeamDriverEntity,
} from '../db/tables';
import type { Scenario, StaffMember, Team, ScenarioMemberState, BoardState, TeamSnapshot, ScenarioSummary } from '../types/domain';
import type { ScenarioParams } from '../types/params';
import { defaultParams } from '../types/params';

function entityToScenario(e: ScenarioEntity): Scenario {
  return {
    id: e.rowKey,
    type: e.type as Scenario['type'],
    name: e.name,
    description: e.description,
    status: e.status as Scenario['status'],
    parameters: e.parameters,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function entityToMember(e: StaffMemberEntity): StaffMember {
  return {
    id: e.rowKey,
    name: e.name,
    role: e.role,
    fte: e.fte,
    isSquad: e.isSquad,
    startDate: e.startDate,
    birthYear: e.birthYear,
    retirementEligibleYear: e.retirementEligibleYear,
    baseTeamId: e.baseTeamId,
    tags: JSON.parse(e.tags || '[]'),
    notes: e.notes,
  };
}

function entityToTeam(e: TeamEntity): Team {
  return {
    id: e.rowKey,
    name: e.name,
    description: e.description,
    color: e.color,
    sortOrder: e.sortOrder,
  };
}

export async function getScenarioList(): Promise<ScenarioSummary[]> {
  const scenarioClient = getTableClient(TABLE_SCENARIOS);
  const snapshotClient = getTableClient(TABLE_SNAPSHOTS);
  const memberStateClient = getTableClient(TABLE_MEMBER_STATES);

  const scenarios: Scenario[] = [];
  for await (const e of scenarioClient.listEntities<ScenarioEntity>()) {
    scenarios.push(entityToScenario(e as ScenarioEntity));
  }

  const summaries = await Promise.all(
    scenarios.map(async (scenario) => {
      // Count snapshots
      let snapshotCount = 0;
      for await (const _ of snapshotClient.listEntities({ queryOptions: { filter: `PartitionKey eq '${scenario.id}'` } })) {
        snapshotCount++;
      }

      // Count removed members and sum FTE
      let removedCount = 0;

      const removedMemberIds = new Set<string>();
      for await (const e of memberStateClient.listEntities<MemberStateEntity>({ queryOptions: { filter: `PartitionKey eq '${scenario.id}'` } })) {
        if ((e as MemberStateEntity).teamId === REMOVED_SENTINEL) {
          removedMemberIds.add((e as MemberStateEntity).rowKey);
          removedCount++;
        }
      }

      // Count all members not removed
      let totalFte = 0;
      let headcount = 0;
      const staffClient = getTableClient(TABLE_STAFF);
      for await (const e of staffClient.listEntities<StaffMemberEntity>()) {
        if (!removedMemberIds.has(e.rowKey)) {
          totalFte += (e as StaffMemberEntity).fte;
          headcount++;
        }
      }

      return {
        id: scenario.id,
        type: scenario.type,
        name: scenario.name,
        description: scenario.description,
        status: scenario.status,
        totalFte: Math.round(totalFte * 10) / 10,
        headcount,
        removedCount,
        snapshotCount,
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt,
      } satisfies ScenarioSummary;
    })
  );

  return summaries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getScenario(scenarioId: string): Promise<Scenario | null> {
  try {
    const client = getTableClient(TABLE_SCENARIOS);
    const entity = await client.getEntity<ScenarioEntity>('scenario', scenarioId);
    return entityToScenario(entity as ScenarioEntity);
  } catch {
    return null;
  }
}

export async function getScenarioBoardState(scenarioId: string): Promise<BoardState | null> {
  const scenario = await getScenario(scenarioId);
  if (!scenario) return null;

  // Fetch all base data + scenario overrides in parallel
  const [allMembers, allTeams, memberStateEntities, teamDriverEntities] = await Promise.all([
    (async () => {
      const client = getTableClient(TABLE_STAFF);
      const members: StaffMember[] = [];
      for await (const e of client.listEntities<StaffMemberEntity>()) {
        members.push(entityToMember(e as StaffMemberEntity));
      }
      return members;
    })(),
    (async () => {
      const client = getTableClient(TABLE_TEAMS);
      const teams: Team[] = [];
      for await (const e of client.listEntities<TeamEntity>()) {
        teams.push(entityToTeam(e as TeamEntity));
      }
      return teams.sort((a, b) => a.sortOrder - b.sortOrder);
    })(),
    (async () => {
      const client = getTableClient(TABLE_MEMBER_STATES);
      const states: MemberStateEntity[] = [];
      for await (const e of client.listEntities<MemberStateEntity>({ queryOptions: { filter: `PartitionKey eq '${scenarioId}'` } })) {
        states.push(e as MemberStateEntity);
      }
      return states;
    })(),
    (async () => {
      const client = getTableClient(TABLE_TEAM_DRIVERS);
      const drivers: TeamDriverEntity[] = [];
      for await (const e of client.listEntities<TeamDriverEntity>({ queryOptions: { filter: `PartitionKey eq '${scenarioId}'` } })) {
        drivers.push(e as TeamDriverEntity);
      }
      return drivers;
    })(),
  ]);

  // Build lookup maps
  const stateByMemberId = new Map(memberStateEntities.map(s => [s.rowKey, s]));
  const driverByTeamId = new Map(teamDriverEntities.map(d => [d.rowKey, d]));

  // Resolve each member's effective team for this scenario
  const removedMembers: StaffMember[] = [];
  const teamMemberMap = new Map<string, Array<StaffMember & { scenarioState?: ScenarioMemberState }>>();

  allTeams.forEach(t => teamMemberMap.set(t.id, []));

  for (const member of allMembers) {
    const state = stateByMemberId.get(member.id);
    const effectiveTeamId = state ? state.teamId : member.baseTeamId;

    if (effectiveTeamId === REMOVED_SENTINEL || effectiveTeamId === null) {
      removedMembers.push(member);
    } else {
      const teamMembers = teamMemberMap.get(effectiveTeamId) ?? [];
      teamMembers.push({
        ...member,
        scenarioState: state
          ? {
              scenarioId: state.partitionKey,
              memberId: state.rowKey,
              teamId: state.teamId === REMOVED_SENTINEL ? null : state.teamId,
              status: state.status as ScenarioMemberState['status'],
              overrideRole: state.overrideRole,
              businessDriver: state.businessDriver as ScenarioMemberState['businessDriver'],
              updatedAt: state.updatedAt,
            }
          : undefined,
      });
      teamMemberMap.set(effectiveTeamId, teamMembers);
    }
  }

  // Build team snapshots
  const teams: TeamSnapshot[] = allTeams.map(team => {
    const members = teamMemberMap.get(team.id) ?? [];
    const driver = driverByTeamId.get(team.id);
    return {
      team,
      members,
      totalFte: Math.round(members.reduce((sum, m) => sum + m.fte, 0) * 10) / 10,
      headcount: members.length,
      driver: driver?.driver as TeamSnapshot['driver'],
      priorityScore: driver?.priorityScore,
      targetFteDelta: driver?.targetFteDelta,
    };
  });

  const allActive = teams.flatMap(t => t.members);
  return {
    scenario,
    teams,
    removedMembers,
    totalFte: Math.round(allActive.reduce((sum, m) => sum + m.fte, 0) * 10) / 10,
    totalHeadcount: allActive.length,
  };
}

export async function createScenario(
  type: Scenario['type'],
  name: string,
  description?: string,
  params?: ScenarioParams
): Promise<Scenario> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const parameters = JSON.stringify(params ?? defaultParams(type as string));

  const client = getTableClient(TABLE_SCENARIOS);
  await client.upsertEntity<ScenarioEntity>({
    partitionKey: 'scenario',
    rowKey: id,
    type,
    name,
    description,
    status: 'draft',
    parameters,
    createdAt: now,
    updatedAt: now,
  }, 'Replace');

  return { id, type, name, description, status: 'draft', parameters, createdAt: now, updatedAt: now };
}

export async function updateScenario(
  scenarioId: string,
  updates: Partial<Pick<Scenario, 'name' | 'description' | 'status' | 'parameters'>>
): Promise<Scenario | null> {
  const existing = await getScenario(scenarioId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated = { ...existing, ...updates, updatedAt: now };

  const client = getTableClient(TABLE_SCENARIOS);
  await client.updateEntity<ScenarioEntity>({
    partitionKey: 'scenario',
    rowKey: scenarioId,
    type: updated.type,
    name: updated.name,
    description: updated.description,
    status: updated.status,
    parameters: updated.parameters,
    createdAt: updated.createdAt,
    updatedAt: now,
  }, 'Replace');

  return updated;
}

export async function deleteScenario(scenarioId: string): Promise<void> {
  const scenarioClient = getTableClient(TABLE_SCENARIOS);
  const stateClient = getTableClient(TABLE_MEMBER_STATES);
  const driverClient = getTableClient(TABLE_TEAM_DRIVERS);
  const snapshotClient = getTableClient(TABLE_SNAPSHOTS);

  // Delete all child entities
  const deleteAll = async (client: ReturnType<typeof getTableClient>, partitionKey: string) => {
    const toDelete: Array<{ partitionKey: string; rowKey: string }> = [];
    for await (const e of client.listEntities({ queryOptions: { filter: `PartitionKey eq '${partitionKey}'` } })) {
      toDelete.push({ partitionKey: e.partitionKey as string, rowKey: e.rowKey as string });
    }
    await Promise.all(toDelete.map(e => client.deleteEntity(e.partitionKey, e.rowKey).catch(() => {})));
  };

  await Promise.all([
    scenarioClient.deleteEntity('scenario', scenarioId).catch(() => {}),
    deleteAll(stateClient, scenarioId),
    deleteAll(driverClient, scenarioId),
    deleteAll(snapshotClient, scenarioId),
  ]);
}

export async function resetScenario(scenarioId: string): Promise<void> {
  const stateClient = getTableClient(TABLE_MEMBER_STATES);
  const driverClient = getTableClient(TABLE_TEAM_DRIVERS);

  const deleteAll = async (client: ReturnType<typeof getTableClient>, partitionKey: string) => {
    const toDelete: Array<{ partitionKey: string; rowKey: string }> = [];
    for await (const e of client.listEntities({ queryOptions: { filter: `PartitionKey eq '${partitionKey}'` } })) {
      toDelete.push({ partitionKey: e.partitionKey as string, rowKey: e.rowKey as string });
    }
    await Promise.all(toDelete.map(e => client.deleteEntity(e.partitionKey, e.rowKey).catch(() => {})));
  };

  await Promise.all([
    deleteAll(stateClient, scenarioId),
    deleteAll(driverClient, scenarioId),
  ]);

  // Update updatedAt
  await updateScenario(scenarioId, {});
}
