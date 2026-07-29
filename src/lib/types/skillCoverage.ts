import type { StaffMember } from './domain';
import type { RoleProfile } from './skills';

export interface StaffMemberWithSkills extends StaffMember {
  skills: string[];
  roleProfile?: RoleProfile;
}

export interface TeamSkillCoverage {
  teamId: string;
  teamName: string;
  currentSkills: Record<string, number>;
  ambitionSkills: Record<string, number>;
  gapSkills: Record<string, number>;
}

export interface SkillSummary {
  teamId: string;
  teamName: string;
  coverage: TeamSkillCoverage;
  membersWithSkills: StaffMemberWithSkills[];
}
