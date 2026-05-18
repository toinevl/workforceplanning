import type { TeamEntity } from './tables';
import type { Team } from '../types/domain';

export function entityToTeam(e: TeamEntity): Team {
  return {
    id: e.rowKey,
    name: e.name,
    description: e.description,
    color: e.color,
    sortOrder: e.sortOrder,
  };
}
