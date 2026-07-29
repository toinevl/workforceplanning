import type { RoleProfile } from '../types/skills';
export const SKILL_DICTIONARY = [
  'AI/ML', 'Data Engineering', 'Cloud', 'Cybersecurity', 'DevOps',
  'Backend', 'Frontend', 'Mobile', 'Embedded', 'Research',
  'Leadership', 'Communication', 'Strategy', 'Teaching', 'Fundraising',
] as const;
export type SkillName = (typeof SKILL_DICTIONARY)[number];
export interface MemberSkillProfile {
  skills: string[];
  roleKeys: string[];
}
export interface SkillAmbitionPoint {
  skill: string;
  raw: number;
  smoothed: number;
}
export interface TeamSkillCoverage {
  teamId: string;
  teamName: string;
  currentSkills: Record<string, number>;
  skillAmbitions: SkillAmbitionPoint[];
  gapSkills: Record<string, number>;
}
type BaseSamples = Record<string, number>;
const ROLE_PROFILE_BY_KEY: Record<string, RoleProfile> = {
  professor: {
    id: 'professor',
    roleKey: 'professor',
    roleName: 'Professor',
    skillTargets: { Research: 4, Teaching: 3, Strategy: 3, Leadership: 4, Communication: 2, 'AI/ML': 2, Fundraising: 3 },
    isSquad: false,
  },
  'associate-professor': {
    id: 'associate-professor',
    roleKey: 'associate-professor',
    roleName: 'Associate Professor',
    skillTargets: { Research: 4, Teaching: 2, Strategy: 2, Leadership: 2, Communication: 2, 'AI/ML': 2 },
    isSquad: false,
  },
  'assistant-professor': {
    id: 'assistant-professor',
    roleKey: 'assistant-professor',
    roleName: 'Assistant Professor',
    skillTargets: { Research: 4, Teaching: 2, Strategy: 1, Leadership: 1, Communication: 2, 'AI/ML': 2 },
    isSquad: false,
  },
  postdoc: {
    id: 'postdoc',
    roleKey: 'postdoc',
    roleName: 'Postdoctoral Researcher',
    skillTargets: { Research: 5, Communication: 2, 'AI/ML': 2 },
    isSquad: false,
  },
  'phd-candidate': {
    id: 'phd-candidate',
    roleKey: 'phd-candidate',
    roleName: 'PhD Candidate',
    skillTargets: { Research: 5, Communication: 1, 'AI/ML': 1 },
    isSquad: false,
  },
  'research-engineer': {
    id: 'research-engineer',
    roleKey: 'research-engineer',
    roleName: 'Research Engineer',
    skillTargets: { Research: 3, Backend: 3, DevOps: 2, Cloud: 2, 'AI/ML': 2, Communication: 1 },
    isSquad: false,
  },
  'lab-technician': {
    id: 'lab-technician',
    roleKey: 'lab-technician',
    roleName: 'Lab Technician',
    skillTargets: { Research: 2, Communication: 1, 'AI/ML': 1 },
    isSquad: false,
  },
  'program-manager': {
    id: 'program-manager',
    roleKey: 'program-manager',
    roleName: 'Program Manager',
    skillTargets: { Leadership: 3, Strategy: 3, Communication: 3, Fundraising: 3 },
    isSquad: false,
  },
  lecturer: {
    id: 'lecturer',
    roleKey: 'lecturer',
    roleName: 'Lecturer',
    skillTargets: { Teaching: 4, Communication: 3, Leadership: 1, Strategy: 1 },
    isSquad: false,
  },
  'scientific-programmer': {
    id: 'scientific-programmer',
    roleKey: 'scientific-programmer',
    roleName: 'Scientific Programmer',
    skillTargets: { Research: 2, Backend: 4, DevOps: 3, Cloud: 3, 'AI/ML': 3, Communication: 1 },
    isSquad: false,
  },
};
const PRIOR_ALPHA = 2;
export function getProfileForRole(role: string): RoleProfile | undefined {
  const key = role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return ROLE_PROFILE_BY_KEY[key];
}
export function roleKeyForRole(role: string): string {
  return role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function baseSamplesForRole(role: string): BaseSamples {
  const profile = getProfileForRole(role);
  if (!profile) {
    return {};
  }
  const samples: BaseSamples = {};
  for (const [skill, value] of Object.entries(profile.skillTargets)) {
    samples[skill] = PRIOR_ALPHA + value;
  }
  return samples;
}
export function skillTargetForRole(role: string): BaseSamples {
  const profile = getProfileForRole(role);
  if (!profile) {
    return {};
  }
  return Object.fromEntries(Object.entries(profile.skillTargets).map(([skill, value]) => [skill, value])) as BaseSamples;
}
const ROLE_KEY_CACHE = new Map<string, string[]>();
export function normalizeRoleKey(role: string): string {
  const cached = ROLE_KEY_CACHE.get(role);
  if (cached) {
    return cached[0];
  }
  const keys = [role, role.replace(/[^A-Za-z0-9]+/g, '-').replace(/^(senior|staff|principal|lead)\s+/i, '').replace(/-\s+/g, '-').trim()];
  ROLE_KEY_CACHE.set(role, keys);
  return keys[0];
}
export function roleKeysForMember(member: MemberSkillProfile): string[] {
  const keys: string[] = [];
  for (const role of member.roleKeys) {
    const primary = normalizeRoleKey(role);
    if (primary) {
      keys.push(primary);
    }
  }
  return keys;
}
function softmaxLike(samples: Record<string, number>): Record<string, number> {
  const entries = Object.entries(samples);
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  const smoothed: Record<string, number> = {};
  for (const [skill, value] of entries) {
    smoothed[skill] = value / total;
  }
  return smoothed;
}
export function teamAmbitionFromMembers(members: MemberSkillProfile[], includeCurrent: boolean = true): SkillAmbitionPoint[] {
  const rawSamples: Record<string, number> = {};
  const currentCounts: Record<string, number> = {};
  const observed = new Set<string>();
  let count = 0;
  for (const member of members) {
    const samples = baseSamplesForRole(member.roleKeys[0] ?? '');
    if (includeCurrent) {
      for (const skill of member.skills) {
        currentCounts[skill] = (currentCounts[skill] || 0) + 1;
        observed.add(skill);
      }
    }
    for (const [skill, value] of Object.entries(samples)) {
      rawSamples[skill] = (rawSamples[skill] || 0) + value;
      observed.add(skill);
    }
    count += 1;
  }
  if (count === 0) {
    return [];
  }
  const smoothed = softmaxLike(rawSamples);
  const maxVal = Math.max(...Object.values(smoothed), 1);
  const scaleMax = Math.max(maxVal, ...(Object.values(currentCounts)));
  return Array.from(observed)
    .map((skill) => ({
      skill,
      raw: rawSamples[skill] || 0,
      smoothed: ((smoothed[skill] || 0) * scaleMax) / maxVal,
    }))
    .filter((item) => item.raw > 0 || (currentCounts[item.skill] || 0) > 0)
    .sort((a, b) => b.raw - a.raw);
}
export function currentSkillCounts(members: MemberSkillProfile[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const member of members) {
    for (const skill of member.skills) {
      counts[skill] = (counts[skill] || 0) + 1;
    }
  }
  return counts;
}
export function coverageFromMembers(members: MemberSkillProfile[], teamId: string, teamName: string): TeamSkillCoverage {
  const ambition = teamAmbitionFromMembers(members);
  const current = currentSkillCounts(members);
  const gap: Record<string, number> = {};
  for (const point of ambition) {
    const currentValue = current[point.skill] || 0;
    gap[point.skill] = point.smoothed - currentValue;
  }
  return {
    teamId,
    teamName,
    currentSkills: current,
    skillAmbitions: ambition,
    gapSkills: gap,
  };
}
export function getRoleProfileForRole(role: string): RoleProfile | undefined {
  return getProfileForRole(role);
}
export const ROLE_PROFILES = Object.values(ROLE_PROFILE_BY_KEY);
