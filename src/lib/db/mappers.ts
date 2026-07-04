import type {
  AuditEventEntity,
  DepartmentEntity,
  EntityMap,
  EntityTypeName,
  MemberStateEntity,
  ScenarioEntity,
  StaffMemberEntity,
  TeamDriverEntity,
  TeamEntity,
} from './tables';
import { REMOVED_SENTINEL } from './tables';
import type {
  AuditEvent,
  AuditEventType,
  BusinessDriver,
  Department,
  MemberStatus,
  Scenario,
  ScenarioMemberState,
  ScenarioStatus,
  ScenarioTeamDriver,
  ScenarioType,
  StaffMember,
  Team,
} from '../types/domain';

export function entityToTeam(e: TeamEntity): Team {
  return {
    id: e.rowKey,
    name: e.name,
    description: e.description,
    color: e.color,
    sortOrder: e.sortOrder,
    departmentId: e.departmentId,
  };
}

export function entityToDepartment(e: DepartmentEntity): Department {
  return {
    id: e.rowKey,
    name: e.name,
    description: e.description,
    color: e.color,
    deptHead: e.deptHead,
    sortOrder: e.sortOrder,
  };
}

export function entityToStaffMember(e: StaffMemberEntity): StaffMember {
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

export function entityToScenario(e: ScenarioEntity): Scenario {
  return {
    id: e.rowKey,
    type: e.type as ScenarioType,
    name: e.name,
    description: e.description,
    status: e.status as ScenarioStatus,
    parameters: e.parameters,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export function entityToScenarioMemberState(e: MemberStateEntity): ScenarioMemberState {
  return {
    scenarioId: e.partitionKey,
    memberId: e.rowKey,
    teamId: e.teamId === REMOVED_SENTINEL ? null : e.teamId,
    status: e.status as MemberStatus,
    overrideRole: e.overrideRole,
    businessDriver: e.businessDriver as BusinessDriver | undefined,
    updatedAt: e.updatedAt,
  };
}

export function entityToScenarioTeamDriver(e: TeamDriverEntity): ScenarioTeamDriver {
  return {
    scenarioId: e.partitionKey,
    teamId: e.rowKey,
    driver: e.driver as BusinessDriver,
    priorityScore: e.priorityScore,
    targetFteDelta: e.targetFteDelta,
    updatedAt: e.updatedAt,
  };
}

export function entityToAuditEvent(e: AuditEventEntity): AuditEvent {
  return {
    id: e.rowKey,
    scenarioId: e.partitionKey,
    eventType: e.eventType as AuditEventType,
    createdAt: e.createdAt,
    actor: e.actor,
    note: e.note,
    memberId: e.memberId,
    fromTeamId: e.fromTeamId === REMOVED_SENTINEL ? null : e.fromTeamId,
    toTeamId: e.toTeamId === REMOVED_SENTINEL ? null : e.toTeamId,
    payload: e.payloadJson ? (JSON.parse(e.payloadJson) as Record<string, unknown>) : undefined,
  };
}

// SnapshotEntity maps to a composite BoardState (parsed JSON blobs + scenario
// lookup); there is no clean 1:1 entity→domain mapping. SnapshotEntity is
// therefore intentionally represented by a null entry in the registry below.
// Inline mapping in src/lib/api/snapshots.ts handles the composite transform.

// Compile-time exhaustiveness guard: every EntityTypeName must have an entry.
// Adding a new entity to EntityMap (tables.ts) adds a key to the union, which
// breaks this `satisfies` until a key is added here, forcing an explicit
// mapper decision (function, or null for composite/inline-only entities).
type EntityMapperRegistry = {
  [K in EntityTypeName]: ((e: EntityMap[K]) => unknown) | null;
};

const entityMappers = {
  Team: entityToTeam,
  Department: entityToDepartment,
  StaffMember: entityToStaffMember,
  Scenario: entityToScenario,
  MemberState: entityToScenarioMemberState,
  TeamDriver: entityToScenarioTeamDriver,
  Snapshot: null, // composite mapping — see note above
  AuditEvent: entityToAuditEvent,
} satisfies EntityMapperRegistry;

// Reference the registry so dead-code elimination doesn't drop it.
void entityMappers;
