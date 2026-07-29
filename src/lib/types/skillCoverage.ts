import type { StaffMember } from './domain';
import type { RoleProfile, SkillName, SkillTargets } from './skills';

export interface StaffMemberWithSkills extends StaffMember {
  skills: SkillName[];
  roleProfile?: RoleProfile;
}

export interface TeamSkillCoverage {
  teamId: string;
  teamName: string;
  currentSkills: Record<SkillName, number>;
  ambitionSkills: Record<SkillName, number>;
  gapSkills: Record<SkillName, number>;
}

export interface SkillSummary {
  teamId: string;
  teamName: string;
  coverage: TeamSkillCoverage;
  membersWithSkills: StaffMemberWithSkills[];
}
