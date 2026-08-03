# Department-Level Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the skill radar's role-profile-derived ambition with admin-owned, department-scoped skill sets (fixed skill list per department, per-team required-headcount overrides), managed from the existing department admin form.

**Architecture:** Two new JSON-string fields on existing Azure Table entities (`DepartmentEntity.skills`, `TeamEntity.skillOverrides`) — no new table. A new pure-logic module (`src/lib/skills/departmentSkills.ts`) owns validation, id derivation, and coverage computation, replacing the role-profile math in `roles.ts`. The `GET /api/teams?departmentId=X` response shape changes from three name-keyed Records to an ordered `SkillCoveragePoint[]`, so `DepartmentTeamRow` is updated in lockstep with the API in the same task.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Azure Table Storage (`@azure/data-tables`), TanStack Query, Playwright E2E (no unit test runner exists in this repo — all tests are Playwright, run against a real dev server + Azurite).

## Global Constraints

- No `any` — use proper types or `unknown` (project convention).
- Always use the `@/` import alias for files under `src/` (project convention), except within `src/lib/**` where existing sibling files use relative imports (`../types/domain`) — match the file you're editing.
- No comments unless the WHY is non-obvious (project convention).
- Azure Table Storage is schemaless — new entity fields need no migration, just add them to the TypeScript interfaces.
- Azurite must be running locally before any Playwright test run: `npm run azurite` (separate terminal, or already running — check with `ss -ltnp | grep 10000` before starting a second instance).
- Playwright tests in this plan use the main config (`npx playwright test`, `AUTH_DISABLED=true`, port 3000) and the `seededPage` fixture from `tests/fixtures.ts`, matching `tests/departments.spec.ts` / `tests/api.spec.ts` conventions.

---

### Task 1: Department skill sets — data model, persistence, validation

**Files:**
- Modify: `src/lib/db/tables.ts`
- Modify: `src/lib/types/domain.ts`
- Modify: `src/lib/db/mappers.ts`
- Create: `src/lib/skills/departmentSkills.ts`
- Modify: `src/lib/api/departments.ts`
- Modify: `src/app/api/departments/route.ts`
- Modify: `src/app/api/departments/[id]/route.ts`
- Modify: `src/lib/hooks/useDepartments.ts`
- Test: `tests/skills.spec.ts` (new)

**Interfaces:**
- Produces: `DepartmentSkill { id: string; name: string; requiredHeadcount: number; sortOrder: number }` and `DepartmentSkillInput { name: string; requiredHeadcount: number }` (both in `src/lib/types/domain.ts`); `Department.skills: DepartmentSkill[]` (always an array, never undefined, on the domain type).
- Produces: `parseDepartmentSkillsInput(input: unknown): { skills: DepartmentSkill[] } | { error: string }` and `slugifySkillName(name: string): string`, both exported from `src/lib/skills/departmentSkills.ts` — Task 4 (seed script) imports `slugifySkillName` for consistent id derivation.
- Consumes: nothing from other tasks (this is the foundation task).

- [ ] **Step 1: Write the failing test**

Create `tests/skills.spec.ts`:

```typescript
import { test, expect } from './fixtures';

test.describe('Department skills — data model', () => {
  test('POST /api/departments persists and returns a skills array', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: {
        name: 'Skills Test Dept',
        color: '#3b82f6',
        skills: [
          { name: 'Research', requiredHeadcount: 3 },
          { name: 'Leadership', requiredHeadcount: 1 },
        ],
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.skills).toEqual([
      { id: 'research', name: 'Research', requiredHeadcount: 3, sortOrder: 0 },
      { id: 'leadership', name: 'Leadership', requiredHeadcount: 1, sortOrder: 1 },
    ]);
  });

  test('PATCH /api/departments/[id] updates the skills array', async ({ seededPage: page }) => {
    const createRes = await page.request.post('/api/departments', {
      data: { name: 'Skills Patch Dept', color: '#3b82f6', skills: [{ name: 'Research', requiredHeadcount: 2 }] },
    });
    const { data: created } = await createRes.json();

    const patchRes = await page.request.patch(`/api/departments/${created.id}`, {
      data: {
        skills: [
          { name: 'Research', requiredHeadcount: 5 },
          { name: 'Teaching', requiredHeadcount: 2 },
        ],
      },
    });
    expect(patchRes.status()).toBe(200);
    const { data: updated } = await patchRes.json();
    expect(updated.skills).toEqual([
      { id: 'research', name: 'Research', requiredHeadcount: 5, sortOrder: 0 },
      { id: 'teaching', name: 'Teaching', requiredHeadcount: 2, sortOrder: 1 },
    ]);
  });

  test('rejects a skill with a negative requiredHeadcount', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: { name: 'Bad Dept', color: '#3b82f6', skills: [{ name: 'Research', requiredHeadcount: -1 }] },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects duplicate skill names within one department', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: {
        name: 'Dup Dept',
        color: '#3b82f6',
        skills: [
          { name: 'Research', requiredHeadcount: 1 },
          { name: 'research', requiredHeadcount: 2 },
        ],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/departments returns an empty skills array for a department created without any', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: { name: 'No Skills Dept', color: '#3b82f6' },
    });
    const { data } = await res.json();
    expect(data.skills).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts` (requires Azurite running: `npm run azurite` in another terminal first)
Expected: FAIL — `POST /api/departments` currently ignores `skills` in the body and `entityToDepartment` never returns a `skills` field, so `body.data.skills` is `undefined`, not the expected array. The "negative requiredHeadcount" and "duplicate names" tests currently return 201 (no validation exists yet), not 400.

- [ ] **Step 3: Add the domain types**

In `src/lib/types/domain.ts`, add after the `Department`/`DepartmentWithStats` block:

```typescript
export interface DepartmentSkill {
  id: string;
  name: string;
  requiredHeadcount: number;
  sortOrder: number;
}

export interface DepartmentSkillInput {
  name: string;
  requiredHeadcount: number;
}
```

Update the `Department` interface to add the field:

```typescript
export interface Department {
  id: string;
  name: string;
  description?: string;
  color: string;
  deptHead?: string;
  sortOrder: number;
  skills: DepartmentSkill[];
}
```

- [ ] **Step 4: Add the entity field**

In `src/lib/db/tables.ts`, add `skills?: string;` to `DepartmentEntity`:

```typescript
export interface DepartmentEntity extends TableEntity {
  partitionKey: 'department';
  rowKey: string;
  name: string;
  description?: string;
  color: string;
  deptHead?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  skills?: string;
}
```

- [ ] **Step 5: Update the mapper**

In `src/lib/db/mappers.ts`, update `entityToDepartment`:

```typescript
export function entityToDepartment(e: DepartmentEntity): Department {
  return {
    id: e.rowKey,
    name: e.name,
    description: e.description,
    color: e.color,
    deptHead: e.deptHead,
    sortOrder: e.sortOrder,
    skills: e.skills ? JSON.parse(e.skills) : [],
  };
}
```

- [ ] **Step 6: Create the departmentSkills module**

Create `src/lib/skills/departmentSkills.ts`:

```typescript
import type { DepartmentSkill } from '../types/domain';

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
```

- [ ] **Step 7: Wire persistence through the API layer**

In `src/lib/api/departments.ts`, add the `DepartmentSkill` import and update `createDepartment` and `updateDepartment`:

```typescript
import type { Department, DepartmentSkill } from '../types/domain';
```

```typescript
export async function createDepartment(
  name: string,
  color: string,
  description?: string,
  deptHead?: string,
  skills?: DepartmentSkill[]
): Promise<Department> {
  const departmentId = uuidv4();
  const timestamp = new Date().toISOString();

  const existingDepts = await getDepartments();
  const nextSortOrder = existingDepts.length > 0 ? Math.max(...existingDepts.map((d) => d.sortOrder)) + 1 : 1;

  const entity: DepartmentEntity = {
    partitionKey: 'department',
    rowKey: departmentId,
    name,
    description,
    color,
    deptHead,
    sortOrder: nextSortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
    skills: JSON.stringify(skills ?? []),
  };

  const client = getTableClient(TABLE_DEPARTMENTS);
  await client.upsertEntity(entity, 'Replace');

  return entityToDepartment(entity);
}
```

```typescript
export async function updateDepartment(
  id: string,
  updates: Partial<{
    name: string;
    color: string;
    description?: string;
    deptHead?: string;
    skills: DepartmentSkill[];
  }>
): Promise<Department> {
  assertValidId(id);
  const existing = await getDepartmentById(id);
  if (!existing) {
    throw new Error(`Department ${id} not found`);
  }

  const client = getTableClient(TABLE_DEPARTMENTS);
  const currentEntity = await client.getEntity<DepartmentEntity>('department', id);

  const { skills, ...rest } = updates;
  const updated: DepartmentEntity = {
    ...currentEntity,
    ...rest,
    updatedAt: new Date().toISOString(),
  };
  if (skills !== undefined) {
    updated.skills = JSON.stringify(skills);
  }

  await client.upsertEntity(updated, 'Replace');
  return entityToDepartment(updated);
}
```

- [ ] **Step 8: Validate in the route handlers**

In `src/app/api/departments/route.ts`, import and use the parser:

```typescript
import { NextResponse } from 'next/server';
import { getDepartmentsWithStats, createDepartment } from '@/lib/api/departments';
import { parseDepartmentSkillsInput } from '@/lib/skills/departmentSkills';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export async function GET() {
  const departments = await getDepartmentsWithStats();
  return NextResponse.json({ data: departments });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return NextResponse.json({ error: 'Missing or invalid name' }, { status: 400 });
  }

  if (!body.color || typeof body.color !== 'string' || !HEX_COLOR_RE.test(body.color)) {
    return NextResponse.json({ error: 'Color must be a valid hex color (e.g. #a3b4c5)' }, { status: 400 });
  }

  const parsedSkills = parseDepartmentSkillsInput(body.skills);
  if ('error' in parsedSkills) {
    return NextResponse.json({ error: parsedSkills.error }, { status: 400 });
  }

  const { description, deptHead } = body;

  const created = await createDepartment(
    body.name.trim(),
    body.color.trim(),
    description,
    deptHead,
    parsedSkills.skills
  );

  return NextResponse.json({ data: created }, { status: 201 });
}
```

In `src/app/api/departments/[id]/route.ts`, update the `PATCH` handler:

```typescript
import { NextResponse } from 'next/server';
import { getDepartmentById, updateDepartment, deleteDepartment } from '@/lib/api/departments';
import { parseDepartmentSkillsInput } from '@/lib/skills/departmentSkills';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }
  const department = await getDepartmentById(id);

  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }

  return NextResponse.json({ data: department });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await req.json();

  const { name, color, description, deptHead, skills } = body;
  if (
    name === undefined &&
    color === undefined &&
    description === undefined &&
    deptHead === undefined &&
    skills === undefined
  ) {
    return NextResponse.json({ error: 'At least one field must be provided for update' }, { status: 400 });
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return NextResponse.json({ error: 'Name must be a non-empty string if provided' }, { status: 400 });
  }

  if (color !== undefined && (typeof color !== 'string' || !HEX_COLOR_RE.test(color))) {
    return NextResponse.json({ error: 'Color must be a valid hex color (e.g. #a3b4c5)' }, { status: 400 });
  }

  const parsedSkills = skills !== undefined ? parseDepartmentSkillsInput(skills) : undefined;
  if (parsedSkills && 'error' in parsedSkills) {
    return NextResponse.json({ error: parsedSkills.error }, { status: 400 });
  }

  const updates: Partial<{
    name: string;
    color: string;
    description?: string;
    deptHead?: string;
    skills: import('@/lib/types/domain').DepartmentSkill[];
  }> = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color.trim();
  if (description !== undefined) updates.description = description;
  if (deptHead !== undefined) updates.deptHead = deptHead;
  if (parsedSkills) updates.skills = parsedSkills.skills;

  try {
    const updated = await updateDepartment(id, updates);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result = await deleteDepartment(id);

  if (result.deleted) {
    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } else {
    return NextResponse.json(
      {
        error: 'Cannot delete department with assigned teams',
        assignedTeamCount: result.assignedTeamCount,
      },
      { status: 409 }
    );
  }
}
```

(The inline `import('@/lib/types/domain').DepartmentSkill[]` avoids adding a second top-level type import purely for one annotation — if you prefer, add `import type { DepartmentSkill } from '@/lib/types/domain';` at the top instead and use `DepartmentSkill[]` directly. Either is fine; prefer the top-level import for readability.)

- [ ] **Step 9: Fix the Unassigned-bucket literal**

`Department.skills` is now a required field, so the synthetic "Unassigned" department literal in `getDepartmentsWithStats` (`src/lib/api/departments.ts`, the `result.push({...})` block with `id: 'unassigned'`) no longer satisfies the `Department` shape. Add the field:

```typescript
result.push({
  id: 'unassigned',
  name: 'Unassigned',
  description: 'Teams without a department',
  color: '#9CA3AF',
  deptHead: undefined,
  sortOrder: 999,
  skills: [],
  headcount,
  totalFte,
  teamCount: unassignedTeams.length,
});
```

- [ ] **Step 10: Update the mutation hook types**

In `src/lib/hooks/useDepartments.ts`, extend the create/update mutation body types:

```typescript
import type { Department, DepartmentWithStats, DepartmentSkillInput } from '../types/domain';
```

```typescript
export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      color: string;
      description?: string;
      deptHead?: string;
      skills?: DepartmentSkillInput[];
    }) =>
      fetchJSON<Department>('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      updates: Partial<{
        name: string;
        color: string;
        description?: string;
        deptHead?: string;
        skills: DepartmentSkillInput[];
      }>;
    }) =>
      fetchJSON<Department>(`/api/departments/${args.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.updates),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 12: Run full type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both pass.

- [ ] **Step 13: Commit**

```bash
git add src/lib/db/tables.ts src/lib/types/domain.ts src/lib/db/mappers.ts src/lib/skills/departmentSkills.ts src/lib/api/departments.ts src/app/api/departments/route.ts src/app/api/departments/[id]/route.ts src/lib/hooks/useDepartments.ts tests/skills.spec.ts
git commit -m "feat(skills): add department-owned skill sets (data model, API, validation)"
```

---

### Task 2: Team skill overrides — data model, persistence, validation

**Files:**
- Modify: `src/lib/db/tables.ts`
- Modify: `src/lib/types/domain.ts`
- Modify: `src/lib/db/mappers.ts`
- Modify: `src/lib/skills/departmentSkills.ts`
- Modify: `src/lib/api/teams.ts`
- Modify: `src/app/api/teams/[id]/route.ts`
- Modify: `src/lib/hooks/useTeams.ts`
- Test: `tests/skills.spec.ts`

**Interfaces:**
- Consumes: `Department.skills: DepartmentSkill[]` (Task 1), `getDepartmentById` from `src/lib/api/departments.ts` (pre-existing).
- Produces: `Team.skillOverrides: Record<string, number>` (always an object, never undefined, on the domain type); `parseSkillOverridesInput(input: unknown, validSkillIds: Set<string>): { skillOverrides: Record<string, number> } | { error: string }` exported from `src/lib/skills/departmentSkills.ts` — Task 6 (team override UI) relies on `Team.skillOverrides` being present on every team response.

- [ ] **Step 1: Write the failing test**

Append to `tests/skills.spec.ts`:

```typescript
test.describe('Team skill overrides', () => {
  async function createDeptWithSkill(page: import('@playwright/test').Page) {
    const res = await page.request.post('/api/departments', {
      data: { name: `Override Dept ${Date.now()}`, color: '#3b82f6', skills: [{ name: 'Research', requiredHeadcount: 3 }] },
    });
    const { data } = await res.json();
    return data as { id: string; skills: Array<{ id: string; name: string }> };
  }

  test('PATCH /api/teams/[id] persists a valid skillOverrides map', async ({ seededPage: page }) => {
    const dept = await createDeptWithSkill(page);
    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];

    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    const researchId = dept.skills[0].id;
    const patchRes = await page.request.patch(`/api/teams/${team.id}`, {
      data: { skillOverrides: { [researchId]: 7 } },
    });
    expect(patchRes.status()).toBe(200);
    const { data: updated } = await patchRes.json();
    expect(updated.skillOverrides).toEqual({ [researchId]: 7 });
  });

  test('rejects a skillOverrides key that is not one of the department\'s skill ids', async ({ seededPage: page }) => {
    const dept = await createDeptWithSkill(page);
    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];
    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    const res = await page.request.patch(`/api/teams/${team.id}`, {
      data: { skillOverrides: { 'not-a-real-skill': 2 } },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/teams returns an empty skillOverrides object for a team with none set', async ({ seededPage: page }) => {
    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    expect(teams[0].skillOverrides).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts`
Expected: FAIL — `PATCH /api/teams/[id]` currently silently drops unknown body fields (`skillOverrides` isn't in its allow-list), so `updated.skillOverrides` is `undefined`; the "reject unknown key" test currently gets 200, not 400.

- [ ] **Step 3: Add the domain type and entity field**

In `src/lib/types/domain.ts`, update `Team`:

```typescript
export interface Team {
  id: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  departmentId?: string;
  skillOverrides: Record<string, number>;
}
```

In `src/lib/db/tables.ts`, add to `TeamEntity`:

```typescript
export interface TeamEntity extends TableEntity {
  partitionKey: 'team';
  rowKey: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  departmentId?: string;
  skillOverrides?: string;
}
```

- [ ] **Step 4: Update the mapper**

In `src/lib/db/mappers.ts`, update `entityToTeam`:

```typescript
export function entityToTeam(e: TeamEntity): Team {
  return {
    id: e.rowKey,
    name: e.name,
    description: e.description,
    color: e.color,
    sortOrder: e.sortOrder,
    departmentId: e.departmentId,
    skillOverrides: e.skillOverrides ? JSON.parse(e.skillOverrides) : {},
  };
}
```

- [ ] **Step 5: Add the override parser**

In `src/lib/skills/departmentSkills.ts`, append:

```typescript
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
```

- [ ] **Step 6: Wire persistence through the API layer**

In `src/lib/api/teams.ts`, update `updateTeam`:

```typescript
export async function updateTeam(
  teamId: string,
  updates: Partial<{
    name: string;
    color: string;
    description?: string;
    departmentId?: string;
    skillOverrides: Record<string, number>;
  }>
): Promise<Team> {
  const client = getTableClient(TABLE_TEAMS);
  const existing = await client.getEntity<TeamEntity>('team', teamId);

  const { skillOverrides, ...rest } = updates;
  const updated: TeamEntity = {
    ...existing,
    ...rest,
  };

  if ('departmentId' in updates && updates.departmentId === undefined) {
    delete updated.departmentId;
  }
  if (skillOverrides !== undefined) {
    updated.skillOverrides = JSON.stringify(skillOverrides);
  }

  await client.upsertEntity(updated, 'Replace');
  return entityToTeam(updated);
}
```

- [ ] **Step 7: Validate in the route handler**

In `src/app/api/teams/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getTeam, updateTeam } from '@/lib/api/teams';
import { getDepartmentById } from '@/lib/api/departments';
import { parseSkillOverridesInput } from '@/lib/skills/departmentSkills';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }
  return NextResponse.json({ data: team });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const team = await getTeam(id);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const body = await req.json();

  const updates: Partial<{
    name: string;
    color: string;
    description?: string;
    departmentId?: string;
    skillOverrides: Record<string, number>;
  }> = {};

  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if ('color' in body) {
    if (typeof body.color !== 'string') {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
    }
    updates.color = body.color;
  }

  if ('description' in body) {
    updates.description = body.description ?? undefined;
  }

  if ('departmentId' in body) {
    updates.departmentId = body.departmentId || undefined;
  }

  if ('skillOverrides' in body) {
    const departmentId = 'departmentId' in body ? updates.departmentId : team.departmentId;
    if (!departmentId) {
      return NextResponse.json({ error: 'Team has no department; cannot set skill overrides' }, { status: 400 });
    }
    const department = await getDepartmentById(departmentId);
    const validSkillIds = new Set((department?.skills ?? []).map((s) => s.id));
    const parsed = parseSkillOverridesInput(body.skillOverrides, validSkillIds);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    updates.skillOverrides = parsed.skillOverrides;
  }

  const updated = await updateTeam(id, updates);
  return NextResponse.json({ data: updated });
}
```

- [ ] **Step 8: Update the mutation hook type**

In `src/lib/hooks/useTeams.ts`:

```typescript
export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: string;
      updates: Partial<{
        name: string;
        color: string;
        description?: string;
        departmentId?: string;
        skillOverrides: Record<string, number>;
      }>;
    }) =>
      fetchJSON<Team>(`/api/teams/${args.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.updates),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts`
Expected: PASS (all 8 tests so far)

- [ ] **Step 10: Run full type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both pass.

- [ ] **Step 11: Commit**

```bash
git add src/lib/db/tables.ts src/lib/types/domain.ts src/lib/db/mappers.ts src/lib/skills/departmentSkills.ts src/lib/api/teams.ts src/app/api/teams/[id]/route.ts src/lib/hooks/useTeams.ts tests/skills.spec.ts
git commit -m "feat(skills): add per-team skill-headcount overrides (data model, API, validation)"
```

---

### Task 3: Coverage engine — resolve + compute, wire into the teams API, update the radar row

**Files:**
- Modify: `src/lib/skills/departmentSkills.ts`
- Modify: `src/lib/skills/roles.ts`
- Modify: `src/app/api/teams/route.ts`
- Modify: `src/components/departments/DepartmentTeamRow.tsx`
- Modify: `src/components/skills/SkillRadarChart.tsx`
- Test: `tests/skills.spec.ts`

**Interfaces:**
- Consumes: `Department.skills`, `Team.skillOverrides` (Tasks 1–2); `getAllTeams` (`src/lib/api/teams.ts`), `getAllMembers` (`src/lib/api/members.ts`), `getDepartmentById` (`src/lib/api/departments.ts`) — all pre-existing.
- Produces: `resolveTeamSkills(department: Pick<Department,'skills'>, team: Pick<Team,'skillOverrides'>): ResolvedSkill[]` and `coverageForTeam(resolvedSkills: ResolvedSkill[], members: Array<{ tags?: string[] }>): SkillCoveragePoint[]`, both exported from `src/lib/skills/departmentSkills.ts`. `SkillCoveragePoint = { id: string; name: string; current: number; ambition: number; gap: number }`. `GET /api/teams?departmentId=X` response's `skills` field changes from `{ current, ambition, gap }` (Records) to `SkillCoveragePoint[]` — Task 5's admin UI and Task 6's inline edit both read `SkillCoveragePoint[]`.

- [ ] **Step 1: Write the failing test**

Append to `tests/skills.spec.ts`:

```typescript
test.describe('Coverage computation', () => {
  test('GET /api/teams?departmentId=X uses department skills as axes, with team override applied', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: {
        name: `Coverage Dept ${Date.now()}`,
        color: '#3b82f6',
        skills: [
          { name: 'Research', requiredHeadcount: 3 },
          { name: 'Teaching', requiredHeadcount: 2 },
        ],
      },
    });
    const { data: dept } = await deptRes.json();
    const researchId = dept.skills[0].id;
    const teachingId = dept.skills[1].id;

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];

    await page.request.patch(`/api/teams/${team.id}`, {
      data: { departmentId: dept.id, skillOverrides: { [researchId]: 9 } },
    });

    const scopedRes = await page.request.get(`/api/teams?departmentId=${dept.id}`);
    expect(scopedRes.status()).toBe(200);
    const { data: scopedTeams } = await scopedRes.json();
    const scopedTeam = scopedTeams.find((t: { id: string }) => t.id === team.id);

    expect(scopedTeam.skills).toEqual([
      { id: researchId, name: 'Research', current: 0, ambition: 9, gap: 9 },
      { id: teachingId, name: 'Teaching', current: 0, ambition: 2, gap: 2 },
    ]);
  });

  test('a team in a department with no skills configured returns an empty skills array', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: { name: `Empty Skills Dept ${Date.now()}`, color: '#3b82f6' },
    });
    const { data: dept } = await deptRes.json();

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];
    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    const scopedRes = await page.request.get(`/api/teams?departmentId=${dept.id}`);
    const { data: scopedTeams } = await scopedRes.json();
    expect(scopedTeams.find((t: { id: string }) => t.id === team.id).skills).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts`
Expected: FAIL — `GET /api/teams?departmentId=X` still returns the old `{ current, ambition, gap }` Record shape computed from role profiles, not a `SkillCoveragePoint[]` reflecting department-configured skills.

- [ ] **Step 3: Add resolve + coverage to the departmentSkills module**

In `src/lib/skills/departmentSkills.ts`, add imports and append:

```typescript
import type { Department, DepartmentSkill, Team } from '../types/domain';
```

```typescript
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
```

(`DepartmentSkill` import is unused directly in this snippet but is re-exported implicitly via `Department['skills']` typing — if `type-check` flags it as unused, drop it from the import list.)

- [ ] **Step 4: Wire into the teams route**

Replace `src/app/api/teams/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getAllTeams } from '@/lib/api/teams';
import { getAllMembers } from '@/lib/api/members';
import { getDepartmentById } from '@/lib/api/departments';
import { resolveTeamSkills, coverageForTeam } from '@/lib/skills/departmentSkills';

export async function GET(req: Request) {
  const teams = await getAllTeams();

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  if (departmentId) {
    const filtered = teams.filter((t) => t.departmentId === departmentId);
    const [members, department] = await Promise.all([getAllMembers(), getDepartmentById(departmentId)]);
    const membersByTeam = new Map<string, typeof members>();
    for (const member of members) {
      const teamMembers = membersByTeam.get(member.baseTeamId) ?? [];
      teamMembers.push(member);
      membersByTeam.set(member.baseTeamId, teamMembers);
    }
    const teamsWithStats = filtered.map((team) => {
      const teamMembers = membersByTeam.get(team.id) ?? [];
      const totalFte = teamMembers.reduce((sum, member) => sum + member.fte, 0);
      const resolvedSkills = department ? resolveTeamSkills(department, team) : [];
      const skills = coverageForTeam(resolvedSkills, teamMembers);
      return {
        ...team,
        headcount: teamMembers.length,
        totalFte,
        skills,
      };
    });
    return NextResponse.json({ data: teamsWithStats });
  }

  return NextResponse.json({ data: teams });
}
```

- [ ] **Step 5: Remove the dead role-profile coverage functions**

In `src/lib/skills/roles.ts`, delete `ambitionForTeam`, `currentForTeam`, and `coverageForTeam` (lines 25–71 in the current file) — keep `RoleProfile`, `ROLE_PROFILES`, and `getRoleProfile`, which `src/lib/db/seed.ts`'s `deriveSkillsForRole` still needs. The file should end with `getRoleProfile` and nothing after it.

- [ ] **Step 6: Update DepartmentTeamRow to consume the new shape**

Replace `src/components/departments/DepartmentTeamRow.tsx`:

```tsx
'use client';

import type { TeamWithStats } from '@/lib/types/domain';
import { SkillRadarChart } from '@/components/skills/SkillRadarChart';
import { InfoHint } from '@/components/ui/InfoHint';

interface SkillCoveragePoint {
  id: string;
  name: string;
  current: number;
  ambition: number;
  gap: number;
}

interface DepartmentTeamRowProps {
  team: TeamWithStats & {
    skillOverrides?: Record<string, number>;
    skills?: SkillCoveragePoint[];
  };
}

export function DepartmentTeamRow({ team }: DepartmentTeamRowProps) {
  const skills = team.skills;
  const data = (skills ?? []).map((s) => ({ skill: s.name, current: s.current, ambition: s.ambition }));
  const sortedGaps = [...(skills ?? [])].sort((a, b) => b.gap - a.gap);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-4 p-4">
        <span
          className="w-3 h-3 rounded-full shrink-0 border border-gray-200"
          style={{ backgroundColor: team.color }}
          aria-hidden="true"
        />
        <p className="flex-1 text-sm font-bold text-gray-900">{team.name}</p>
        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-700">
          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1">{team.headcount} people</span>
          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1">{team.totalFte.toFixed(1)} FTE</span>
        </div>
      </div>
      <div className="border-t border-gray-100 bg-gray-50/50 p-4">
        {!skills ? (
          <div className="flex gap-2">
            <div className="h-48 flex-1 bg-gray-100 rounded animate-pulse" />
            <div className="h-48 flex-1 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : skills.length === 0 ? (
          <p className="text-xs text-gray-500">
            No skills configured for this department yet — add some in Settings → Departments.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <SkillRadarChart data={data} size={220} />
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
              <div className="mb-2 flex items-center gap-1">
                <h3 className="font-semibold text-gray-900">Skill coverage</h3>
                <InfoHint text="Ambition = required headcount set by the department (or overridden for this team). Gap = ambition minus current." />
              </div>
              <ul className="space-y-1">
                {sortedGaps.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4">
                    <span className="text-gray-700">{s.name}</span>
                    <span className="font-mono text-gray-900">
                      {s.gap > 0 ? '+' : ''}
                      {s.gap}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

(This removes the `.slice(0, 6)` cap from the old "Top skill gaps" list — every configured skill is now shown, since Task 6 makes each row editable and a skill hidden past the cap would be unreachable for editing. The list is still sorted gap-descending.)

- [ ] **Step 7: Update the SkillRadarChart tooltip copy**

In `src/components/skills/SkillRadarChart.tsx`, update the `InfoHint` text (near the bottom of the component):

```tsx
<InfoHint text="Current = skills present in the team today (counted from member tags). Ambition = required headcount set by the department (or overridden for this team). Gap = ambition minus current." />
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts`
Expected: PASS (all 10 tests so far)

- [ ] **Step 9: Run the full existing suite, type-check, and lint**

Run: `npm run type-check && npm run lint && npx playwright test`
Expected: all pass — this confirms removing the old `coverageForTeam`/`ambitionForTeam` didn't break any other caller (none exist outside `src/app/api/teams/route.ts`, which was just rewritten) and that `DepartmentTeamRow`'s new shape doesn't break `tests/departments.spec.ts`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/skills/departmentSkills.ts src/lib/skills/roles.ts src/app/api/teams/route.ts src/components/departments/DepartmentTeamRow.tsx src/components/skills/SkillRadarChart.tsx tests/skills.spec.ts
git commit -m "feat(skills): compute radar coverage from department skill sets instead of role profiles"
```

---

### Task 4: Seed script — default department skill sets

**Files:**
- Modify: `src/lib/db/seed.ts`
- Test: `tests/skills.spec.ts`

**Interfaces:**
- Consumes: `slugifySkillName` (Task 1, from `src/lib/skills/departmentSkills.ts`); `DepartmentEntity.skills` (Task 1); the existing `TEAMS`, `MEMBERS`, `DEPARTMENTS` arrays and `deriveSkillsForRole` function already in `seed.ts`.
- Produces: nothing new consumed elsewhere — this task only changes what data `runSeed()` writes.

- [ ] **Step 1: Write the failing test**

Append to `tests/skills.spec.ts`:

```typescript
test.describe('Seed script — default department skills', () => {
  test('a full reseed gives Applied Physics & Science Education a Research skill with a gap-0 baseline', async ({ page }) => {
    const seedRes = await page.request.post('/api/seed', { data: { resetFirst: true } });
    expect(seedRes.ok()).toBeTruthy();

    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const apse = departments.find((d: { name: string }) => d.name === 'Applied Physics & Science Education');
    expect(apse).toBeDefined();

    const research = apse.skills.find((s: { name: string }) => s.name === 'Research');
    expect(research).toBeDefined();
    expect(research.requiredHeadcount).toBeGreaterThan(0);

    const teamsRes = await page.request.get(`/api/teams?departmentId=${apse.id}`);
    const { data: teams } = await teamsRes.json();
    const totalCurrentResearch = teams.reduce((sum: number, t: { skills: Array<{ name: string; current: number }> }) => {
      const point = t.skills.find((s) => s.name === 'Research');
      return sum + (point?.current ?? 0);
    }, 0);
    expect(totalCurrentResearch).toBe(research.requiredHeadcount);
  });

  test('Support Services has no default skills configured', async ({ page }) => {
    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const svc = departments.find((d: { name: string }) => d.name === 'Support Services');
    expect(svc).toBeDefined();
    expect(svc.skills).toEqual([]);
  });
});
```

Note: this test uses the raw `page` fixture (not `seededPage`), since it needs a bare, non-custom-teams reseed (`resetFirst: true` with no `teams` array) to exercise the default 27-team/80-member seed path.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts`
Expected: FAIL — `runSeed` doesn't populate `skills` on any department yet, so `apse.skills` is `[]` and `research` is `undefined`.

- [ ] **Step 3: Add the default-skills builder**

In `src/lib/db/seed.ts`, add the import and a new function. Add to the top import block:

```typescript
import { getRoleProfile } from '../skills/roles';
import { slugifySkillName } from '../skills/departmentSkills';
import type { DepartmentSkill } from '../types/domain';
```

Add after `deriveSkillsForRole` (which already exists in the file):

```typescript
function buildDefaultDepartmentSkills(): Record<string, DepartmentSkill[]> {
  const teamKeyToDeptKey = new Map(TEAMS.map((t) => [t.key, t.departmentKey]));
  const headcountByDept = new Map<string, Map<string, number>>();

  for (const member of MEMBERS) {
    const deptKey = teamKeyToDeptKey.get(member.baseTeamKey);
    if (!deptKey) continue;
    const skillNames = deriveSkillsForRole(member.role, member.isSquad).filter((tag) => tag !== 'SQUAD');
    let bucket = headcountByDept.get(deptKey);
    if (!bucket) {
      bucket = new Map();
      headcountByDept.set(deptKey, bucket);
    }
    for (const skillName of skillNames) {
      bucket.set(skillName, (bucket.get(skillName) ?? 0) + 1);
    }
  }

  const result: Record<string, DepartmentSkill[]> = {};
  for (const [deptKey, bucket] of headcountByDept.entries()) {
    result[deptKey] = Array.from(bucket.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, requiredHeadcount], index) => ({
        id: slugifySkillName(name),
        name,
        requiredHeadcount,
        sortOrder: index,
      }));
  }
  return result;
}
```

- [ ] **Step 4: Wire it into the department-creation loop**

In `runSeed`, locate the department creation loop (`for (const dept of DEPARTMENTS) { ... }`). Add before the loop:

```typescript
const defaultDepartmentSkills = options?.teams ? {} : buildDefaultDepartmentSkills();
```

Update the `upsertEntity` call inside the loop to include `skills`:

```typescript
await departmentClient.upsertEntity<DepartmentEntity>({
  partitionKey: 'department',
  rowKey: deptId,
  name: dept.name,
  color: dept.color,
  deptHead: dept.deptHead || undefined,
  sortOrder: dept.sortOrder,
  createdAt: now,
  updatedAt: now,
  skills: JSON.stringify(defaultDepartmentSkills[dept.key] ?? []),
}, 'Replace');
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts`
Expected: PASS (all 12 tests so far)

- [ ] **Step 6: Reseed the local dev database**

Since this test suite calls `POST /api/seed` with `resetFirst: true` and no custom teams, it leaves the local Azurite database in the full default state (27 teams, 81 members, all 10 real departments with skills, matching the working state restored earlier this session) — no separate reseed step is needed after the test run.

- [ ] **Step 7: Run full type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/seed.ts tests/skills.spec.ts
git commit -m "feat(skills): derive default department skill sets from seed role-profile data"
```

---

### Task 5: Admin UI — Skills section in the department form

**Files:**
- Modify: `src/components/departments/DepartmentForm.tsx`
- Modify: `src/components/departments/DepartmentsSection.tsx`
- Test: `tests/skills.spec.ts`

**Interfaces:**
- Consumes: `DepartmentSkillInput`, `DepartmentSkill` (Task 1); `useCreateDepartment`, `useUpdateDepartment` (Task 1, already accept `skills`/`DepartmentSkillInput[]`).
- Produces: nothing new consumed by later tasks — this is a UI leaf.

- [ ] **Step 1: Write the failing test**

Append to `tests/skills.spec.ts`:

```typescript
test.describe('Admin UI — department skills', () => {
  test('creating a department with skills via the form shows them as radar axes', async ({ seededPage: page }) => {
    await page.goto('/settings');

    await page.getByPlaceholder('e.g., Engineering').fill('UI Skills Dept');
    await page.getByRole('button', { name: /add skill/i }).click();
    await page.getByPlaceholder('Skill name').fill('Research');
    await page.getByPlaceholder('Required headcount').fill('2');

    await page.getByRole('button', { name: 'Create Department' }).click();
    await expect(page.getByText('UI Skills Dept')).toBeVisible();

    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const dept = departments.find((d: { name: string }) => d.name === 'UI Skills Dept');
    expect(dept.skills).toEqual([{ id: 'research', name: 'Research', requiredHeadcount: 2, sortOrder: 0 }]);

    await page.goto(`/departments/${dept.id}`);
    await expect(page.getByText('No skills configured for this department yet')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts`
Expected: FAIL — `DepartmentForm` has no "Add skill" button or skill inputs yet.

- [ ] **Step 3: Add the Skills section to DepartmentForm**

Replace `src/components/departments/DepartmentForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ColorPicker } from './ColorPicker';
import { SectionLabel } from '@/components/ui/SectionLabel';
import type { Department, DepartmentSkillInput } from '@/lib/types/domain';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

interface DepartmentFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Department>;
  isLoading?: boolean;
  error?: string | null;
  onSubmit: (data: {
    name: string;
    color: string;
    description?: string;
    deptHead?: string;
    skills: DepartmentSkillInput[];
  }) => void;
  onCancel?: () => void;
}

const DEFAULT_COLOR = '#3b82f6';

function SkillRow({
  skill,
  onNameChange,
  onHeadcountChange,
  onRemove,
  disabled,
}: {
  skill: DepartmentSkillInput;
  onNameChange: (value: string) => void;
  onHeadcountChange: (value: number) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={skill.name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Skill name"
        disabled={disabled}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
      />
      <input
        type="number"
        min={0}
        step={1}
        value={skill.requiredHeadcount}
        onChange={(e) => onHeadcountChange(Number(e.target.value))}
        placeholder="Required headcount"
        disabled={disabled}
        className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${skill.name || 'skill'}`}
        className="rounded-lg border border-gray-300 px-2 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ×
      </button>
    </div>
  );
}

export function DepartmentForm({
  mode,
  initialData,
  isLoading = false,
  error,
  onSubmit,
  onCancel,
}: DepartmentFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [color, setColor] = useState(initialData?.color ?? DEFAULT_COLOR);
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [deptHead, setDeptHead] = useState(initialData?.deptHead ?? '');
  const [skills, setSkills] = useState<DepartmentSkillInput[]>(
    (initialData?.skills ?? []).map((s) => ({ name: s.name, requiredHeadcount: s.requiredHeadcount }))
  );

  function isValidColor(value: string) {
    return HEX_COLOR_REGEX.test(value.trim());
  }

  function isValidSkills() {
    return skills.every(
      (s) => s.name.trim().length > 0 && Number.isFinite(s.requiredHeadcount) && s.requiredHeadcount >= 0
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedColor = color.trim();

    if (!name.trim() || !isValidColor(trimmedColor) || !isValidSkills() || isLoading) {
      return;
    }

    const data: {
      name: string;
      color: string;
      description?: string;
      deptHead?: string;
      skills: DepartmentSkillInput[];
    } = {
      name: name.trim(),
      color: trimmedColor,
      skills: skills.map((s) => ({ name: s.name.trim(), requiredHeadcount: Math.trunc(s.requiredHeadcount) })),
    };
    if (description.trim()) data.description = description.trim();
    if (deptHead.trim()) data.deptHead = deptHead.trim();

    onSubmit(data);
  }

  const isSubmitDisabled = isLoading || !name.trim() || !isValidColor(color) || !isValidSkills();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <SectionLabel>
          Name <span className="text-red-500" aria-hidden="true">*</span>
        </SectionLabel>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Engineering"
          required
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <ColorPicker value={color} onChange={setColor} label="Color *" />
      </div>

      <div className="flex flex-col gap-1">
        <SectionLabel>Description</SectionLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Team charter, mission, notes..."
          disabled={isLoading}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <SectionLabel>Department Head</SectionLabel>
        <input
          type="text"
          value={deptHead}
          onChange={(e) => setDeptHead(e.target.value)}
          placeholder="e.g., Jane Smith"
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Skills</SectionLabel>
        <p className="text-xs text-gray-500">
          These apply to every team in this department. Teams can adjust the required headcount per skill, but
          not the skill set itself.
        </p>
        {skills.map((skill, index) => (
          <SkillRow
            key={index}
            skill={skill}
            disabled={isLoading}
            onNameChange={(value) =>
              setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, name: value } : s)))
            }
            onHeadcountChange={(value) =>
              setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, requiredHeadcount: value } : s)))
            }
            onRemove={() => setSkills((prev) => prev.filter((_, i) => i !== index))}
          />
        ))}
        <button
          type="button"
          onClick={() => setSkills((prev) => [...prev, { name: '', requiredHeadcount: 1 }])}
          disabled={isLoading}
          className="self-start rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add skill
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Working...' : mode === 'create' ? 'Create Department' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export type { DepartmentFormProps };
```

- [ ] **Step 4: Wire the submit handlers in DepartmentsSection**

In `src/components/departments/DepartmentsSection.tsx`, update the two submit handler signatures to accept `skills`:

```typescript
function handleCreateSubmit(data: {
  name: string;
  color: string;
  description?: string;
  deptHead?: string;
  skills: import('@/lib/types/domain').DepartmentSkillInput[];
}) {
  createMutation.mutate(data, {
    onSuccess: () => {
      createMutation.reset();
    },
  });
}

function handleUpdateSubmit(data: {
  name: string;
  color: string;
  description?: string;
  deptHead?: string;
  skills: import('@/lib/types/domain').DepartmentSkillInput[];
}) {
  if (!selectedDeptId) return;
  updateMutation.mutate(
    { id: selectedDeptId, updates: data },
    {
      onSuccess: () => {
        setSelectedDeptId(null);
        updateMutation.reset();
      },
    }
  );
}
```

(As in Task 1 Step 8, prefer adding `import type { DepartmentSkillInput } from '@/lib/types/domain';` at the top of the file and using `DepartmentSkillInput[]` directly instead of the inline `import()` — either compiles, top-level is more idiomatic here since two functions need the type.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts`
Expected: PASS (all 13 tests so far)

- [ ] **Step 6: Run full type-check, lint, and the full E2E suite**

Run: `npm run type-check && npm run lint && npx playwright test`
Expected: all pass — in particular confirm `tests/settings.spec.ts` (admin panel test) still passes since `DepartmentsSection` is rendered there.

- [ ] **Step 7: Commit**

```bash
git add src/components/departments/DepartmentForm.tsx src/components/departments/DepartmentsSection.tsx tests/skills.spec.ts
git commit -m "feat(skills): add Skills section to the department admin form"
```

---

### Task 6: Team-level inline required-headcount override UI

**Files:**
- Modify: `src/components/departments/DepartmentTeamRow.tsx`
- Test: `tests/skills.spec.ts`

**Interfaces:**
- Consumes: `useUpdateTeam` (Task 2, from `src/lib/hooks/useTeams.ts`); `SkillCoveragePoint`, `team.skillOverrides` (Task 3).
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Write the failing test**

Append to `tests/skills.spec.ts`:

```typescript
test.describe('Team-level skill override UI', () => {
  test('editing a skill\'s required headcount inline updates the gap and persists', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: { name: `Inline Edit Dept ${Date.now()}`, color: '#3b82f6', skills: [{ name: 'Research', requiredHeadcount: 3 }] },
    });
    const { data: dept } = await deptRes.json();

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];
    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    await page.goto(`/departments/${dept.id}`);

    const reqButton = page.getByRole('button', { name: /edit required headcount for research/i });
    await expect(reqButton).toHaveText('req: 3');
    await reqButton.click();

    const input = page.getByLabel(/edit required headcount for research/i).or(page.locator('input[type="number"]').first());
    await input.fill('9');
    await input.press('Enter');

    await expect(page.getByRole('button', { name: /edit required headcount for research/i })).toHaveText('req: 9');
    await expect(page.getByText('+9')).toBeVisible();
    await expect(page.getByRole('button', { name: 'reset' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: /edit required headcount for research/i })).toHaveText('req: 9');
  });

  test('resetting an overridden skill reverts it to the department default', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: { name: `Reset Dept ${Date.now()}`, color: '#3b82f6', skills: [{ name: 'Research', requiredHeadcount: 4 }] },
    });
    const { data: dept } = await deptRes.json();
    const researchId = dept.skills[0].id;

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];
    await page.request.patch(`/api/teams/${team.id}`, {
      data: { departmentId: dept.id, skillOverrides: { [researchId]: 10 } },
    });

    await page.goto(`/departments/${dept.id}`);
    await expect(page.getByRole('button', { name: /edit required headcount for research/i })).toHaveText('req: 10');

    await page.getByRole('button', { name: 'reset' }).click();
    await expect(page.getByRole('button', { name: /edit required headcount for research/i })).toHaveText('req: 4');
    await expect(page.getByRole('button', { name: 'reset' })).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts`
Expected: FAIL — the skill-gap list in `DepartmentTeamRow` is currently read-only text, no "Edit required headcount" button exists.

- [ ] **Step 3: Add the editable row component**

Replace `src/components/departments/DepartmentTeamRow.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { TeamWithStats } from '@/lib/types/domain';
import { SkillRadarChart } from '@/components/skills/SkillRadarChart';
import { InfoHint } from '@/components/ui/InfoHint';
import { useUpdateTeam } from '@/lib/hooks/useTeams';

interface SkillCoveragePoint {
  id: string;
  name: string;
  current: number;
  ambition: number;
  gap: number;
}

interface DepartmentTeamRowProps {
  team: TeamWithStats & {
    skillOverrides?: Record<string, number>;
    skills?: SkillCoveragePoint[];
  };
}

function EditableSkillGap({
  skill,
  isOverridden,
  onSave,
  onReset,
  isSaving,
}: {
  skill: SkillCoveragePoint;
  isOverridden: boolean;
  onSave: (skillId: string, value: number) => void;
  onReset: (skillId: string) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(skill.ambition));

  useEffect(() => {
    if (!editing) setDraft(String(skill.ambition));
  }, [skill.ambition, editing]);

  function commit() {
    const value = Number(draft);
    setEditing(false);
    if (!Number.isFinite(value) || value < 0 || Math.trunc(value) !== value) {
      setDraft(String(skill.ambition));
      return;
    }
    if (value !== skill.ambition) onSave(skill.id, value);
  }

  return (
    <li className="flex items-center justify-between gap-4">
      <span className="text-gray-700">{skill.name}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-gray-900">
          {skill.gap > 0 ? '+' : ''}
          {skill.gap}
        </span>
        {editing ? (
          <input
            type="number"
            min={0}
            step={1}
            autoFocus
            aria-label={`Edit required headcount for ${skill.name}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(String(skill.ambition));
                setEditing(false);
              }
            }}
            disabled={isSaving}
            className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={isSaving}
            aria-label={`Edit required headcount for ${skill.name}`}
            className="rounded border border-transparent px-1.5 py-0.5 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed"
          >
            req: {skill.ambition}
          </button>
        )}
        {isOverridden && (
          <button
            type="button"
            onClick={() => onReset(skill.id)}
            disabled={isSaving}
            className="text-xs text-gray-400 underline hover:text-gray-700 disabled:cursor-not-allowed"
          >
            reset
          </button>
        )}
      </span>
    </li>
  );
}

export function DepartmentTeamRow({ team }: DepartmentTeamRowProps) {
  const updateTeam = useUpdateTeam();
  const skills = team.skills;
  const data = (skills ?? []).map((s) => ({ skill: s.name, current: s.current, ambition: s.ambition }));
  const sortedGaps = [...(skills ?? [])].sort((a, b) => b.gap - a.gap);

  function handleSaveOverride(skillId: string, value: number) {
    const nextOverrides = { ...(team.skillOverrides ?? {}), [skillId]: value };
    updateTeam.mutate({ id: team.id, updates: { skillOverrides: nextOverrides } });
  }

  function handleResetOverride(skillId: string) {
    const nextOverrides = { ...(team.skillOverrides ?? {}) };
    delete nextOverrides[skillId];
    updateTeam.mutate({ id: team.id, updates: { skillOverrides: nextOverrides } });
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-4 p-4">
        <span
          className="w-3 h-3 rounded-full shrink-0 border border-gray-200"
          style={{ backgroundColor: team.color }}
          aria-hidden="true"
        />
        <p className="flex-1 text-sm font-bold text-gray-900">{team.name}</p>
        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-700">
          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1">{team.headcount} people</span>
          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1">{team.totalFte.toFixed(1)} FTE</span>
        </div>
      </div>
      <div className="border-t border-gray-100 bg-gray-50/50 p-4">
        {!skills ? (
          <div className="flex gap-2">
            <div className="h-48 flex-1 bg-gray-100 rounded animate-pulse" />
            <div className="h-48 flex-1 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : skills.length === 0 ? (
          <p className="text-xs text-gray-500">
            No skills configured for this department yet — add some in Settings → Departments.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <SkillRadarChart data={data} size={220} />
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
              <div className="mb-2 flex items-center gap-1">
                <h3 className="font-semibold text-gray-900">Skill coverage</h3>
                <InfoHint text="Ambition = required headcount set by the department (or overridden for this team). Click a skill's number to change this team's requirement. Gap = ambition minus current." />
              </div>
              <ul className="space-y-1">
                {sortedGaps.map((s) => (
                  <EditableSkillGap
                    key={s.id}
                    skill={s}
                    isOverridden={team.skillOverrides?.[s.id] !== undefined}
                    onSave={handleSaveOverride}
                    onReset={handleResetOverride}
                    isSaving={updateTeam.isPending}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts`
Expected: PASS (all 15 tests)

- [ ] **Step 5: Run the full suite, type-check, and lint one final time**

Run: `npm run type-check && npm run lint && npx playwright test`
Expected: all pass.

- [ ] **Step 6: Manual smoke check**

Run `npm run dev:full` (or `npm run dev` with Azurite already running), sign in (or run with `AUTH_DISABLED=true npx next dev` for a quick anonymous check), navigate to a department detail page with configured skills, click a skill's `req: N` button, change the value, confirm the radar chart and gap number update immediately, reload the page, confirm the change persisted, click "reset," confirm it reverts to the department default.

- [ ] **Step 7: Commit**

```bash
git add src/components/departments/DepartmentTeamRow.tsx tests/skills.spec.ts
git commit -m "feat(skills): inline edit for per-team skill required-headcount overrides"
```

---

## Post-plan checklist

- [ ] Update `wishlist.md` — mark `#40` and its parts `#40a`–`#40g` as `[x]` DONE, with a short summary line (matching the style of `#39`'s closing summary).
- [ ] Update `docs/superpowers/specs/2026-08-03-department-skills-design.md` status if the design changed materially during implementation (it shouldn't have — this plan followed the spec as written).
