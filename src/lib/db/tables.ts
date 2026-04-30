import type { TableEntity } from '@azure/data-tables';

// Table name constants
export const TABLE_TEAMS = 'teams';
export const TABLE_STAFF = 'staffMembers';
export const TABLE_SCENARIOS = 'scenarios';
export const TABLE_MEMBER_STATES = 'scenarioMemberStates';
export const TABLE_TEAM_DRIVERS = 'scenarioTeamDrivers';
export const TABLE_SNAPSHOTS = 'scenarioSnapshots';

// ── Entity types (Azure Table entities extend TableEntity with partitionKey + rowKey) ──

export interface TeamEntity extends TableEntity {
  partitionKey: 'team';
  rowKey: string; // teamId
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
}

export interface StaffMemberEntity extends TableEntity {
  partitionKey: 'member';
  rowKey: string; // memberId
  name: string;
  role: string;
  fte: number;
  isSquad: boolean;
  startDate: string;
  birthYear?: number;
  retirementEligibleYear?: number;
  baseTeamId: string;
  tags: string; // JSON array string
  notes?: string;
}

export interface ScenarioEntity extends TableEntity {
  partitionKey: 'scenario';
  rowKey: string; // scenarioId
  type: string;
  name: string;
  description?: string;
  status: string;
  parameters: string; // JSON string
  createdAt: string;
  updatedAt: string;
}

export interface MemberStateEntity extends TableEntity {
  partitionKey: string; // scenarioId
  rowKey: string; // memberId
  teamId: string; // 'REMOVED' sentinel for null
  status: string;
  overrideRole?: string;
  businessDriver?: string;
  updatedAt: string;
}

export interface TeamDriverEntity extends TableEntity {
  partitionKey: string; // scenarioId
  rowKey: string; // teamId
  driver: string;
  priorityScore?: number;
  targetFteDelta?: number;
  updatedAt: string;
}

export interface SnapshotEntity extends TableEntity {
  partitionKey: string; // scenarioId
  rowKey: string; // snapshotId
  label: string;
  parametersJson: string; // JSON string of ScenarioParams
  boardStateJson: string; // JSON string of BoardState
  headcount: number;
  totalFte: number;
  removedCount: number;
  createdAt: string;
}

// Sentinel value for "member removed from all teams"
export const REMOVED_SENTINEL = 'REMOVED';
