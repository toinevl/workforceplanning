export interface SeedTeamConfig {
  id?: string;
  key?: string;
  name: string;
  color: string;
  members: number;
  retirees: number;
  squad: number;
}

export interface SeedOptions {
  membersPerTeam?: number;
  resetFirst?: boolean;
  teams?: SeedTeamConfig[];
}
