import type { TeamEntity, DepartmentEntity } from './tables';
import type { Team, Department } from '../types/domain';

export function entityToTeam(e: TeamEntity): Team {
  return {
    id: e.rowKey,
    name: e.name,
    description: e.description,
    color: e.color,
    sortOrder: e.sortOrder,
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
