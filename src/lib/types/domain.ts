export type BusinessDriver = 'grow' | 'contain' | 'slim' | 'neutral';
export type ScenarioType = 'squad_removal' | 'retirement_wave' | 'business_drivers';
export type ScenarioStatus = 'draft' | 'active' | 'locked';
export type MemberStatus = 'active' | 'removed' | 'transferred';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  fte: number;
  isSquad: boolean;
  startDate: string; // ISO date string YYYY-MM-DD
  birthYear?: number;
  retirementEligibleYear?: number;
  baseTeamId: string; // immutable — never changed by scenarios
  tags: string[];
  notes?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  color: string;
  deptHead?: string;
  sortOrder: number;
}

export interface DepartmentWithStats extends Department {
  headcount: number;
  totalFte: number;
  teamCount: number;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  color: string; // hex color
  sortOrder: number;
  departmentId?: string;
}

export interface ScenarioMemberState {
  scenarioId: string;
  memberId: string;
  teamId: string | null; // null = removed from all teams
  status: MemberStatus;
  overrideRole?: string;
  businessDriver?: BusinessDriver;
  updatedAt: string;
}

export interface ScenarioTeamDriver {
  scenarioId: string;
  teamId: string;
  driver: BusinessDriver;
  priorityScore?: number; // 1-5
  targetFteDelta?: number; // positive = grow, negative = slim
  updatedAt: string;
}

export interface Scenario {
  id: string;
  type: ScenarioType;
  name: string;
  description?: string;
  status: ScenarioStatus;
  parameters: string; // JSON string of ScenarioParams
  createdAt: string;
  updatedAt: string;
}

export interface TeamSnapshot {
  team: Team;
  members: Array<StaffMember & { scenarioState?: ScenarioMemberState }>;
  totalFte: number;
  headcount: number;
  driver?: BusinessDriver;
  priorityScore?: number;
  targetFteDelta?: number;
}

export interface BoardState {
  scenario: Scenario;
  teams: TeamSnapshot[];
  removedMembers: Array<StaffMember & { scenarioState?: ScenarioMemberState }>;
  totalFte: number;
  totalHeadcount: number;
}

export interface ScenarioSummary {
  id: string;
  type: ScenarioType;
  name: string;
  description?: string;
  status: ScenarioStatus;
  totalFte: number;
  headcount: number;
  removedCount: number;
  snapshotCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AuditEventType =
  | 'member_moved'
  | 'member_removed'
  | 'team_driver_updated'
  | 'parameters_updated'
  | 'scenario_logic_applied'
  | 'scenario_reset'
  | 'snapshot_saved'
  | 'snapshot_restored'
  | 'snapshot_deleted'
  | 'scenario_updated'
  | 'scenario_note';

export interface AuditEvent {
  id: string;
  scenarioId: string;
  eventType: AuditEventType;
  createdAt: string;
  actor?: string;
  note?: string;
  memberId?: string;
  fromTeamId?: string | null;
  toTeamId?: string | null;
  payload?: Record<string, unknown>;
}
