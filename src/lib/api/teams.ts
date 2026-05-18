import { getTableClient } from '../db/client';
import { TABLE_TEAMS, type TeamEntity } from '../db/tables';
import type { Team } from '../types/domain';
import { entityToTeam } from '../db/mappers';

export async function getAllTeams(): Promise<Team[]> {
  const client = getTableClient(TABLE_TEAMS);
  const teams: Team[] = [];
  for await (const entity of client.listEntities<TeamEntity>()) {
    teams.push(entityToTeam(entity as TeamEntity));
  }
  return teams.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const client = getTableClient(TABLE_TEAMS);
    const entity = await client.getEntity<TeamEntity>('team', teamId);
    return entityToTeam(entity as TeamEntity);
  } catch {
    return null;
  }
}
