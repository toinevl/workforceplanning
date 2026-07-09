import { TableClient } from '@azure/data-tables';
import { getTableClient, ensureTablesExist } from './client';
import {
  TABLE_TEAMS, TABLE_STAFF, TABLE_SCENARIOS, TABLE_DEPARTMENTS,
  type TeamEntity, type StaffMemberEntity, type ScenarioEntity, type DepartmentEntity,
} from './tables';
import { v4 as uuidv4 } from 'uuid';
import { defaultParams } from '../types/params';
import type { ScenarioType } from '../types/domain';
import type { SeedOptions, SeedTeamConfig } from '../types/seed';

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
  // ── Applied Physics and Science Education (APSE) ──
  { key: 'apse-qnano',     name: 'Quantum Nanostructures',   color: '#6366f1', sortOrder: 0,  departmentKey: 'apse' },
  { key: 'apse-cnd',       name: 'Complex Networks & Devices', color: '#818cf8', sortOrder: 1,  departmentKey: 'apse' },
  { key: 'apse-cohesion',  name: 'Cohesion & Polymers',      color: '#a5b4fc', sortOrder: 2,  departmentKey: 'apse' },
  // ── Biomedical Engineering (BME) ──
  { key: 'bme-bmti',       name: 'Biomedical Technology',    color: '#0ea5e9', sortOrder: 3,  departmentKey: 'bme' },
  { key: 'bme-softmatter', name: 'Soft Tissue Engineering',  color: '#38bdf8', sortOrder: 4,  departmentKey: 'bme' },
  { key: 'bme-neuro',      name: 'Neuromechanics',           color: '#7dd3fc', sortOrder: 5,  departmentKey: 'bme' },
  // ── Built Environment (BE) ──
  { key: 'be-arch',        name: 'Architectural Design',     color: '#10b981', sortOrder: 6,  departmentKey: 'be' },
  { key: 'be-urban',       name: 'Urban Systems',            color: '#34d399', sortOrder: 7,  departmentKey: 'be' },
  { key: 'be-struct',      name: 'Structural Engineering',   color: '#6ee7b7', sortOrder: 8,  departmentKey: 'be' },
  // ── Chemical Engineering and Chemistry (CE&C) ──
  { key: 'cec-molcat',     name: 'Molecular Catalysis',      color: '#f59e0b', sortOrder: 9,  departmentKey: 'cec' },
  { key: 'cec-flowchem',   name: 'Flow Chemistry',           color: '#fbbf24', sortOrder: 10, departmentKey: 'cec' },
  { key: 'cec-matpoly',    name: 'Materials & Polymers',     color: '#fcd34d', sortOrder: 11, departmentKey: 'cec' },
  // ── Electrical Engineering (EE) ──
  { key: 'ee-eces',        name: 'Electronic Systems',       color: '#f43f5e', sortOrder: 12, departmentKey: 'ee' },
  { key: 'ee-phot',        name: 'Photonics & Semiconductor', color: '#fb7185', sortOrder: 13, departmentKey: 'ee' },
  { key: 'ee-sigproc',     name: 'Signal Processing',        color: '#fda4af', sortOrder: 14, departmentKey: 'ee' },
  // ── Industrial Design (ID) ──
  { key: 'id-sd',          name: 'Systemic Design',          color: '#8b5cf6', sortOrder: 15, departmentKey: 'id' },
  { key: 'id-pi',          name: 'Product Innovation',       color: '#a78bfa', sortOrder: 16, departmentKey: 'id' },
  { key: 'id-social',      name: 'Social Computing',         color: '#c4b5fd', sortOrder: 17, departmentKey: 'id' },
  // ── Industrial Engineering & Innovation Sciences (IE&IS) ──
  { key: 'ieis-opera',     name: 'Operations Research',      color: '#ec4899', sortOrder: 18, departmentKey: 'ieis' },
  { key: 'ieis-innovation', name: 'Innovation Sciences',     color: '#f472b6', sortOrder: 19, departmentKey: 'ieis' },
  { key: 'ieis-htsa',      name: 'Human-Technology',         color: '#f9a8d4', sortOrder: 20, departmentKey: 'ieis' },
  // ── Mathematics and Computer Science (MCS) ──
  { key: 'mcs-cs',         name: 'Computer Science',         color: '#14b8a6', sortOrder: 21, departmentKey: 'mcs' },
  { key: 'mcs-math',       name: 'Applied Mathematics',      color: '#2dd4bf', sortOrder: 22, departmentKey: 'mcs' },
  { key: 'mcs-crypto',     name: 'Cryptography & Security',  color: '#5eead4', sortOrder: 23, departmentKey: 'mcs' },
  // ── Mechanical Engineering (ME) ──
  { key: 'me-thermo',      name: 'Thermo-Fluids',            color: '#f97316', sortOrder: 24, departmentKey: 'me' },
  { key: 'me-dynamics',    name: 'Dynamics & Control',       color: '#fb923c', sortOrder: 25, departmentKey: 'me' },
  { key: 'me-materials',   name: 'Materials Technology',     color: '#fdba74', sortOrder: 26, departmentKey: 'me' },
];

const DEPARTMENTS = [
  { key: 'apse', name: 'Applied Physics & Science Education', color: '#6366f1', sortOrder: 0,  deptHead: 'Prof.dr. Kees Storm' },
  { key: 'bme',  name: 'Biomedical Engineering',              color: '#0ea5e9', sortOrder: 1,  deptHead: 'Prof.dr.ir. Jan van Hest' },
  { key: 'be',   name: 'Built Environment',                   color: '#10b981', sortOrder: 2,  deptHead: 'Prof.dr.ir. Theo Salet' },
  { key: 'cec',  name: 'Chemical Engineering & Chemistry',     color: '#f59e0b', sortOrder: 3,  deptHead: 'Prof.dr. Mark Boneschanscher' },
  { key: 'ee',   name: 'Electrical Engineering',               color: '#f43f5e', sortOrder: 4,  deptHead: '' },
  { key: 'id',   name: 'Industrial Design',                    color: '#8b5cf6', sortOrder: 5,  deptHead: 'Prof.dr. Lin-Lin Chen' },
  { key: 'ieis', name: 'Industrial Engineering & Innovation Sciences', color: '#ec4899', sortOrder: 6, deptHead: 'Prof.dr.ir. Geert-Jan van Houtum' },
  { key: 'mcs',  name: 'Mathematics & Computer Science',       color: '#14b8a6', sortOrder: 7,  deptHead: 'Prof.dr. Edwin van den Heuvel' },
  { key: 'me',   name: 'Mechanical Engineering',               color: '#f97316', sortOrder: 8,  deptHead: 'Prof.dr.ir. Patrick Anderson' },
  { key: 'svc',  name: 'Support Services',                     color: '#475569', sortOrder: 9,  deptHead: '' },
];

const DEFAULT_COLORS = ['#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#475569'];
const FIRST_NAMES = [
  'Daan', 'Sophie', 'Lars', 'Emma', 'Sem', 'Sara', 'Lucas', 'Mila', 'Bram', 'Tess',
  'Thijs', 'Lotte', 'Sven', 'Roos', 'Joris', 'Eva', 'Stijn', 'Anne', 'Pim', 'Fleur',
  'Niels', 'Maud', 'Bas', 'Lina', 'Ruben', 'Yara', 'Floris', 'Noor', 'Jelle', 'Iris',
  'Koen', 'Sanne', 'Wouter', 'Marieke', 'Rik', 'Anouk', 'Gert', 'Lotte', 'Pieter', 'Carlijn',
];
const LAST_NAMES = [
  'de Vries', 'Jansen', 'van den Berg', 'Bakker', 'de Boer', 'Visser', 'Smit', 'Mulder', 'de Groot', 'Bos',
  'Peters', 'Hendriks', 'van Dijk', 'Dijkstra', 'de Wit', 'van der Meer', 'Vink', 'Kroon', 'de Bruin', 'van der Linden',
];
const ROLES = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Postdoctoral Researcher',
  'PhD Candidate',
  'Research Engineer',
  'Lab Technician',
  'Program Manager',
  'Lecturer',
  'Scientific Programmer',
];

// 80 members total — generated across 27 teams (3 per team, ~8 per dept)
// SQUAD, retirement-risk, and varied FTE are computed from the team config
const MEMBERS: SeedMember[] = [
  // ── APSE: Quantum Nanostructures ──
  { name: 'Daan de Vries',       role: 'Professor',              fte: 1.0, isSquad: true,  baseTeamKey: 'apse-qnano',    birthYear: 1962, startDate: '1993-09-01', tags: ['SQUAD'] },
  { name: 'Sophie Jansen',       role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'apse-qnano',    birthYear: 1978, startDate: '2008-03-15' },
  { name: 'Lars van den Berg',   role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'apse-qnano',    birthYear: 1995, startDate: '2022-09-01' },
  // ── APSE: Complex Networks & Devices ──
  { name: 'Emma Bakker',         role: 'Assistant Professor',    fte: 0.8, isSquad: false, baseTeamKey: 'apse-cnd',      birthYear: 1988, startDate: '2016-02-01' },
  { name: 'Sem de Boer',         role: 'Postdoctoral Researcher', fte: 1.0, isSquad: false, baseTeamKey: 'apse-cnd',      birthYear: 1990, startDate: '2019-11-01' },
  { name: 'Sara Visser',         role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'apse-cnd',      birthYear: 1996, startDate: '2023-04-01' },
  // ── APSE: Cohesion & Polymers ──
  { name: 'Lucas Smit',          role: 'Professor',              fte: 1.0, isSquad: false, baseTeamKey: 'apse-cohesion', birthYear: 1970, startDate: '2001-06-01' },
  { name: 'Mila Mulder',         role: 'Research Engineer',      fte: 1.0, isSquad: false, baseTeamKey: 'apse-cohesion', birthYear: 1985, startDate: '2013-08-15' },
  { name: 'Bram de Groot',       role: 'Lab Technician',         fte: 0.6, isSquad: false, baseTeamKey: 'apse-cohesion', birthYear: 1968, startDate: '1998-01-15', notes: 'Near retirement' },

  // ── BME: Biomedical Technology ──
  { name: 'Tess Bos',            role: 'Professor',              fte: 1.0, isSquad: true,  baseTeamKey: 'bme-bmti',      birthYear: 1965, startDate: '1996-04-01', tags: ['SQUAD'] },
  { name: 'Thijs Peters',        role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'bme-bmti',      birthYear: 1980, startDate: '2010-09-01' },
  { name: 'Lotte Hendriks',      role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'bme-bmti',      birthYear: 1994, startDate: '2021-02-01' },
  // ── BME: Soft Tissue Engineering ──
  { name: 'Sven van Dijk',       role: 'Assistant Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'bme-softmatter', birthYear: 1986, startDate: '2015-03-01' },
  { name: 'Roos Dijkstra',       role: 'Postdoctoral Researcher', fte: 0.8, isSquad: false, baseTeamKey: 'bme-softmatter', birthYear: 1991, startDate: '2020-08-01' },
  { name: 'Joris de Wit',        role: 'Scientific Programmer',  fte: 1.0, isSquad: false, baseTeamKey: 'bme-softmatter', birthYear: 1989, startDate: '2018-05-01' },
  // ── BME: Neuromechanics ──
  { name: 'Eva van der Meer',    role: 'Professor',              fte: 1.0, isSquad: false, baseTeamKey: 'bme-neuro',     birthYear: 1975, startDate: '2005-07-01' },
  { name: 'Stijn Vink',          role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'bme-neuro',     birthYear: 1982, startDate: '2012-01-15' },
  { name: 'Anne Kroon',          role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'bme-neuro',     birthYear: 1997, startDate: '2023-09-01' },

  // ── BE: Architectural Design ──
  { name: 'Pim de Bruin',        role: 'Professor',              fte: 1.0, isSquad: true,  baseTeamKey: 'be-arch',       birthYear: 1960, startDate: '1991-03-01', tags: ['SQUAD'] },
  { name: 'Fleur van der Linden', role: 'Associate Professor',   fte: 0.8, isSquad: false, baseTeamKey: 'be-arch',       birthYear: 1979, startDate: '2009-09-01' },
  { name: 'Niels de Vries',      role: 'Lecturer',               fte: 1.0, isSquad: false, baseTeamKey: 'be-arch',       birthYear: 1987, startDate: '2016-04-01' },
  // ── BE: Urban Systems ──
  { name: 'Maud Jansen',         role: 'Assistant Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'be-urban',      birthYear: 1990, startDate: '2019-02-01' },
  { name: 'Bas van den Berg',    role: 'Research Engineer',      fte: 1.0, isSquad: false, baseTeamKey: 'be-urban',      birthYear: 1988, startDate: '2017-06-15' },
  { name: 'Lina Bakker',         role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'be-urban',      birthYear: 1996, startDate: '2022-09-01' },
  // ── BE: Structural Engineering ──
  { name: 'Ruben de Boer',       role: 'Professor',              fte: 1.0, isSquad: false, baseTeamKey: 'be-struct',     birthYear: 1972, startDate: '2003-08-01' },
  { name: 'Yara Visser',         role: 'Program Manager',        fte: 1.0, isSquad: false, baseTeamKey: 'be-struct',     birthYear: 1984, startDate: '2014-03-01' },
  { name: 'Floris Smit',         role: 'Postdoctoral Researcher', fte: 0.6, isSquad: false, baseTeamKey: 'be-struct',     birthYear: 1966, startDate: '1999-11-01', notes: 'Near retirement' },

  // ── CE&C: Molecular Catalysis ──
  { name: 'Noor Mulder',         role: 'Professor',              fte: 1.0, isSquad: true,  baseTeamKey: 'cec-molcat',    birthYear: 1968, startDate: '1997-07-01', tags: ['SQUAD'] },
  { name: 'Jelle de Groot',      role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'cec-molcat',    birthYear: 1981, startDate: '2011-09-01' },
  { name: 'Iris Bos',            role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'cec-molcat',    birthYear: 1995, startDate: '2022-02-01' },
  // ── CE&C: Flow Chemistry ──
  { name: 'Koen Peters',         role: 'Assistant Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'cec-flowchem',  birthYear: 1987, startDate: '2016-01-01' },
  { name: 'Sanne Hendriks',      role: 'Lab Technician',         fte: 0.8, isSquad: false, baseTeamKey: 'cec-flowchem',  birthYear: 1983, startDate: '2012-05-15' },
  { name: 'Wouter van Dijk',     role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'cec-flowchem',  birthYear: 1998, startDate: '2023-08-01' },
  // ── CE&C: Materials & Polymers ──
  { name: 'Marieke Dijkstra',    role: 'Professor',              fte: 1.0, isSquad: false, baseTeamKey: 'cec-matpoly',   birthYear: 1974, startDate: '2004-06-01' },
  { name: 'Rik de Wit',          role: 'Research Engineer',      fte: 1.0, isSquad: false, baseTeamKey: 'cec-matpoly',   birthYear: 1985, startDate: '2014-09-01' },
  { name: 'Anouk van der Meer',  role: 'Postdoctoral Researcher', fte: 1.0, isSquad: false, baseTeamKey: 'cec-matpoly',   birthYear: 1992, startDate: '2021-03-01' },

  // ── EE: Electronic Systems ──
  { name: 'Gert Vink',           role: 'Professor',              fte: 1.0, isSquad: true,  baseTeamKey: 'ee-eces',       birthYear: 1964, startDate: '1995-04-01', tags: ['SQUAD'] },
  { name: 'Lotte Kroon',         role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'ee-eces',       birthYear: 1977, startDate: '2008-10-01' },
  { name: 'Pieter de Bruin',     role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'ee-eces',       birthYear: 1996, startDate: '2022-09-01' },
  // ── EE: Photonics & Semiconductor ──
  { name: 'Carlijn van der Linden', role: 'Assistant Professor', fte: 1.0, isSquad: false, baseTeamKey: 'ee-phot',      birthYear: 1989, startDate: '2018-02-01' },
  { name: 'Daan de Vries',       role: 'Scientific Programmer',  fte: 0.8, isSquad: false, baseTeamKey: 'ee-phot',       birthYear: 1990, startDate: '2019-07-01' },
  { name: 'Sophie Jansen',       role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'ee-phot',       birthYear: 1998, startDate: '2023-09-01' },
  // ── EE: Signal Processing ──
  { name: 'Lars van den Berg',   role: 'Professor',              fte: 1.0, isSquad: false, baseTeamKey: 'ee-sigproc',    birthYear: 1971, startDate: '2002-08-01' },
  { name: 'Emma Bakker',         role: 'Associate Professor',    fte: 0.6, isSquad: false, baseTeamKey: 'ee-sigproc',    birthYear: 1969, startDate: '2000-03-15', notes: 'Near retirement' },
  { name: 'Sem de Boer',         role: 'Postdoctoral Researcher', fte: 1.0, isSquad: false, baseTeamKey: 'ee-sigproc',    birthYear: 1991, startDate: '2020-01-01' },

  // ── ID: Systemic Design ──
  { name: 'Sara Visser',         role: 'Professor',              fte: 1.0, isSquad: true,  baseTeamKey: 'id-sd',         birthYear: 1966, startDate: '1998-05-01', tags: ['SQUAD'] },
  { name: 'Lucas Smit',          role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'id-sd',         birthYear: 1980, startDate: '2010-09-01' },
  { name: 'Mila Mulder',         role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'id-sd',         birthYear: 1995, startDate: '2022-04-01' },
  // ── ID: Product Innovation ──
  { name: 'Bram de Groot',       role: 'Assistant Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'id-pi',         birthYear: 1986, startDate: '2015-03-01' },
  { name: 'Tess Bos',            role: 'Lecturer',               fte: 0.8, isSquad: false, baseTeamKey: 'id-pi',         birthYear: 1988, startDate: '2017-09-01' },
  { name: 'Thijs Peters',        role: 'Research Engineer',      fte: 1.0, isSquad: false, baseTeamKey: 'id-pi',         birthYear: 1993, startDate: '2021-02-01' },
  // ── ID: Social Computing ──
  { name: 'Lotte Hendriks',      role: 'Professor',              fte: 1.0, isSquad: false, baseTeamKey: 'id-social',     birthYear: 1973, startDate: '2004-01-01' },
  { name: 'Sven van Dijk',       role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'id-social',     birthYear: 1982, startDate: '2012-06-15' },
  { name: 'Roos Dijkstra',       role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'id-social',     birthYear: 1997, startDate: '2023-08-01' },

  // ── IE&IS: Operations Research ──
  { name: 'Joris de Wit',        role: 'Professor',              fte: 1.0, isSquad: true,  baseTeamKey: 'ieis-opera',    birthYear: 1963, startDate: '1994-09-01', tags: ['SQUAD'] },
  { name: 'Eva van der Meer',    role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'ieis-opera',    birthYear: 1979, startDate: '2009-03-01' },
  { name: 'Stijn Vink',          role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'ieis-opera',    birthYear: 1994, startDate: '2021-09-01' },
  // ── IE&IS: Innovation Sciences ──
  { name: 'Anne Kroon',          role: 'Assistant Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'ieis-innovation', birthYear: 1988, startDate: '2016-11-01' },
  { name: 'Pim de Bruin',        role: 'Program Manager',        fte: 1.0, isSquad: false, baseTeamKey: 'ieis-innovation', birthYear: 1985, startDate: '2014-04-01' },
  { name: 'Fleur van der Linden', role: 'Postdoctoral Researcher', fte: 0.6, isSquad: false, baseTeamKey: 'ieis-innovation', birthYear: 1960, startDate: '1990-02-01', notes: 'Retirement-eligible' },
  // ── IE&IS: Human-Technology ──
  { name: 'Niels de Vries',      role: 'Professor',              fte: 1.0, isSquad: false, baseTeamKey: 'ieis-htsa',     birthYear: 1976, startDate: '2006-07-01' },
  { name: 'Maud Jansen',         role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'ieis-htsa',     birthYear: 1983, startDate: '2013-09-15' },
  { name: 'Bas van den Berg',    role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'ieis-htsa',     birthYear: 1996, startDate: '2022-03-01' },

  // ── MCS: Computer Science ──
  { name: 'Lina Bakker',         role: 'Professor',              fte: 1.0, isSquad: true,  baseTeamKey: 'mcs-cs',        birthYear: 1967, startDate: '1998-08-01', tags: ['SQUAD'] },
  { name: 'Ruben de Boer',       role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'mcs-cs',        birthYear: 1980, startDate: '2010-01-01' },
  { name: 'Yara Visser',         role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'mcs-cs',        birthYear: 1995, startDate: '2022-09-01' },
  // ── MCS: Applied Mathematics ──
  { name: 'Floris Smit',         role: 'Professor',              fte: 1.0, isSquad: false, baseTeamKey: 'mcs-math',      birthYear: 1972, startDate: '2003-05-01' },
  { name: 'Noor Mulder',         role: 'Assistant Professor',    fte: 0.8, isSquad: false, baseTeamKey: 'mcs-math',      birthYear: 1989, startDate: '2018-03-01' },
  { name: 'Jelle de Groot',      role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'mcs-math',      birthYear: 1997, startDate: '2023-04-01' },
  // ── MCS: Cryptography & Security ──
  { name: 'Iris Bos',            role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'mcs-crypto',    birthYear: 1984, startDate: '2013-07-01' },
  { name: 'Koen Peters',         role: 'Postdoctoral Researcher', fte: 1.0, isSquad: false, baseTeamKey: 'mcs-crypto',    birthYear: 1990, startDate: '2019-11-01' },
  { name: 'Sanne Hendriks',      role: 'Research Engineer',      fte: 0.6, isSquad: false, baseTeamKey: 'mcs-crypto',    birthYear: 1968, startDate: '1999-02-01', notes: 'Near retirement' },

  // ── ME: Thermo-Fluids ──
  { name: 'Wouter van Dijk',     role: 'Professor',              fte: 1.0, isSquad: true,  baseTeamKey: 'me-thermo',     birthYear: 1965, startDate: '1996-06-01', tags: ['SQUAD'] },
  { name: 'Marieke Dijkstra',    role: 'Associate Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'me-thermo',     birthYear: 1978, startDate: '2009-09-01' },
  { name: 'Rik de Wit',          role: 'PhD Candidate',          fte: 1.0, isSquad: false, baseTeamKey: 'me-thermo',     birthYear: 1994, startDate: '2021-08-01' },
  // ── ME: Dynamics & Control ──
  { name: 'Anouk van der Meer',  role: 'Assistant Professor',    fte: 1.0, isSquad: false, baseTeamKey: 'me-dynamics',   birthYear: 1987, startDate: '2016-04-01' },
  { name: 'Gert Vink',           role: 'Lecturer',               fte: 1.0, isSquad: false, baseTeamKey: 'me-dynamics',   birthYear: 1985, startDate: '2015-02-15' },
  { name: 'Lotte Kroon',         role: 'Program Manager',        fte: 0.8, isSquad: false, baseTeamKey: 'me-dynamics',   birthYear: 1983, startDate: '2013-10-01' },
  // ── ME: Materials Technology ──
  { name: 'Pieter de Bruin',     role: 'Professor',              fte: 1.0, isSquad: false, baseTeamKey: 'me-materials',  birthYear: 1970, startDate: '2001-03-01' },
  { name: 'Carlijn van der Linden', role: 'Associate Professor', fte: 1.0, isSquad: false, baseTeamKey: 'me-materials',  birthYear: 1981, startDate: '2011-06-01' },
  { name: 'Daan de Vries',       role: 'Postdoctoral Researcher', fte: 0.6, isSquad: false, baseTeamKey: 'me-materials',  birthYear: 1961, startDate: '1992-08-01', notes: 'Retirement-eligible' },
];

function buildMembers(options?: SeedOptions): SeedMember[] {
  const requested = options?.membersPerTeam;
  if (!requested) return MEMBERS;

  const byTeam = new Map<string, SeedMember[]>();
  for (const member of MEMBERS) {
    const arr = byTeam.get(member.baseTeamKey) ?? [];
    arr.push(member);
    byTeam.set(member.baseTeamKey, arr);
  }

  const selected: SeedMember[] = [];
  for (const team of TEAMS) {
    const teamMembers = byTeam.get(team.key) ?? [];
    selected.push(...teamMembers.slice(0, requested));
  }
  return selected;
}

function normalizeSeedTeams(options?: SeedOptions): SeedTeamConfig[] {
  if (!options?.teams || options.teams.length === 0) {
    return TEAMS.map((team) => ({
      id: `team-${team.key}`,
      key: team.key,
      name: team.name,
      color: team.color,
      members: options?.membersPerTeam ?? 8,
      retirees: 1,
      squad: team.sortOrder % 4 === 0 ? 1 : 0,
    }));
  }

  return options.teams
    .map((team, index) => {
      const members = clampWholeNumber(team.members, 1, 200);
      const id = team.id ?? `team-${slugify(team.name)}-${index + 1}`;
      return {
        id,
        key: team.key,
        name: team.name.trim() || `Team ${index + 1}`,
        color: /^#[0-9a-fA-F]{6}$/.test(team.color) ? team.color : DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        members,
        retirees: clampWholeNumber(team.retirees, 0, members),
        squad: clampWholeNumber(team.squad, 0, members),
      };
    })
    .slice(0, 24);
}

function clampWholeNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function buildConfiguredMembers(teams: SeedTeamConfig[]): SeedMember[] {
  const members: SeedMember[] = [];
  teams.forEach((team, teamIndex) => {
    for (let memberIndex = 0; memberIndex < team.members; memberIndex++) {
      const globalIndex = members.length;
      const isSquad = memberIndex < team.squad;
      const isRetiree = memberIndex < team.retirees;
      const firstName = FIRST_NAMES[globalIndex % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(teamIndex + memberIndex) % LAST_NAMES.length];
      members.push({
        name: `${firstName} ${lastName}`,
        role: isSquad ? 'SQUAD Specialist' : ROLES[(teamIndex + memberIndex) % ROLES.length],
        fte: memberIndex % 7 === 0 ? 0.8 : 1,
        isSquad,
        baseTeamKey: team.key ?? team.id ?? `custom-${teamIndex}`,
        birthYear: isRetiree ? 1960 + (memberIndex % 5) : 1982 + (memberIndex % 17),
        startDate: isRetiree ? `199${memberIndex % 10}-04-01` : `20${10 + (memberIndex % 14)}-06-15`,
        tags: isSquad ? ['SQUAD'] : [],
        notes: isRetiree ? 'Retirement planning profile' : undefined,
      });
    }
  });
  return members;
}

function computeRetirementEligibleYear(member: SeedMember): number | undefined {
  const candidates: number[] = [];
  if (member.birthYear) candidates.push(member.birthYear + 65);
  const startYear = new Date(member.startDate).getFullYear();
  candidates.push(startYear + 30);
  return candidates.length > 0 ? Math.min(...candidates) : undefined;
}

async function ensureDefaultDepartment(departmentClient: TableClient): Promise<void> {
  const now = new Date().toISOString();
  await departmentClient.upsertEntity<DepartmentEntity>({
    partitionKey: 'department',
    rowKey: 'default',
    name: 'Default',
    color: '#6b7280',
    sortOrder: 99,
    createdAt: now,
    updatedAt: now,
  }, 'Replace');
}

export async function runSeed(options?: SeedOptions): Promise<{ teams: number; members: number; scenarios: number }> {
  await ensureTablesExist();
  const configuredTeams = normalizeSeedTeams(options);
  const membersToSeed = options?.teams ? buildConfiguredMembers(configuredTeams) : buildMembers(options);

  const teamClient = getTableClient(TABLE_TEAMS);
  const staffClient = getTableClient(TABLE_STAFF);
  const scenarioClient = getTableClient(TABLE_SCENARIOS);
  const departmentClient = getTableClient(TABLE_DEPARTMENTS);
  const memberStateClient = getTableClient('scenarioMemberStates');
  const teamDriverClient = getTableClient('scenarioTeamDrivers');
  const snapshotsClient = getTableClient('scenarioSnapshots');

  if (options?.resetFirst) {
    await Promise.all([
      deleteByPartitionKey(teamClient, 'team'),
      deleteByPartitionKey(staffClient, 'member'),
      deleteByPartitionKey(scenarioClient, 'scenario'),
      deleteByPartitionKey(departmentClient, 'department'),
      deleteAllEntities(memberStateClient),
      deleteAllEntities(teamDriverClient),
      deleteAllEntities(snapshotsClient),
    ]);
  }

  // Create departments
  const now = new Date().toISOString();
  const departmentMap: Record<string, string> = {};
  for (const dept of DEPARTMENTS) {
    const deptId = uuidv4();
    departmentMap[dept.key] = deptId;
    await departmentClient.upsertEntity<DepartmentEntity>({
      partitionKey: 'department',
      rowKey: deptId,
      name: dept.name,
      color: dept.color,
      deptHead: dept.deptHead || undefined,
      sortOrder: dept.sortOrder,
      createdAt: now,
      updatedAt: now,
    }, 'Replace');
  }

  // Insert teams — assigned to their parent department explicitly
  const teamIdMap: Record<string, string> = {};
  for (const [index, team] of configuredTeams.entries()) {
    const id = team.id ?? `team-${slugify(team.name)}-${index + 1}`;
    teamIdMap[id] = id;
    if (team.key) teamIdMap[team.key] = id;
    teamIdMap[`custom-${index}`] = id;

    // Resolve department from the team's departmentKey, fall back to Support Services
    const teamMeta = TEAMS.find((t) => t.key === team.key);
    const assignedDeptId = teamMeta?.departmentKey
      ? departmentMap[teamMeta.departmentKey] ?? departmentMap['svc']
      : departmentMap['svc'];

    await teamClient.upsertEntity<TeamEntity>({
      partitionKey: 'team',
      rowKey: id,
      name: team.name,
      color: team.color,
      sortOrder: index,
      departmentId: assignedDeptId,
    }, 'Replace');
  }

  // Ensure default department is created (idempotent sentinel pattern)
  await ensureDefaultDepartment(departmentClient);

  // Insert staff members
  for (const member of membersToSeed) {
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

  return { teams: configuredTeams.length, members: membersToSeed.length, scenarios: scenariosToCreate.length };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'team';
}

async function deleteByPartitionKey(client: ReturnType<typeof getTableClient>, partitionKey: string): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];
  for await (const entity of client.listEntities({ queryOptions: { filter: `PartitionKey eq '${partitionKey}'` } })) {
    tasks.push(client.deleteEntity(entity.partitionKey as string, entity.rowKey as string).catch(() => undefined));
  }
  await Promise.all(tasks);
}

async function deleteAllEntities(client: ReturnType<typeof getTableClient>): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];
  for await (const entity of client.listEntities()) {
    tasks.push(client.deleteEntity(entity.partitionKey as string, entity.rowKey as string).catch(() => undefined));
  }
  await Promise.all(tasks);
}
