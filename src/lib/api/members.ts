import { getTableClient } from '../db/client';
import { TABLE_STAFF, type StaffMemberEntity } from '../db/tables';
import type { StaffMember } from '../types/domain';

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

export async function getAllMembers(): Promise<StaffMember[]> {
  const client = getTableClient(TABLE_STAFF);
  const members: StaffMember[] = [];
  for await (const entity of client.listEntities<StaffMemberEntity>()) {
    members.push(entityToMember(entity as StaffMemberEntity));
  }
  return members;
}

export async function getMember(memberId: string): Promise<StaffMember | null> {
  try {
    const client = getTableClient(TABLE_STAFF);
    const entity = await client.getEntity<StaffMemberEntity>('member', memberId);
    return entityToMember(entity as StaffMemberEntity);
  } catch {
    return null;
  }
}
