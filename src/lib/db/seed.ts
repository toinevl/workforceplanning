import { getTableClient, ensureTablesExist } from './client';
import {
  TABLE_TEAMS, TABLE_STAFF, TABLE_SCENARIOS,
  type TeamEntity, type StaffMemberEntity, type ScenarioEntity,
} from './tables';
import { v4 as uuidv4 } from 'uuid';
import { defaultParams } from '../types/params';
import type { ScenarioType } from '../types/domain';

interface SeedMember {
  name: string;
  role: string;
  fte: number;
  isSquad: boolean;
  baseTeamKey: string;
  birthYear?: number;
  startDate: string;
  tags?: string[];
  notes?: string;
}

const TEAMS = [
  { key: 'alpha',   name: 'Team Alpha',   color: '#6366f1', sortOrder: 0 },
  { key: 'bravo',   name: 'Team Bravo',   color: '#0ea5e9', sortOrder: 1 },
  { key: 'charlie', name: 'Team Charlie', color: '#10b981', sortOrder: 2 },
  { key: 'delta',   name: 'Team Delta',   color: '#f59e0b', sortOrder: 3 },
  { key: 'echo',    name: 'Team Echo',    color: '#f43f5e', sortOrder: 4 },
  { key: 'foxtrot', name: 'Team Foxtrot', color: '#8b5cf6', sortOrder: 5 },
];

// 56 members total — 4 SQUAD, 8 retirement-risk, varied FTE
const MEMBERS: SeedMember[] = [
  // ── Team Alpha (10 members, 1 SQUAD) ──────────────────────────────
  { name: 'Alex Chen',        role: 'Senior Engineer',     fte: 1.0, isSquad: true,  baseTeamKey: 'alpha',   birthYear: 1968, startDate: '1995-03-01', tags: ['SQUAD'] },
  { name: 'Priya Sharma',     role: 'Engineering Manager', fte: 1.0, isSquad: false, baseTeamKey: 'alpha',   birthYear: 1972, startDate: '2001-09-15' },
  { name: 'James Okonkwo',    role: 'Backend Engineer',    fte: 1.0, isSquad: false, baseTeamKey: 'alpha',   birthYear: 1985, startDate: '2012-06-01' },
  { name: 'Sara Lindqvist',   role: 'Frontend Engineer',   fte: 0.8, isSquad: false, baseTeamKey: 'alpha',   birthYear: 1990, startDate: '2016-02-14' },
  { name: 'Marcus Webb',      role: 'DevOps Engineer',     fte: 1.0, isSquad: false, baseTeamKey: 'alpha',   birthYear: 1982, startDate: '2008-11-03' },
  { name: 'Fatima Al-Hassan', role: 'QA Engineer',         fte: 1.0, isSquad: false, baseTeamKey: 'alpha',   birthYear: 1988, startDate: '2015-04-20' },
  { name: 'Tom Bergström',    role: 'Data Engineer',       fte: 0.6, isSquad: false, baseTeamKey: 'alpha',   birthYear: 1979, startDate: '2005-07-18' },
  { name: 'Yuki Tanaka',      role: 'ML Engineer',         fte: 1.0, isSquad: false, baseTeamKey: 'alpha',   birthYear: 1993, startDate: '2019-01-07' },
  { name: 'Carlos Mendoza',   role: 'Platform Engineer',   fte: 1.0, isSquad: false, baseTeamKey: 'alpha',   birthYear: 1987, startDate: '2014-08-25' },
  { name: 'Elena Petrov',     role: 'Security Engineer',   fte: 0.8, isSquad: false, baseTeamKey: 'alpha',   birthYear: 1991, startDate: '2017-05-11' },

  // ── Team Bravo (9 members, 1 SQUAD) ──────────────────────────────
  { name: 'Sam Rivera',       role: 'Tech Lead',           fte: 1.0, isSquad: true,  baseTeamKey: 'bravo',   birthYear: 1970, startDate: '1997-06-15', tags: ['SQUAD'] },
  { name: 'Hannah Müller',    role: 'Product Owner',       fte: 1.0, isSquad: false, baseTeamKey: 'bravo',   birthYear: 1980, startDate: '2007-03-22' },
  { name: 'Kofi Asante',      role: 'Backend Engineer',    fte: 1.0, isSquad: false, baseTeamKey: 'bravo',   birthYear: 1986, startDate: '2013-10-01' },
  { name: 'Mei Lin',          role: 'Frontend Engineer',   fte: 1.0, isSquad: false, baseTeamKey: 'bravo',   birthYear: 1994, startDate: '2020-02-17' },
  { name: 'David Eriksson',   role: 'Full-Stack Engineer', fte: 0.8, isSquad: false, baseTeamKey: 'bravo',   birthYear: 1983, startDate: '2009-12-05' },
  { name: 'Aisha Kamara',     role: 'UX Designer',         fte: 1.0, isSquad: false, baseTeamKey: 'bravo',   birthYear: 1989, startDate: '2016-08-30' },
  { name: 'Luca Ferretti',    role: 'Backend Engineer',    fte: 1.0, isSquad: false, baseTeamKey: 'bravo',   birthYear: 1992, startDate: '2018-04-14' },
  { name: 'Nina Johansson',   role: 'QA Engineer',         fte: 0.6, isSquad: false, baseTeamKey: 'bravo',   birthYear: 1977, startDate: '2003-11-28' },
  { name: 'Omar Farouk',      role: 'DevOps Engineer',     fte: 1.0, isSquad: false, baseTeamKey: 'bravo',   birthYear: 1984, startDate: '2011-07-04' },

  // ── Team Charlie (10 members, 1 SQUAD) ────────────────────────────
  { name: 'Jordan Lee',       role: 'Principal Architect', fte: 1.0, isSquad: true,  baseTeamKey: 'charlie', birthYear: 1965, startDate: '1992-01-10', tags: ['SQUAD'] },
  { name: 'Sophie Dubois',    role: 'Engineering Manager', fte: 1.0, isSquad: false, baseTeamKey: 'charlie', birthYear: 1975, startDate: '2002-05-19' },
  { name: 'Raj Patel',        role: 'Senior Engineer',     fte: 1.0, isSquad: false, baseTeamKey: 'charlie', birthYear: 1981, startDate: '2008-09-08' },
  { name: 'Ingrid Holm',      role: 'Frontend Engineer',   fte: 1.0, isSquad: false, baseTeamKey: 'charlie', birthYear: 1996, startDate: '2021-03-01' },
  { name: 'Amara Diallo',     role: 'Data Scientist',      fte: 0.8, isSquad: false, baseTeamKey: 'charlie', birthYear: 1990, startDate: '2017-11-15' },
  { name: 'Kevin Walsh',      role: 'Backend Engineer',    fte: 1.0, isSquad: false, baseTeamKey: 'charlie', birthYear: 1987, startDate: '2014-06-23' },
  { name: 'Layla Hassan',     role: 'ML Engineer',         fte: 1.0, isSquad: false, baseTeamKey: 'charlie', birthYear: 1993, startDate: '2019-09-09' },
  { name: 'Pieter van Dijk',  role: 'Cloud Architect',     fte: 0.6, isSquad: false, baseTeamKey: 'charlie', birthYear: 1962, startDate: '1993-04-30', notes: 'Near retirement' },
  { name: 'Chiara Bianchi',   role: 'QA Lead',             fte: 1.0, isSquad: false, baseTeamKey: 'charlie', birthYear: 1985, startDate: '2012-01-16' },
  { name: 'Hugo Larsson',     role: 'Site Reliability',    fte: 1.0, isSquad: false, baseTeamKey: 'charlie', birthYear: 1988, startDate: '2015-10-27' },

  // ── Team Delta (9 members, 1 SQUAD) ──────────────────────────────
  { name: 'Taylor Kim',       role: 'Principal Engineer',  fte: 1.0, isSquad: true,  baseTeamKey: 'delta',   birthYear: 1967, startDate: '1994-09-20', tags: ['SQUAD'] },
  { name: 'Beatriz Santos',   role: 'Engineering Manager', fte: 1.0, isSquad: false, baseTeamKey: 'delta',   birthYear: 1978, startDate: '2005-02-14' },
  { name: "Finn O'Brien",     role: 'Backend Engineer',    fte: 1.0, isSquad: false, baseTeamKey: 'delta',   birthYear: 1991, startDate: '2018-07-30' },
  { name: 'Yara Nasser',      role: 'Frontend Engineer',   fte: 1.0, isSquad: false, baseTeamKey: 'delta',   birthYear: 1994, startDate: '2021-01-11' },
  { name: 'Stefan Krause',    role: 'Full-Stack Engineer', fte: 0.8, isSquad: false, baseTeamKey: 'delta',   birthYear: 1960, startDate: '1990-06-01', notes: 'Approaching retirement age' },
  { name: 'Adaeze Obi',       role: 'Data Engineer',       fte: 1.0, isSquad: false, baseTeamKey: 'delta',   birthYear: 1989, startDate: '2016-04-18' },
  { name: 'Marco Russo',      role: 'DevOps Engineer',     fte: 1.0, isSquad: false, baseTeamKey: 'delta',   birthYear: 1983, startDate: '2010-11-22' },
  { name: 'Hana Novak',       role: 'UX Designer',         fte: 0.6, isSquad: false, baseTeamKey: 'delta',   birthYear: 1995, startDate: '2022-03-07' },
  { name: 'Remi Okafor',      role: 'QA Engineer',         fte: 1.0, isSquad: false, baseTeamKey: 'delta',   birthYear: 1986, startDate: '2013-08-12' },

  // ── Team Echo (9 members, 0 SQUAD) ───────────────────────────────
  { name: 'Pat Morrison',     role: 'Engineering Manager', fte: 1.0, isSquad: false, baseTeamKey: 'echo',    birthYear: 1959, startDate: '1989-04-01', notes: 'Retirement-eligible in 2024' },
  { name: 'Zara Ahmed',       role: 'Senior Engineer',     fte: 1.0, isSquad: false, baseTeamKey: 'echo',    birthYear: 1982, startDate: '2009-06-15' },
  { name: 'Tobias Fischer',   role: 'Backend Engineer',    fte: 1.0, isSquad: false, baseTeamKey: 'echo',    birthYear: 1990, startDate: '2017-02-28' },
  { name: 'Nadia Kovacs',     role: 'Frontend Engineer',   fte: 0.8, isSquad: false, baseTeamKey: 'echo',    birthYear: 1993, startDate: '2020-09-14' },
  { name: 'Elijah Brooks',    role: 'Platform Engineer',   fte: 1.0, isSquad: false, baseTeamKey: 'echo',    birthYear: 1961, startDate: '1991-11-03', notes: 'Near retirement' },
  { name: 'Sana Malik',       role: 'Data Scientist',      fte: 1.0, isSquad: false, baseTeamKey: 'echo',    birthYear: 1988, startDate: '2015-07-20' },
  { name: 'Lars Andersen',    role: 'Cloud Engineer',      fte: 0.6, isSquad: false, baseTeamKey: 'echo',    birthYear: 1976, startDate: '2003-03-11' },
  { name: 'Amira El-Sayed',   role: 'QA Engineer',         fte: 1.0, isSquad: false, baseTeamKey: 'echo',    birthYear: 1996, startDate: '2022-06-06' },
  { name: 'Diego Varga',      role: 'Site Reliability',    fte: 1.0, isSquad: false, baseTeamKey: 'echo',    birthYear: 1984, startDate: '2011-04-25' },

  // ── Team Foxtrot (9 members, 0 SQUAD) ────────────────────────────
  { name: 'Isabel Carvalho',  role: 'Engineering Manager', fte: 1.0, isSquad: false, baseTeamKey: 'foxtrot', birthYear: 1977, startDate: '2004-01-19' },
  { name: 'Nico Weber',       role: 'Senior Engineer',     fte: 1.0, isSquad: false, baseTeamKey: 'foxtrot', birthYear: 1963, startDate: '1994-05-08', notes: 'Long-service, near retirement' },
  { name: 'Grace Osei',       role: 'Backend Engineer',    fte: 1.0, isSquad: false, baseTeamKey: 'foxtrot', birthYear: 1992, startDate: '2018-11-01' },
  { name: 'Viktor Sokolov',   role: 'Frontend Engineer',   fte: 0.8, isSquad: false, baseTeamKey: 'foxtrot', birthYear: 1989, startDate: '2016-06-13' },
  { name: 'Amelia Watkins',   role: 'Full-Stack Engineer', fte: 1.0, isSquad: false, baseTeamKey: 'foxtrot', birthYear: 1994, startDate: '2020-11-23' },
  { name: 'Chen Wei',         role: 'Data Engineer',       fte: 1.0, isSquad: false, baseTeamKey: 'foxtrot', birthYear: 1985, startDate: '2012-09-17' },
  { name: 'Isabeau Renard',   role: 'ML Engineer',         fte: 1.0, isSquad: false, baseTeamKey: 'foxtrot', birthYear: 1997, startDate: '2023-02-06' },
  { name: 'Kwame Boateng',    role: 'DevOps Engineer',     fte: 0.6, isSquad: false, baseTeamKey: 'foxtrot', birthYear: 1981, startDate: '2007-10-14' },
  { name: 'Petra Horáková',   role: 'QA Engineer',         fte: 1.0, isSquad: false, baseTeamKey: 'foxtrot', birthYear: 1987, startDate: '2014-03-29' },
];

function computeRetirementEligibleYear(member: SeedMember): number | undefined {
  const candidates: number[] = [];
  if (member.birthYear) candidates.push(member.birthYear + 65);
  const startYear = new Date(member.startDate).getFullYear();
  candidates.push(startYear + 30);
  return candidates.length > 0 ? Math.min(...candidates) : undefined;
}

export async function runSeed(): Promise<{ teams: number; members: number; scenarios: number }> {
  await ensureTablesExist();

  const teamClient = getTableClient(TABLE_TEAMS);
  const staffClient = getTableClient(TABLE_STAFF);
  const scenarioClient = getTableClient(TABLE_SCENARIOS);

  // Insert teams
  const teamIdMap: Record<string, string> = {};
  for (const team of TEAMS) {
    const id = `team-${team.key}`;
    teamIdMap[team.key] = id;
    await teamClient.upsertEntity<TeamEntity>({
      partitionKey: 'team',
      rowKey: id,
      name: team.name,
      color: team.color,
      sortOrder: team.sortOrder,
    }, 'Replace');
  }

  // Insert staff members
  for (const member of MEMBERS) {
    const id = uuidv4();
    const retirementEligibleYear = computeRetirementEligibleYear(member);
    await staffClient.upsertEntity<StaffMemberEntity>({
      partitionKey: 'member',
      rowKey: id,
      name: member.name,
      role: member.role,
      fte: member.fte,
      isSquad: member.isSquad,
      startDate: member.startDate,
      birthYear: member.birthYear,
      retirementEligibleYear,
      baseTeamId: teamIdMap[member.baseTeamKey],
      tags: JSON.stringify(member.tags ?? []),
      notes: member.notes,
    }, 'Replace');
  }

  // Create 3 scenarios with default parameters
  const scenariosToCreate: Array<{ type: ScenarioType; name: string; description: string }> = [
    { type: 'squad_removal',    name: 'SQUAD Removal',    description: 'Remove SQUAD-tagged FTEs. Select which members to remove and adjust the resulting team composition.' },
    { type: 'retirement_wave',  name: 'Retirement Wave',  description: 'Identify staff approaching retirement eligibility. Plan succession and knowledge transfer.' },
    { type: 'business_drivers', name: 'Business Drivers', description: 'Reorganize teams based on business priorities: grow, contain, or slim down each team.' },
  ];

  const now = new Date().toISOString();
  for (const s of scenariosToCreate) {
    const id = uuidv4();
    const parameters = JSON.stringify(defaultParams(s.type));
    await scenarioClient.upsertEntity<ScenarioEntity>({
      partitionKey: 'scenario',
      rowKey: id,
      type: s.type,
      name: s.name,
      description: s.description,
      status: 'active',
      parameters,
      createdAt: now,
      updatedAt: now,
    }, 'Replace');
  }

  return { teams: TEAMS.length, members: MEMBERS.length, scenarios: scenariosToCreate.length };
}
