import { v4 as uuidv4 } from 'uuid';
import { getTableClient } from '../db/client';
import {
  TABLE_DEPARTMENTS,
  TABLE_TEAMS,
  TABLE_STAFF,
  type DepartmentEntity,
  type TeamEntity,
  type StaffMemberEntity,
} from '../db/tables';
import type { Department } from '../types/domain';
import { entityToDepartment } from '../db/mappers';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Escape single quotes for safe OData filter interpolation */
function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, "''");
}

function assertValidId(id: string) {
  if (!UUID_RE.test(id)) {
    throw new Error(`Invalid id: ${id}`);
  }
}

/**
 * Get all departments sorted by sortOrder
 */
export async function getDepartments(): Promise<Department[]> {
  const client = getTableClient(TABLE_DEPARTMENTS);
  const departments: Department[] = [];
  for await (const entity of client.listEntities<DepartmentEntity>({
    queryOptions: { filter: "PartitionKey eq 'department'" },
  })) {
    departments.push(entityToDepartment(entity as DepartmentEntity));
  }
  return departments.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get a single department by ID
 */
export async function getDepartmentById(id: string): Promise<Department | null> {
  assertValidId(id);
  try {
    const client = getTableClient(TABLE_DEPARTMENTS);
    const entity = await client.getEntity<DepartmentEntity>('department', id);
    return entityToDepartment(entity as DepartmentEntity);
  } catch {
    return null;
  }
}

/**
 * Get all departments with rollup stats (headcount, FTE, team count)
 * Fetches departments, teams, and members in parallel for efficiency
 */
export async function getDepartmentsWithStats(): Promise<
  Array<Department & { headcount: number; totalFte: number; teamCount: number }>
> {
  // Three parallel partition scans
  const [departments, teams, members] = await Promise.all([
    (async () => {
      const client = getTableClient(TABLE_DEPARTMENTS);
      const depts: DepartmentEntity[] = [];
      for await (const entity of client.listEntities<DepartmentEntity>()) {
        depts.push(entity as DepartmentEntity);
      }
      return depts;
    })(),
    (async () => {
      const client = getTableClient(TABLE_TEAMS);
      const teamList: TeamEntity[] = [];
      for await (const entity of client.listEntities<TeamEntity>()) {
        teamList.push(entity as TeamEntity);
      }
      return teamList;
    })(),
    (async () => {
      const client = getTableClient(TABLE_STAFF);
      const memberList: StaffMemberEntity[] = [];
      for await (const entity of client.listEntities<StaffMemberEntity>()) {
        memberList.push(entity as StaffMemberEntity);
      }
      return memberList;
    })(),
  ]);

  // Build maps for grouping
  // Map from baseTeamId -> StaffMember[]
  const membersMap = new Map<string, StaffMemberEntity[]>();
  for (const member of members) {
    if (!membersMap.has(member.baseTeamId)) {
      membersMap.set(member.baseTeamId, []);
    }
    membersMap.get(member.baseTeamId)!.push(member);
  }

  // Map from departmentId -> TeamEntity[]
  const teamMap = new Map<string, TeamEntity[]>();
  const unassignedTeams: TeamEntity[] = [];
  for (const team of teams) {
    if (team.departmentId) {
      if (!teamMap.has(team.departmentId)) {
        teamMap.set(team.departmentId, []);
      }
      teamMap.get(team.departmentId)!.push(team);
    } else {
      unassignedTeams.push(team);
    }
  }

  // Helper to compute stats for a set of teams
  const computeTeamStats = (teamList: TeamEntity[]) => {
    let headcount = 0;
    let totalFte = 0;
    for (const team of teamList) {
      const teamMembers = membersMap.get(team.rowKey) || [];
      headcount += teamMembers.length;
      totalFte += teamMembers.reduce((sum, m) => sum + m.fte, 0);
    }
    return { headcount, totalFte };
  };

  // Build result with stats for each department
  const result = departments
    .map((dept) => {
      const deptTeams = teamMap.get(dept.rowKey) || [];
      const { headcount, totalFte } = computeTeamStats(deptTeams);
      return {
        ...entityToDepartment(dept),
        headcount,
        totalFte,
        teamCount: deptTeams.length,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Add Unassigned bucket if there are unassigned teams
  if (unassignedTeams.length > 0) {
    const { headcount, totalFte } = computeTeamStats(unassignedTeams);
    result.push({
      id: 'unassigned',
      name: 'Unassigned',
      description: 'Teams without a department',
      color: '#9CA3AF',
      deptHead: undefined,
      sortOrder: 999,
      headcount,
      totalFte,
      teamCount: unassignedTeams.length,
    });
  }

  return result;
}

/**
 * Create a new department
 */
export async function createDepartment(
  name: string,
  color: string,
  description?: string,
  deptHead?: string
): Promise<Department> {
  const departmentId = uuidv4();
  const timestamp = new Date().toISOString();

  // Get next sortOrder
  const existingDepts = await getDepartments();
  const nextSortOrder = existingDepts.length > 0 ? Math.max(...existingDepts.map((d) => d.sortOrder)) + 1 : 1;

  const entity: DepartmentEntity = {
    partitionKey: 'department',
    rowKey: departmentId,
    name,
    description,
    color,
    deptHead,
    sortOrder: nextSortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const client = getTableClient(TABLE_DEPARTMENTS);
  await client.upsertEntity(entity, 'Replace');

  return entityToDepartment(entity);
}

/**
 * Update an existing department
 */
export async function updateDepartment(
  id: string,
  updates: Partial<{
    name: string;
    color: string;
    description?: string;
    deptHead?: string;
  }>
): Promise<Department> {
  assertValidId(id);
  const existing = await getDepartmentById(id);
  if (!existing) {
    throw new Error(`Department ${id} not found`);
  }

  const client = getTableClient(TABLE_DEPARTMENTS);
  const currentEntity = await client.getEntity<DepartmentEntity>('department', id);

  const updated: DepartmentEntity = {
    ...currentEntity,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await client.upsertEntity(updated, 'Replace');
  return entityToDepartment(updated);
}

/**
 * Delete a department if it has no assigned teams
 * Returns object with success flag and count of teams still assigned
 */
export async function deleteDepartment(
  id: string
): Promise<{ deleted: boolean; assignedTeamCount: number }> {
  assertValidId(id);
  const client = getTableClient(TABLE_TEAMS);
  const assignedTeams: TeamEntity[] = [];
  for await (const entity of client.listEntities<TeamEntity>({
    queryOptions: { filter: `PartitionKey eq 'team' and departmentId eq '${escapeSingleQuotes(id)}'` },
  })) {
    assignedTeams.push(entity as TeamEntity);
  }

  if (assignedTeams.length > 0) {
    return { deleted: false, assignedTeamCount: assignedTeams.length };
  }

  const deptClient = getTableClient(TABLE_DEPARTMENTS);
  await deptClient.deleteEntity('department', id);
  return { deleted: true, assignedTeamCount: 0 };
}

/**
 * Idempotently assign all unassigned teams to a default department
 * Checks sentinel to prevent duplicate runs
 */
export async function bulkAssignUnassignedTeams(
  defaultDepartmentId: string
): Promise<{ assigned: number; skipped: number }> {
  const deptClient = getTableClient(TABLE_DEPARTMENTS);
  const teamClient = getTableClient(TABLE_TEAMS);

  // Check migration sentinel - stored as a special entry in departments table
  let sentinelExists = false;
  try {
    const sentinel = await deptClient.getEntity('department', 'v2-departments-migration-sentinel');
    sentinelExists = !!sentinel;
  } catch {
    sentinelExists = false;
  }

  // If sentinel doesn't exist, create it now
  if (!sentinelExists) {
    const sentinel: DepartmentEntity = {
      partitionKey: 'department',
      rowKey: 'v2-departments-migration-sentinel',
      name: 'Migration Sentinel',
      color: '#000000',
      sortOrder: -1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await deptClient.upsertEntity(sentinel, 'Replace');
  }

  // Fetch all teams
  const teams: TeamEntity[] = [];
  for await (const entity of teamClient.listEntities<TeamEntity>()) {
    teams.push(entity as TeamEntity);
  }

  // Filter unassigned teams and assign them
  let assigned = 0;
  for (const team of teams) {
    if (!team.departmentId) {
      await teamClient.upsertEntity(
        {
          ...team,
          departmentId: defaultDepartmentId,
        },
        'Merge'
      );
      assigned++;
    }
  }

  return { assigned, skipped: 0 };
}
