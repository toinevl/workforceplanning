export const SKILL_DICTIONARY = [
  'AI/ML', 'Data Engineering', 'Cloud', 'Cybersecurity', 'DevOps',
  'Backend', 'Frontend', 'Mobile', 'Embedded', 'Research',
  'Leadership', 'Communication', 'Strategy', 'Teaching', 'Fundraising',
] as const;

export type SkillName = (typeof SKILL_DICTIONARY)[number];

export interface RoleProfile {
  id: string;
  roleKey: string;
  roleName: string;
  skillTargets: Record<string, number>;
  isSquad?: boolean;
}

export interface MemberSkillAssignment {
  teamId: string;
  memberId: string;
  skills: string[];
}
