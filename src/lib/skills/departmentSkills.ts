import type { Department, DepartmentSkill, Team } from '../types/domain';

export function slugifySkillName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'skill'
  );
}

interface RawSkillInput {
  name?: unknown;
  requiredHeadcount?: unknown;
}

export function parseDepartmentSkillsInput(
  input: unknown
): { skills: DepartmentSkill[] } | { error: string } {
  if (input === undefined) return { skills: [] };
  if (!Array.isArray(input)) return { error: 'skills must be an array' };

  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const skills: DepartmentSkill[] = [];

  for (const [index, raw] of input.entries()) {
    if (!raw || typeof raw !== 'object') {
      return { error: `Skill ${index + 1} is invalid` };
    }
    const item = raw as RawSkillInput;
    const name = String(item.name ?? '').trim();
    if (!name) return { error: `Skill ${index + 1} needs a name` };

    const lowerName = name.toLowerCase();
    if (seenNames.has(lowerName)) return { error: `Duplicate skill name: ${name}` };
    seenNames.add(lowerName);

    const requiredHeadcount = Number(item.requiredHeadcount);
    if (!Number.isFinite(requiredHeadcount) || requiredHeadcount < 0 || !Number.isInteger(requiredHeadcount)) {
      return { error: `${name} requiredHeadcount must be a non-negative integer` };
    }

    let id = slugifySkillName(name);
    let suffix = 2;
    while (seenIds.has(id)) {
      id = `${slugifySkillName(name)}-${suffix++}`;
    }
    seenIds.add(id);

    skills.push({ id, name, requiredHeadcount, sortOrder: index });
  }

  return { skills };
}

export function parseSkillOverridesInput(
  input: unknown,
  validSkillIds: Set<string>
): { skillOverrides: Record<string, number> } | { error: string } {
  if (input === null) return { skillOverrides: {} };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'skillOverrides must be an object' };
  }

  const skillOverrides: Record<string, number> = {};
  for (const [skillId, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (!validSkillIds.has(skillId)) {
      return { error: `Unknown skill id: ${skillId}` };
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return { error: `${skillId} must be a non-negative integer` };
    }
    skillOverrides[skillId] = value;
  }

  return { skillOverrides };
}

export interface ResolvedSkill {
  id: string;
  name: string;
  requiredHeadcount: number;
}

export function resolveTeamSkills(
  department: Pick<Department, 'skills'>,
  team: Pick<Team, 'skillOverrides'>
): ResolvedSkill[] {
  const overrides = team.skillOverrides ?? {};
  return [...department.skills]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      requiredHeadcount: overrides[skill.id] ?? skill.requiredHeadcount,
    }));
}

export interface SkillCoveragePoint {
  id: string;
  name: string;
  current: number;
  ambition: number;
  gap: number;
}

export function coverageForTeam(
  resolvedSkills: ResolvedSkill[],
  members: Array<{ tags?: string[] }>
): SkillCoveragePoint[] {
  return resolvedSkills.map((skill) => {
    const current = members.filter((m) => (m.tags ?? []).includes(skill.name)).length;
    return {
      id: skill.id,
      name: skill.name,
      current,
      ambition: skill.requiredHeadcount,
      gap: skill.requiredHeadcount - current,
    };
  });
}
