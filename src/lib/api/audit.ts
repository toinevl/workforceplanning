import { v4 as uuidv4 } from 'uuid';
import { getTableClient } from '../db/client';
import { REMOVED_SENTINEL, TABLE_AUDIT_EVENTS, type AuditEventEntity } from '../db/tables';
import type { AuditEvent, AuditEventType } from '../types/domain';
import { entityToAuditEvent } from '../db/mappers';

interface CreateAuditEventInput {
  scenarioId: string;
  eventType: AuditEventType;
  actor?: string;
  note?: string;
  memberId?: string;
  fromTeamId?: string | null;
  toTeamId?: string | null;
  payload?: Record<string, unknown>;
}

function normalizeTeamId(teamId?: string | null): string | undefined {
  if (teamId === null) return REMOVED_SENTINEL;
  return teamId;
}

export async function createAuditEvent(input: CreateAuditEventInput): Promise<AuditEvent> {
  const now = new Date().toISOString();
  const id = `${now}-${uuidv4()}`;
  const client = getTableClient(TABLE_AUDIT_EVENTS);

  const entity: AuditEventEntity = {
    partitionKey: input.scenarioId,
    rowKey: id,
    eventType: input.eventType,
    createdAt: now,
    actor: input.actor,
    note: input.note?.trim() || undefined,
    memberId: input.memberId,
    fromTeamId: normalizeTeamId(input.fromTeamId),
    toTeamId: normalizeTeamId(input.toTeamId),
    payloadJson: input.payload ? JSON.stringify(input.payload) : undefined,
  };

  await client.createEntity<AuditEventEntity>(entity);
  return entityToAuditEvent(entity);
}

export async function listAuditEvents(scenarioId: string, memberId?: string): Promise<AuditEvent[]> {
  const client = getTableClient(TABLE_AUDIT_EVENTS);
  const events: AuditEvent[] = [];

  for await (const e of client.listEntities<AuditEventEntity>({ queryOptions: { filter: `PartitionKey eq '${scenarioId}'` } })) {
    const event = entityToAuditEvent(e as AuditEventEntity);
    if (!memberId || event.memberId === memberId) {
      events.push(event);
    }
  }

  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteAuditEvents(scenarioId: string): Promise<void> {
  const client = getTableClient(TABLE_AUDIT_EVENTS);
  const toDelete: Array<{ partitionKey: string; rowKey: string }> = [];

  for await (const e of client.listEntities({ queryOptions: { filter: `PartitionKey eq '${scenarioId}'` } })) {
    toDelete.push({ partitionKey: e.partitionKey as string, rowKey: e.rowKey as string });
  }

  await Promise.all(toDelete.map(e => client.deleteEntity(e.partitionKey, e.rowKey).catch(() => {})));
}
