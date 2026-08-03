import type { TableEntity } from '@azure/data-tables';

export const TABLE_TEAMS = 'teams';
export const TABLE_STAFF = 'staffMembers';
export const TABLE_SCENARIOS = 'scenarios';
export const TABLE_MEMBER_STATES = 'scenarioMemberStates';
export const TABLE_TEAM_DRIVERS = 'scenarioTeamDrivers';
export const TABLE_SNAPSHOTS = 'scenarioSnapshots';
export const TABLE_AUDIT_EVENTS = 'scenarioAuditEvents';
export const TABLE_DEPARTMENTS = 'departments';

export interface TeamEntity extends TableEntity {
  partitionKey: 'team';
  rowKey: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  departmentId?: string;
  skillOverrides?: string;
}

export interface StaffMemberEntity extends TableEntity {
  partitionKey: 'member';
  rowKey: string;
  name: string;
  role: string;
  fte: number;
  isSquad: boolean;
  startDate: string;
  birthYear?: number;
  retirementEligibleYear?: number;
  baseTeamId: string;
  tags: string;
  notes?: string;
}

export interface DepartmentEntity extends TableEntity {
  partitionKey: 'department';
  rowKey: string;
  name: string;
  description?: string;
  color: string;
  deptHead?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  skills?: string;
}

export interface ScenarioEntity extends TableEntity {
  partitionKey: 'scenario';
  rowKey: string;
  type: string;
  name: string;
  description?: string;
  status: string;
  parameters: string;
  createdAt: string;
  updatedAt: string;
  departmentId?: string;
}

export interface MemberStateEntity extends TableEntity {
  partitionKey: string;
  rowKey: string;
  teamId: string;
  status: string;
  overrideRole?: string;
  businessDriver?: string;
  updatedAt: string;
}

export interface TeamDriverEntity extends TableEntity {
  partitionKey: string;
  rowKey: string;
  driver: string;
  priorityScore?: number;
  targetFteDelta?: number;
  updatedAt: string;
}

export interface SnapshotEntity extends TableEntity {
  partitionKey: string;
  rowKey: string;
  label: string;
  parametersJson: string;
  boardStateJson: string;
  headcount: number;
  totalFte: number;
  removedCount: number;
  createdAt: string;
}

export interface AuditEventEntity extends TableEntity {
  partitionKey: string;
  rowKey: string;
  eventType: string;
  createdAt: string;
  actor?: string;
  note?: string;
  memberId?: string;
  fromTeamId?: string;
  toTeamId?: string;
  payloadJson?: string;
}

export const REMOVED_SENTINEL = 'REMOVED';

export interface EntityMap {
  Team: TeamEntity;
  StaffMember: StaffMemberEntity;
  Department: DepartmentEntity;
  Scenario: ScenarioEntity;
  MemberState: MemberStateEntity;
  TeamDriver: TeamDriverEntity;
  Snapshot: SnapshotEntity;
  AuditEvent: AuditEventEntity;
}

export type EntityTypeName = keyof EntityMap;
