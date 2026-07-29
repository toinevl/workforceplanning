export interface RoleProfile {
  id: string;
  roleName: string;
  skillTargets: Record<string, number>;
}

export const ROLE_PROFILES: RoleProfile[] = [
  { id: 'professor', roleName: 'Professor', skillTargets: { Research: 4, Teaching: 3, Leadership: 4, Strategy: 3, Communication: 2 } },
  { id: 'associate-professor', roleName: 'Associate Professor', skillTargets: { Research: 4, Teaching: 2, Leadership: 2, Strategy: 2, Communication: 2 } },
  { id: 'assistant-professor', roleName: 'Assistant Professor', skillTargets: { Research: 4, Teaching: 2, Leadership: 1, Strategy: 1, Communication: 2 } },
  { id: 'postdoc', roleName: 'Postdoctoral Researcher', skillTargets: { Research: 5, Communication: 2 } },
  { id: 'phd', roleName: 'PhD Candidate', skillTargets: { Research: 5, Communication: 1 } },
  { id: 'research-engineer', roleName: 'Research Engineer', skillTargets: { Research: 3, Backend: 3, DevOps: 2, Communication: 1 } },
  { id: 'scientific-programmer', roleName: 'Scientific Programmer', skillTargets: { Research: 2, Backend: 4, DevOps: 3, Communication: 1 } },
  { id: 'lab-technician', roleName: 'Lab Technician', skillTargets: { Research: 2, Communication: 1 } },
  { id: 'program-manager', roleName: 'Program Manager', skillTargets: { Leadership: 3, Strategy: 3, Communication: 3, Fundraising: 3 } },
  { id: 'lecturer', roleName: 'Lecturer', skillTargets: { Teaching: 4, Communication: 3, Leadership: 1 } },
];

export function getRoleProfile(role: string): RoleProfile['skillTargets'] {
  const found = ROLE_PROFILES.find((p) => p.roleName === role);
  return found?.skillTargets ?? {};
}

export function ambitionForTeam(team: Array<{ role: string }>): Record<string, number> {
  const aggregated: Record<string, number> = {};
  for (const member of team) {
    const targets = getRoleProfile(member.role);
    for (const [skill, value] of Object.entries(targets)) {
      aggregated[skill] = (aggregated[skill] || 0) + value;
    }
  }
  return aggregated;
}

export function currentForTeam(team: Array<{ skills?: string[] }>): Record<string, number> {
  const aggregated: Record<string, number> = {};
  for (const member of team) {
    for (const skill of member.skills ?? []) {
      aggregated[skill] = (aggregated[skill] || 0) + 1;
    }
  }
  return aggregated;
}

export function coverageForTeam(
  team: Array<{ role: string; skills?: string[] }>,
  teamName: string,
  teamId: string,
) {
  const ambition = ambitionForTeam(team);
  const current = currentForTeam(team);
  const allKeys = Array.from(new Set([...Object.keys(ambition), ...Object.keys(current)])).sort();
  const currentSkills: Record<string, number> = {};
  const ambitionSkills: Record<string, number> = {};
  const gapSkills: Record<string, number> = {};
  for (const key of allKeys) {
    const c = current[key] || 0;
    const a = ambition[key] || 0;
    currentSkills[key] = c;
    ambitionSkills[key] = a;
    gapSkills[key] = a - c;
  }
  return {
    teamId,
    teamName,
    currentSkills,
    ambitionSkills,
    gapSkills,
  };
}
