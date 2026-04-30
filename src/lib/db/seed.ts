import { v4 as uuidv4 } from 'uuid';
import { getTableClient } from './client';
import {
  TABLE_TEAMS,
  TABLE_STAFF,
  type TeamEntity,
  type StaffMemberEntity,
} from './tables';

export interface SeedResult {
  teams: number;
  members: number;
}

const SEED_TEAMS: TeamEntity[] = [
  { partitionKey: 'team', rowKey: 'team-alpha', name: 'Alpha', description: 'Core platform team', color: '#6366f1', sortOrder: 1 },
  { partitionKey: 'team', rowKey: 'team-beta', name: 'Beta', description: 'Product delivery team', color: '#f59e0b', sortOrder: 2 },
  { partitionKey: 'team', rowKey: 'team-gamma', name: 'Gamma', description: 'Infrastructure team', color: '#10b981', sortOrder: 3 },
  { partitionKey: 'team', rowKey: 'team-delta', name: 'Delta', description: 'Data & analytics team', color: '#ef4444', sortOrder: 4 },
];

function makeMember(
  id: string,
  name: string,
  role: string,
  fte: number,
  isSquad: boolean,
  teamId: string,
  startDate: string,
  birthYear?: number,
  tags: string[] = [],
): StaffMemberEntity {
  return {
    partitionKey: 'member',
    rowKey: id,
    name,
    role,
    fte,
    isSquad,
    startDate,
    birthYear,
    retirementEligibleYear: birthYear ? birthYear + 65 : undefined,
    baseTeamId: teamId,
    tags: JSON.stringify(tags),
  };
}

const SEED_MEMBERS: StaffMemberEntity[] = [
  makeMember('m-001', 'Alice Chen', 'Engineering Lead', 1.0, true, 'team-alpha', '2018-03-01', 1972, ['lead', 'backend']),
  makeMember('m-002', 'Bob Torres', 'Senior Engineer', 1.0, true, 'team-alpha', '2019-06-15', 1980, ['backend']),
  makeMember('m-003', 'Carol Smith', 'Engineer', 1.0, true, 'team-alpha', '2021-01-10', 1990, ['frontend']),
  makeMember('m-004', 'David Lee', 'Product Manager', 1.0, false, 'team-alpha', '2020-09-01', 1985, ['product']),
  makeMember('m-005', 'Eva Brown', 'Scrum Master', 0.5, false, 'team-alpha', '2022-02-14', 1988, ['agile']),
  makeMember('m-006', 'Frank White', 'Engineering Lead', 1.0, true, 'team-beta', '2017-05-01', 1968, ['lead', 'fullstack']),
  makeMember('m-007', 'Grace Liu', 'Senior Engineer', 1.0, true, 'team-beta', '2020-03-20', 1983, ['backend']),
  makeMember('m-008', 'Henry Park', 'Engineer', 1.0, true, 'team-beta', '2022-07-01', 1995, ['frontend']),
  makeMember('m-009', 'Iris Nguyen', 'Designer', 1.0, false, 'team-beta', '2021-11-01', 1992, ['design']),
  makeMember('m-010', 'Jack Adams', 'Engineering Lead', 1.0, true, 'team-gamma', '2016-01-15', 1965, ['lead', 'devops']),
  makeMember('m-011', 'Karen Wilson', 'Senior Engineer', 1.0, true, 'team-gamma', '2019-04-01', 1978, ['devops']),
  makeMember('m-012', 'Leo Martinez', 'Engineer', 1.0, true, 'team-gamma', '2023-01-09', 1997, ['backend']),
  makeMember('m-013', 'Mia Johnson', 'Engineering Lead', 1.0, true, 'team-delta', '2018-08-01', 1975, ['lead', 'data']),
  makeMember('m-014', 'Noah Davis', 'Data Engineer', 1.0, true, 'team-delta', '2020-06-01', 1987, ['data', 'backend']),
  makeMember('m-015', 'Olivia Taylor', 'Analyst', 1.0, false, 'team-delta', '2021-05-17', 1993, ['data', 'analytics']),
];

export async function runSeed(): Promise<SeedResult> {
  const teamsClient = getTableClient(TABLE_TEAMS);
  const membersClient = getTableClient(TABLE_STAFF);

  await Promise.all(
    SEED_TEAMS.map(t => teamsClient.upsertEntity(t, 'Replace'))
  );

  await Promise.all(
    SEED_MEMBERS.map(m => membersClient.upsertEntity(m, 'Replace'))
  );

  return { teams: SEED_TEAMS.length, members: SEED_MEMBERS.length };
}
