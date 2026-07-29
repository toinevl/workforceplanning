export const SKILL_DICTIONARY = [
  'AI/ML', 'Data Engineering', 'Cloud', 'Cybersecurity', 'DevOps',
  'Backend', 'Frontend', 'Mobile', 'Embedded', 'Research',
  'Leadership', 'Communication', 'Strategy', 'Teaching', 'Fundraising',
] as const;

export type SkillName = (typeof SKILL_DICTIONARY)[number];

export type SkillTargets = Partial<Record<SkillName, number>>;

export interface RoleProfile {
  id: string;
  roleKey: string;
  roleName: string;
  skillTargets: SkillTargets;
  isSquad?: boolean;
}

export interface SkillAssignment {
  memberId: string;
  teamId: string;
  skills: SkillName[];
}
