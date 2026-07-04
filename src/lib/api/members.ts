import { getTableClient } from '../db/client';
import { TABLE_STAFF, type StaffMemberEntity } from '../db/tables';
import type { StaffMember } from '../types/domain';
import { entityToStaffMember } from '../db/mappers';

export async function getAllMembers(): Promise<StaffMember[]> {
  const client = getTableClient(TABLE_STAFF);
  const members: StaffMember[] = [];
  for await (const entity of client.listEntities<StaffMemberEntity>({
    queryOptions: { filter: "PartitionKey eq 'member'" },
  })) {
    members.push(entityToStaffMember(entity as StaffMemberEntity));
  }
  return members;
}

export async function getMember(memberId: string): Promise<StaffMember | null> {
  try {
    const client = getTableClient(TABLE_STAFF);
    const entity = await client.getEntity<StaffMemberEntity>('member', memberId);
    return entityToStaffMember(entity as StaffMemberEntity);
  } catch {
    return null;
  }
}
