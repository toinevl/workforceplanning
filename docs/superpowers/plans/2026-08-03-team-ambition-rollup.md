# Team-Level Skill Ambition, Department Rollup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invert the department-skills feature's ambition direction — departments keep owning the skill *set* only; every team sets its own target headcount per skill (no department default, no override-with-fallback); the department detail page gains a rollup panel summing every team's current/ambition per skill.

**Architecture:** Rename `Team.skillOverrides` → `skillTargets` everywhere (it's the primary value now, not an override) and drop `DepartmentSkill.requiredHeadcount` entirely (departments only ever hold `{id, name, sortOrder}`). The coverage engine (`src/lib/skills/departmentSkills.ts`) simplifies — `resolveTeamSkills` no longer has a fallback to look up. A new client-side-only component sums the already-fetched per-team data for the rollup; no new API endpoint.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Azure Table Storage (`@azure/data-tables`), TanStack Query, Playwright E2E (no unit test runner — all tests are Playwright, run against a real dev server + Azurite).

## Global Constraints

- No `any` — use proper types or `unknown`.
- Use the `@/` import alias for files under `src/`, EXCEPT within `src/lib/**` where existing sibling files use relative imports (e.g. `../types/domain`) — match the file you're editing.
- No comments unless the WHY is non-obvious.
- This supersedes only the "Admin UI" and "Team-level override UI" sections of the prior department-skills spec (`docs/superpowers/specs/2026-08-03-department-skills-design.md`) — the rest (data model conventions, JSON-string storage pattern, validation approach) still holds and this plan follows it.
- Azurite must be running locally before any Playwright test run: `npm run azurite` (check `ss -ltnp | grep 10000` before starting a second instance if one may already be running).
- Tests use the main config (`npx playwright test`, `AUTH_DISABLED=true`, port 3000) and the `seededPage` fixture from `tests/fixtures.ts` (3 flat teams, all members carry empty tags except `SQUAD` — so `current` is always 0 for any non-`SQUAD` skill name under this fixture, no need to avoid `ROLE_PROFILES` vocabulary there). Tests using the bare `page` fixture with a full `resetFirst: true` reseed (no custom teams) DO get `ROLE_PROFILES`-derived tags on real members — pick skill names outside that vocabulary (`Research, Teaching, Leadership, Strategy, Communication, Backend, DevOps, Fundraising`) only in that path if determinism matters.
- The separate scenario-planning board (`TeamSkillBars.tsx`, `DecisionSummary.tsx`, `analysis.ts`) uses an entirely different, untouched role-profile skill system (`src/lib/skills/roles.ts`'s `roleProfile*` functions) — out of scope, do not touch.

---

### Task 1: Backend + API — rename to skillTargets, drop department requiredHeadcount

**Files:**
- Modify: `src/lib/types/domain.ts`
- Modify: `src/lib/db/tables.ts`
- Modify: `src/lib/db/mappers.ts`
- Modify: `src/lib/skills/departmentSkills.ts`
- Modify: `src/lib/api/departments.ts`
- Modify: `src/lib/api/teams.ts`
- Modify: `src/app/api/teams/[id]/route.ts`
- Modify: `src/lib/hooks/useTeams.ts`
- Modify: `tests/skills.spec.ts`

**Interfaces:**
- Produces: `DepartmentSkill { id: string; name: string; sortOrder: number }` (no `requiredHeadcount`); `Team.skillTargets: Record<string, number>` (renamed from `skillOverrides`, same shape); `parseSkillTargetsInput(input: unknown, validSkillIds: Set<string>): { skillTargets: Record<string, number> } | { error: string }` (renamed from `parseSkillOverridesInput`) — Tasks 3 and 5 consume `team.skillTargets` by this name.
- Consumes: nothing new from other tasks in this plan (this is the foundation task, same role as it played in the original department-skills plan).

- [ ] **Step 1: Write the failing test**

Replace the first four `test.describe` blocks in `tests/skills.spec.ts` (everything from the top of the file through the end of the `'Coverage computation'` block, i.e. lines 1–217 of the current file) with:

```typescript
import { test, expect } from './fixtures';

test.describe('Department skills — data model', () => {
  test('POST /api/departments persists and returns a skills array', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: {
        name: 'Skills Test Dept',
        color: '#3b82f6',
        skills: [{ name: 'Research' }, { name: 'Leadership' }],
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.skills).toEqual([
      { id: 'research', name: 'Research', sortOrder: 0 },
      { id: 'leadership', name: 'Leadership', sortOrder: 1 },
    ]);
  });

  test('PATCH /api/departments/[id] updates the skills array', async ({ seededPage: page }) => {
    const createRes = await page.request.post('/api/departments', {
      data: { name: 'Skills Patch Dept', color: '#3b82f6', skills: [{ name: 'Research' }] },
    });
    const { data: created } = await createRes.json();

    const patchRes = await page.request.patch(`/api/departments/${created.id}`, {
      data: { skills: [{ name: 'Research' }, { name: 'Teaching' }] },
    });
    expect(patchRes.status()).toBe(200);
    const { data: updated } = await patchRes.json();
    expect(updated.skills).toEqual([
      { id: 'research', name: 'Research', sortOrder: 0 },
      { id: 'teaching', name: 'Teaching', sortOrder: 1 },
    ]);
  });

  test('rejects duplicate skill names within one department', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: {
        name: 'Dup Dept',
        color: '#3b82f6',
        skills: [{ name: 'Research' }, { name: 'research' }],
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

test.describe('Team skill targets', () => {
  async function createDeptWithSkill(page: import('@playwright/test').Page) {
    const res = await page.request.post('/api/departments', {
      data: { name: `Target Dept ${Date.now()}`, color: '#3b82f6', skills: [{ name: 'Research' }] },
    });
    const { data } = await res.json();
    return data as { id: string; skills: Array<{ id: string; name: string }> };
  }

  test('PATCH /api/teams/[id] persists a valid skillTargets map', async ({ seededPage: page }) => {
    const dept = await createDeptWithSkill(page);
    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];

    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    const researchId = dept.skills[0].id;
    const patchRes = await page.request.patch(`/api/teams/${team.id}`, {
      data: { skillTargets: { [researchId]: 7 } },
    });
    expect(patchRes.status()).toBe(200);
    const { data: updated } = await patchRes.json();
    expect(updated.skillTargets).toEqual({ [researchId]: 7 });
  });

  test('rejects a skillTargets key that is not one of the department\'s skill ids', async ({ seededPage: page }) => {
    const dept = await createDeptWithSkill(page);
    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];
    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    const res = await page.request.patch(`/api/teams/${team.id}`, {
      data: { skillTargets: { 'not-a-real-skill': 2 } },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/teams returns an empty skillTargets object for a team with none set', async ({ seededPage: page }) => {
    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    expect(teams[0].skillTargets).toEqual({});
  });
});

test.describe('Stale skillTargets pruning on skill rename', () => {
  test('renaming a department skill prunes orphaned team targets so a later inline-style PATCH succeeds', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: { name: `Rename Dept ${Date.now()}`, color: '#3b82f6', skills: [{ name: 'Foo' }] },
    });
    const { data: dept } = await deptRes.json();
    const fooId = dept.skills[0].id;

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];

    const assignRes = await page.request.patch(`/api/teams/${team.id}`, {
      data: { departmentId: dept.id, skillTargets: { [fooId]: 5 } },
    });
    expect(assignRes.status()).toBe(200);
    const { data: assigned } = await assignRes.json();
    expect(assigned.skillTargets).toEqual({ [fooId]: 5 });

    const renameRes = await page.request.patch(`/api/departments/${dept.id}`, {
      data: { skills: [{ name: 'Bar' }] },
    });
    expect(renameRes.status()).toBe(200);
    const { data: renamedDept } = await renameRes.json();
    const barId = renamedDept.skills[0].id;
    expect(barId).not.toBe(fooId);

    const teamAfterRes = await page.request.get(`/api/teams/${team.id}`);
    const { data: teamAfter } = await teamAfterRes.json();
    expect(teamAfter.skillTargets).toEqual({});

    const inlinePatchRes = await page.request.patch(`/api/teams/${team.id}`, {
      data: { skillTargets: { ...teamAfter.skillTargets, [barId]: 8 } },
    });
    expect(inlinePatchRes.status()).toBe(200);
    const { data: finalTeam } = await inlinePatchRes.json();
    expect(finalTeam.skillTargets).toEqual({ [barId]: 8 });
  });
});

test.describe('Coverage computation', () => {
  test('GET /api/teams?departmentId=X uses department skills as axes, with each team\'s own target', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: {
        name: `Coverage Dept ${Date.now()}`,
        color: '#3b82f6',
        skills: [{ name: 'Woodworking' }, { name: 'Cartography' }],
      },
    });
    const { data: dept } = await deptRes.json();
    const woodworkingId = dept.skills[0].id;
    const cartographyId = dept.skills[1].id;

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];

    await page.request.patch(`/api/teams/${team.id}`, {
      data: { departmentId: dept.id, skillTargets: { [woodworkingId]: 9 } },
    });

    const scopedRes = await page.request.get(`/api/teams?departmentId=${dept.id}`);
    expect(scopedRes.status()).toBe(200);
    const { data: scopedTeams } = await scopedRes.json();
    const scopedTeam = scopedTeams.find((t: { id: string }) => t.id === team.id);

    expect(scopedTeam.skills).toEqual([
      { id: woodworkingId, name: 'Woodworking', current: 0, ambition: 9, gap: 9 },
      { id: cartographyId, name: 'Cartography', current: 0, ambition: 0, gap: 0 },
    ]);
  });

  test('an unset skill on a team defaults to ambition 0, not a department default', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: { name: `No Fallback Dept ${Date.now()}`, color: '#3b82f6', skills: [{ name: 'Sculpture' }] },
    });
    const { data: dept } = await deptRes.json();

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];
    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    const scopedRes = await page.request.get(`/api/teams?departmentId=${dept.id}`);
    const { data: scopedTeams } = await scopedRes.json();
    const scopedTeam = scopedTeams.find((t: { id: string }) => t.id === team.id);
    expect(scopedTeam.skills).toEqual([{ id: dept.skills[0].id, name: 'Sculpture', current: 0, ambition: 0, gap: 0 }]);
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

Leave everything from `test.describe('Seed script — default department skills', ...)` onward (the rest of the current file) untouched for now — Tasks 2–5 handle those blocks.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts`
Expected: FAIL — `body.data.skills` currently includes `requiredHeadcount` (extra field the new `toEqual` doesn't expect), `PATCH /api/teams/[id]` doesn't recognize a `skillTargets` body field yet (only `skillOverrides`), so `updated.skillTargets` is `undefined`.

- [ ] **Step 3: Update the domain types**

In `src/lib/types/domain.ts`, replace `DepartmentSkill` and `DepartmentSkillInput`:

```typescript
export interface DepartmentSkill {
  id: string;
  name: string;
  sortOrder: number;
}

export interface DepartmentSkillInput {
  name: string;
}
```

Update `Team`:

```typescript
export interface Team {
  id: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  departmentId?: string;
  skillTargets: Record<string, number>;
}
```

- [ ] **Step 4: Rename the entity field**

In `src/lib/db/tables.ts`, rename `TeamEntity.skillOverrides` → `skillTargets`:

```typescript
export interface TeamEntity extends TableEntity {
  partitionKey: 'team';
  rowKey: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  departmentId?: string;
  skillTargets?: string;
}
```

- [ ] **Step 5: Update the mapper**

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
    skillTargets: e.skillTargets ? JSON.parse(e.skillTargets) : {},
  };
}
```

- [ ] **Step 6: Simplify the departmentSkills module**

In `src/lib/skills/departmentSkills.ts`, replace `parseDepartmentSkillsInput` (drop `requiredHeadcount` validation entirely):

```typescript
export function parseDepartmentSkillsInput(
  input: unknown
): { skills: DepartmentSkill[] } | { error: string } {
  if (input === undefined) return { skills: [] };
  if (!Array.isArray(input)) return { error: 'skills must be an array' };

  const seenNames = new Set<string>();
  const idToName = new Map<string, string>();
  const skills: DepartmentSkill[] = [];

  for (const [index, raw] of input.entries()) {
    if (!raw || typeof raw !== 'object') {
      return { error: `Skill ${index + 1} is invalid` };
    }
    const item = raw as { name?: unknown };
    const name = String(item.name ?? '').trim();
    if (!name) return { error: `Skill ${index + 1} needs a name` };

    const lowerName = name.toLowerCase();
    if (seenNames.has(lowerName)) return { error: `Duplicate skill name: ${name}` };
    seenNames.add(lowerName);

    const id = slugifySkillName(name);
    const collidingName = idToName.get(id);
    if (collidingName !== undefined && collidingName !== name) {
      return { error: `Skills '${collidingName}' and '${name}' both produce the id '${id}' — use more distinct names` };
    }
    idToName.set(id, name);

    skills.push({ id, name, sortOrder: index });
  }

  return { skills };
}
```

Rename `parseSkillOverridesInput` → `parseSkillTargetsInput`:

```typescript
export function parseSkillTargetsInput(
  input: unknown,
  validSkillIds: Set<string>
): { skillTargets: Record<string, number> } | { error: string } {
  if (input === null) return { skillTargets: {} };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'skillTargets must be an object' };
  }

  const skillTargets: Record<string, number> = {};
  for (const [skillId, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (!validSkillIds.has(skillId)) {
      return { error: `Unknown skill id: ${skillId}` };
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return { error: `${skillId} must be a non-negative integer` };
    }
    skillTargets[skillId] = value;
  }

  return { skillTargets };
}
```

Simplify `resolveTeamSkills` — no more department-default fallback, since `DepartmentSkill` no longer carries a headcount:

```typescript
export interface ResolvedSkill {
  id: string;
  name: string;
  requiredHeadcount: number;
}

export function resolveTeamSkills(
  department: Pick<Department, 'skills'>,
  team: Pick<Team, 'skillTargets'>
): ResolvedSkill[] {
  const targets = team.skillTargets ?? {};
  return [...department.skills]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      requiredHeadcount: targets[skill.id] ?? 0,
    }));
}
```

`coverageForTeam` is unchanged — leave it exactly as-is.

- [ ] **Step 7: Rename the pruning function and update department persistence**

In `src/lib/api/departments.ts`, rename `pruneStaleTeamSkillOverrides` → `pruneStaleTeamSkillTargets`, operating on the renamed entity field:

```typescript
async function pruneStaleTeamSkillTargets(departmentId: string, validSkillIds: Set<string>): Promise<void> {
  const client = getTableClient(TABLE_TEAMS);
  const teams: TeamEntity[] = [];
  for await (const entity of client.listEntities<TeamEntity>({
    queryOptions: { filter: `PartitionKey eq 'team' and departmentId eq '${escapeSingleQuotes(departmentId)}'` },
  })) {
    teams.push(entity as TeamEntity);
  }

  for (const team of teams) {
    if (!team.skillTargets) continue;
    let targets: Record<string, number>;
    try {
      targets = JSON.parse(team.skillTargets);
    } catch {
      continue;
    }
    const entries = Object.entries(targets);
    const filtered = entries.filter(([skillId]) => validSkillIds.has(skillId));
    if (filtered.length === entries.length) continue;

    await client.upsertEntity(
      { ...team, skillTargets: JSON.stringify(Object.fromEntries(filtered)) },
      'Merge'
    );
  }
}
```

Update its call site inside `updateDepartment` (the function body itself is unchanged apart from this call):

```typescript
  if (skills !== undefined) {
    await pruneStaleTeamSkillTargets(id, new Set(skills.map((s) => s.id)));
  }
```

(The docstring comment above the function, if you keep one, should say "skillTargets" not "skillOverrides" — match whatever the existing comment already says, just with the renamed field/function.)

- [ ] **Step 8: Update team persistence**

In `src/lib/api/teams.ts`, rename the `updateTeam` parameter and field:

```typescript
export async function updateTeam(
  teamId: string,
  updates: Partial<{
    name: string;
    color: string;
    description?: string;
    departmentId?: string;
    skillTargets: Record<string, number>;
  }>
): Promise<Team> {
  const client = getTableClient(TABLE_TEAMS);
  const existing = await client.getEntity<TeamEntity>('team', teamId);

  const { skillTargets, ...rest } = updates;
  const updated: TeamEntity = {
    ...existing,
    ...rest,
  };

  if ('departmentId' in updates && updates.departmentId === undefined) {
    delete updated.departmentId;
  }
  if (skillTargets !== undefined) {
    updated.skillTargets = JSON.stringify(skillTargets);
  }

  await client.upsertEntity(updated, 'Replace');
  return entityToTeam(updated);
}
```

- [ ] **Step 9: Update the teams route**

Replace `src/app/api/teams/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getTeam, updateTeam } from '@/lib/api/teams';
import { getDepartmentById } from '@/lib/api/departments';
import { parseSkillTargetsInput } from '@/lib/skills/departmentSkills';

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
    skillTargets: Record<string, number>;
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
    if (updates.departmentId !== team.departmentId && !('skillTargets' in body)) {
      updates.skillTargets = {};
    }
  }

  if ('skillTargets' in body) {
    const departmentId = 'departmentId' in body ? updates.departmentId : team.departmentId;
    if (!departmentId) {
      return NextResponse.json({ error: 'Team has no department; cannot set skill targets' }, { status: 400 });
    }
    const department = await getDepartmentById(departmentId);
    const validSkillIds = new Set((department?.skills ?? []).map((s) => s.id));
    const parsed = parseSkillTargetsInput(body.skillTargets, validSkillIds);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    updates.skillTargets = parsed.skillTargets;
  }

  const updated = await updateTeam(id, updates);
  return NextResponse.json({ data: updated });
}
```

- [ ] **Step 10: Update the mutation hook type**

In `src/lib/hooks/useTeams.ts`, rename the `useUpdateTeam` updates field:

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
        skillTargets: Record<string, number>;
      }>;
    }) =>
      fetchJSON<Team>(`/api/teams/${args.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args.updates),
      }),
    onSuccess: () => {
      return qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts`
Expected: FAIL only on the tests belonging to the later describe blocks this task didn't touch (`Seed script`, `Admin UI`, `Team-level skill override UI`) — those still reference the old shapes and are Tasks 2–4's job. The four blocks this task rewrote should be green. Confirm by running just this task's blocks: `npx playwright test tests/skills.spec.ts -g "Department skills — data model|Team skill targets|Stale skillTargets pruning|Coverage computation"` — expect PASS (12 tests).

- [ ] **Step 12: Run type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: type-check will show errors in files Tasks 2–5 haven't fixed yet (`DepartmentForm.tsx`, `DepartmentTeamRow.tsx`, `seed.ts` all still reference the old `requiredHeadcount`/`skillOverrides` shapes) — that's expected at this point in the plan; those are fixed in later tasks. Confirm there are no NEW errors in the files this task touched (`domain.ts`, `tables.ts`, `mappers.ts`, `departmentSkills.ts`, `api/departments.ts`, `api/teams.ts`, `app/api/teams/[id]/route.ts`, `hooks/useTeams.ts`) beyond ones caused by their downstream consumers not being updated yet.

- [ ] **Step 13: Commit**

```bash
git add src/lib/types/domain.ts src/lib/db/tables.ts src/lib/db/mappers.ts src/lib/skills/departmentSkills.ts src/lib/api/departments.ts src/lib/api/teams.ts src/app/api/teams/[id]/route.ts src/lib/hooks/useTeams.ts tests/skills.spec.ts
git commit -m "feat(skills): rename skillOverrides to skillTargets, drop department requiredHeadcount"
```

---

### Task 2: Admin UI — remove the required-headcount input from the department form

**Files:**
- Modify: `src/components/departments/DepartmentForm.tsx`
- Modify: `tests/skills.spec.ts`

**Interfaces:**
- Consumes: `DepartmentSkillInput { name: string }` (Task 1).
- Produces: nothing new consumed by later tasks — `DepartmentsSection.tsx` needs no changes (its `DepartmentSkillInput[]` type references are structural, not field-specific, so they adapt automatically to the simplified type from Task 1).

- [ ] **Step 1: Write the failing test**

Replace the `'Admin UI — department skills'` describe block in `tests/skills.spec.ts` with:

```typescript
test.describe('Admin UI — department skills', () => {
  test('creating a department with a skill via the form shows it as a radar axis, with no headcount input', async ({ seededPage: page }) => {
    await page.goto('/departments');

    await expect(page.getByPlaceholder('Required headcount')).toHaveCount(0);

    await page.getByPlaceholder('e.g., Engineering').fill('UI Skills Dept');
    await page.getByRole('button', { name: /add skill/i }).click();
    await page.getByPlaceholder('Skill name').fill('Research');

    await Promise.all([
      page.waitForResponse((response) =>
        response.request().method() === 'POST' && response.request().url().includes('/api/departments')
      ),
      page.getByRole('button', { name: 'Create Department' }).click(),
    ]);

    await page.waitForLoadState('networkidle');

    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const dept = departments.find((d: { name: string }) => d.name === 'UI Skills Dept');
    expect(dept).toBeDefined();
    expect(dept.skills).toEqual([{ id: 'research', name: 'Research', sortOrder: 0 }]);

    await page.goto('/departments');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('UI Skills Dept').first()).toBeVisible();

    await page.goto(`/departments/${dept.id}`);
    await expect(page.getByText('No skills configured for this department yet')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts -g "Admin UI"`
Expected: FAIL — `page.getByPlaceholder('Required headcount')` still exists (`toHaveCount(0)` fails), since `DepartmentForm.tsx` hasn't been changed yet.

- [ ] **Step 3: Remove the headcount input**

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
  onRemove,
  disabled,
}: {
  skill: DepartmentSkillInput;
  onNameChange: (value: string) => void;
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
    (initialData?.skills ?? []).map((s) => ({ name: s.name }))
  );

  function isValidColor(value: string) {
    return HEX_COLOR_REGEX.test(value.trim());
  }

  function isValidSkills() {
    return skills.every((s) => s.name.trim().length > 0);
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
      skills: skills.map((s) => ({ name: s.name.trim() })),
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
          These apply to every team in this department. Each team sets its own target headcount
          per skill on the department page.
        </p>
        {skills.map((skill, index) => (
          <SkillRow
            key={index}
            skill={skill}
            disabled={isLoading}
            onNameChange={(value) =>
              setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, name: value } : s)))
            }
            onRemove={() => setSkills((prev) => prev.filter((_, i) => i !== index))}
          />
        ))}
        <button
          type="button"
          onClick={() => setSkills((prev) => [...prev, { name: '' }])}
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts -g "Admin UI"`
Expected: PASS

- [ ] **Step 5: Run type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no new errors from files this task touched. Errors in `DepartmentTeamRow.tsx` and `seed.ts` (not yet fixed) are still expected at this point.

- [ ] **Step 6: Commit**

```bash
git add src/components/departments/DepartmentForm.tsx tests/skills.spec.ts
git commit -m "feat(skills): remove required-headcount input from department admin form"
```

---

### Task 3: Team-level UI — rename to skillTargets, remove reset-to-default

**Files:**
- Modify: `src/components/departments/DepartmentTeamRow.tsx`
- Modify: `src/components/skills/SkillRadarChart.tsx`
- Modify: `tests/skills.spec.ts`

**Interfaces:**
- Consumes: `Team.skillTargets` (Task 1), `useUpdateTeam` (Task 1, already accepts `skillTargets`).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Replace the `'Team-level skill override UI'` describe block in `tests/skills.spec.ts` with:

```typescript
test.describe('Team-level skill target UI', () => {
  test('editing a skill\'s target headcount inline updates the gap and persists', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: { name: `Inline Edit Dept ${Date.now()}`, color: '#3b82f6', skills: [{ name: 'Illustration' }] },
    });
    const { data: dept } = await deptRes.json();

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];
    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    await page.goto(`/departments/${dept.id}`);

    const targetButton = page.getByRole('button', { name: /edit target headcount for illustration/i });
    await expect(targetButton).toHaveText('target: 0');
    await targetButton.click();

    const input = page.getByLabel(/edit target headcount for illustration/i).or(page.locator('input[type="number"]').first());
    await input.fill('9');
    await input.press('Enter');

    await expect(page.getByRole('button', { name: /edit target headcount for illustration/i })).toHaveText('target: 9');
    await expect(page.getByText('+9')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: /edit target headcount for illustration/i })).toHaveText('target: 9');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts -g "Team-level skill target UI"`
Expected: FAIL — the button's accessible name is still "Edit required headcount for Illustration" and its text still reads "req: 0", not "target: 0".

- [ ] **Step 3: Update DepartmentTeamRow**

Replace `src/components/departments/DepartmentTeamRow.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { TeamWithStats } from '@/lib/types/domain';
import { SkillRadarChart } from '@/components/skills/SkillRadarChart';
import { InfoHint } from '@/components/ui/InfoHint';
import { useUpdateTeam } from '@/lib/hooks/useTeams';
import { extractErrorMessage } from '@/lib/utils/extractErrorMessage';

interface SkillCoveragePoint {
  id: string;
  name: string;
  current: number;
  ambition: number;
  gap: number;
}

interface DepartmentTeamRowProps {
  team: TeamWithStats & {
    skillTargets?: Record<string, number>;
    skills?: SkillCoveragePoint[];
  };
}

function EditableSkillGap({
  skill,
  onSave,
  isSaving,
}: {
  skill: SkillCoveragePoint;
  onSave: (skillId: string, value: number) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(skill.ambition));

  function startEditing() {
    setDraft(String(skill.ambition));
    setEditing(true);
  }

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
            aria-label={`Edit target headcount for ${skill.name}`}
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
            onClick={startEditing}
            disabled={isSaving}
            aria-label={`Edit target headcount for ${skill.name}`}
            className="rounded border border-transparent px-1.5 py-0.5 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed"
          >
            target: {skill.ambition}
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

  function handleSaveTarget(skillId: string, value: number) {
    const validIds = new Set((team.skills ?? []).map((s) => s.id));
    const nextTargets = Object.fromEntries(
      Object.entries({ ...(team.skillTargets ?? {}), [skillId]: value }).filter(([id]) => validIds.has(id))
    );
    updateTeam.mutate({ id: team.id, updates: { skillTargets: nextTargets } });
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
            No skills configured for this department yet — add some on the{' '}
            <Link href="/departments" className="text-blue-600 hover:text-blue-800 underline">
              Departments
            </Link>{' '}
            page.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <SkillRadarChart data={data} size={220} />
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
              <div className="mb-2 flex items-center gap-1">
                <h3 className="font-semibold text-gray-900">Skill coverage</h3>
                <InfoHint text="Ambition = this team's own target headcount per skill. Click a skill's number to change it. Gap = ambition minus current." />
              </div>
              <ul className="space-y-1">
                {sortedGaps.map((s) => (
                  <EditableSkillGap
                    key={s.id}
                    skill={s}
                    onSave={handleSaveTarget}
                    isSaving={updateTeam.isPending}
                  />
                ))}
              </ul>
              {updateTeam.isError && (
                <p className="mt-2 text-xs text-red-600">
                  {extractErrorMessage(updateTeam.error, 'Failed to save skill target')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update the SkillRadarChart tooltip copy**

In `src/components/skills/SkillRadarChart.tsx`, update the `InfoHint` text near the bottom:

```tsx
<InfoHint text="Current = skills present in the team today (counted from member tags). Ambition = this team's own target headcount per skill. Gap = ambition minus current." />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts -g "Team-level skill target UI"`
Expected: PASS

- [ ] **Step 6: Run type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no new errors from files this task touched. `seed.ts` errors (not yet fixed) are still expected at this point.

- [ ] **Step 7: Commit**

```bash
git add src/components/departments/DepartmentTeamRow.tsx src/components/skills/SkillRadarChart.tsx tests/skills.spec.ts
git commit -m "feat(skills): team-level target editing — rename to skillTargets, remove reset-to-default"
```

---

### Task 4: Seed script — per-team skill target derivation

**Files:**
- Modify: `src/lib/db/seed.ts`
- Modify: `tests/skills.spec.ts`

**Interfaces:**
- Consumes: `slugifySkillName`, `resolveMemberTags` (both already in scope — `slugifySkillName` from Task 1's `departmentSkills.ts`, `resolveMemberTags` already exists in `seed.ts`); `DepartmentEntity.skills`, `TeamEntity.skillTargets` (Task 1).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Replace the `'Seed script — default department skills'` describe block in `tests/skills.spec.ts` with:

```typescript
test.describe('Seed script — per-team skill targets', () => {
  test('a full reseed gives every Applied Physics & Science Education team a gap-0 baseline for Research', async ({ page }) => {
    const seedRes = await page.request.post('/api/seed', { data: { resetFirst: true } });
    expect(seedRes.ok()).toBeTruthy();

    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const apse = departments.find((d: { name: string }) => d.name === 'Applied Physics & Science Education');
    expect(apse).toBeDefined();
    expect(apse.skills.some((s: { name: string }) => s.name === 'Research')).toBe(true);

    const teamsRes = await page.request.get(`/api/teams?departmentId=${apse.id}`);
    const { data: teams } = await teamsRes.json();
    expect(teams.length).toBeGreaterThan(0);
    for (const team of teams) {
      const research = team.skills.find((s: { name: string }) => s.name === 'Research');
      expect(research).toBeDefined();
      expect(research.ambition).toBe(research.current);
    }
  });

  test('Support Services has no default skills configured', async ({ page }) => {
    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const svc = departments.find((d: { name: string }) => d.name === 'Support Services');
    expect(svc).toBeDefined();
    expect(svc.skills).toEqual([]);
  });

  test('membersPerTeam option does not break the per-team gap-0 baseline', async ({ page }) => {
    const seedRes = await page.request.post('/api/seed', { data: { resetFirst: true, membersPerTeam: 2 } });
    expect(seedRes.ok()).toBeTruthy();

    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const apse = departments.find((d: { name: string }) => d.name === 'Applied Physics & Science Education');
    expect(apse).toBeDefined();

    const teamsRes = await page.request.get(`/api/teams?departmentId=${apse.id}`);
    const { data: teams } = await teamsRes.json();
    expect(teams.length).toBeGreaterThan(0);
    for (const team of teams) {
      for (const skill of team.skills) {
        expect(skill.ambition).toBe(skill.current);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts -g "Seed script"`
Expected: FAIL — `runSeed` doesn't populate any team's `skillTargets` yet, so `research.ambition` is `0` while `research.current` is whatever the seed data actually produces (nonzero for most APSE teams), and `team.skills.find(...)` may not even find the skill on teams whose members don't happen to carry that exact tag combination the OLD department-wide default assumed.

- [ ] **Step 3: Replace the department-level skills builder with per-team derivation**

In `src/lib/db/seed.ts`, replace the `buildDefaultDepartmentSkills` function (and its use) with:

```typescript
interface SeedSkillData {
  departmentSkills: Record<string, DepartmentSkill[]>;
  teamSkillTargets: Record<string, Record<string, number>>;
}

function buildSeedSkillData(members: SeedMember[]): SeedSkillData {
  const teamKeyToDeptKey = new Map(TEAMS.map((t) => [t.key, t.departmentKey]));

  const deptSkillNames = new Map<string, Set<string>>();
  const teamSkillCounts = new Map<string, Map<string, number>>();

  for (const member of members) {
    const deptKey = teamKeyToDeptKey.get(member.baseTeamKey);
    if (!deptKey) continue;
    const skillNames = resolveMemberTags(member).filter((tag) => tag !== 'SQUAD');

    let deptNames = deptSkillNames.get(deptKey);
    if (!deptNames) {
      deptNames = new Set();
      deptSkillNames.set(deptKey, deptNames);
    }

    let teamCounts = teamSkillCounts.get(member.baseTeamKey);
    if (!teamCounts) {
      teamCounts = new Map();
      teamSkillCounts.set(member.baseTeamKey, teamCounts);
    }

    for (const skillName of skillNames) {
      deptNames.add(skillName);
      teamCounts.set(skillName, (teamCounts.get(skillName) ?? 0) + 1);
    }
  }

  const departmentSkills: Record<string, DepartmentSkill[]> = {};
  const nameToIdByDept = new Map<string, Map<string, string>>();
  for (const [deptKey, names] of deptSkillNames.entries()) {
    const seenIds = new Set<string>();
    const nameToId = new Map<string, string>();
    const sortedNames = Array.from(names).sort((a, b) => a.localeCompare(b));
    departmentSkills[deptKey] = sortedNames.map((name, index) => {
      let id = slugifySkillName(name);
      let suffix = 2;
      while (seenIds.has(id)) {
        id = `${slugifySkillName(name)}-${suffix++}`;
      }
      seenIds.add(id);
      nameToId.set(name, id);
      return { id, name, sortOrder: index };
    });
    nameToIdByDept.set(deptKey, nameToId);
  }

  const teamSkillTargets: Record<string, Record<string, number>> = {};
  for (const [teamKey, counts] of teamSkillCounts.entries()) {
    const deptKey = teamKeyToDeptKey.get(teamKey);
    const nameToId = deptKey ? nameToIdByDept.get(deptKey) : undefined;
    if (!nameToId) continue;
    const targets: Record<string, number> = {};
    for (const [skillName, count] of counts.entries()) {
      const id = nameToId.get(skillName);
      if (id) targets[id] = count;
    }
    teamSkillTargets[teamKey] = targets;
  }

  return { departmentSkills, teamSkillTargets };
}
```

Delete the old `buildDefaultDepartmentSkills` function entirely (the block that started `function buildDefaultDepartmentSkills(members: SeedMember[]): Record<string, DepartmentSkill[]> { ... }`).

- [ ] **Step 4: Wire it into runSeed**

In `runSeed`, replace:

```typescript
  const defaultDepartmentSkills = options?.teams ? {} : buildDefaultDepartmentSkills(membersToSeed);
```

with:

```typescript
  const seedSkillData: SeedSkillData = options?.teams
    ? { departmentSkills: {}, teamSkillTargets: {} }
    : buildSeedSkillData(membersToSeed);
```

Update the department `upsertEntity` call to read from the new structure:

```typescript
      skills: JSON.stringify(seedSkillData.departmentSkills[dept.key] ?? []),
```

Update the team `upsertEntity` call (inside the `for (const [index, team] of configuredTeams.entries())` loop) to add `skillTargets`:

```typescript
    await teamClient.upsertEntity<TeamEntity>({
      partitionKey: 'team',
      rowKey: id,
      name: team.name,
      color: team.color,
      sortOrder: index,
      departmentId: assignedDeptId,
      skillTargets: JSON.stringify(team.key ? (seedSkillData.teamSkillTargets[team.key] ?? {}) : {}),
    }, 'Replace');
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts -g "Seed script"`
Expected: PASS

- [ ] **Step 6: Run type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both pass — this is the last file with old-shape references, so this should now be fully clean across the whole diff.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/seed.ts tests/skills.spec.ts
git commit -m "feat(skills): derive per-team skill targets in seed script instead of department-level defaults"
```

---

### Task 5: Department rollup panel (new)

**Files:**
- Create: `src/components/departments/DepartmentSkillsRollup.tsx`
- Modify: `src/app/departments/[deptId]/page.tsx`
- Modify: `tests/skills.spec.ts`

**Interfaces:**
- Consumes: `TeamWithStats` (domain type, pre-existing), `SkillCoveragePoint`-shaped data already present on `useDepartmentTeams`'s response (same ad-hoc-widened pattern `DepartmentTeamRow` already uses — `TeamWithStats & { skills?: SkillCoveragePoint[] }`); `SkillRadarChart` (pre-existing, reused as-is).
- Produces: `DepartmentSkillsRollup` component, exported from `src/components/departments/DepartmentSkillsRollup.tsx` — nothing later depends on it, this is the final task.

- [ ] **Step 1: Write the failing test**

Append to `tests/skills.spec.ts` (after the last existing describe block):

```typescript
test.describe('Department skills rollup', () => {
  test('rollup panel sums current and ambition across every team in the department', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: { name: `Rollup Dept ${Date.now()}`, color: '#3b82f6', skills: [{ name: 'Pottery' }] },
    });
    const { data: dept } = await deptRes.json();
    const potteryId = dept.skills[0].id;

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const [teamA, teamB] = teams;

    await page.request.patch(`/api/teams/${teamA.id}`, {
      data: { departmentId: dept.id, skillTargets: { [potteryId]: 3 } },
    });
    await page.request.patch(`/api/teams/${teamB.id}`, {
      data: { departmentId: dept.id, skillTargets: { [potteryId]: 5 } },
    });

    const scopedRes = await page.request.get(`/api/teams?departmentId=${dept.id}`);
    const { data: scopedTeams } = await scopedRes.json();
    const totalAmbition = scopedTeams.reduce((sum: number, t: { skills: Array<{ id: string; ambition: number }> }) => {
      const point = t.skills.find((s) => s.id === potteryId);
      return sum + (point?.ambition ?? 0);
    }, 0);
    expect(totalAmbition).toBe(8);

    await page.goto(`/departments/${dept.id}`);
    await expect(page.getByRole('heading', { name: 'Department total' })).toBeVisible();
    await expect(page.getByText('+8')).toBeVisible();
  });

  test('a department with no skills shows the rollup empty state instead of a panel', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: { name: `No Rollup Dept ${Date.now()}`, color: '#3b82f6' },
    });
    const { data: dept } = await deptRes.json();

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    await page.request.patch(`/api/teams/${teams[0].id}`, { data: { departmentId: dept.id } });

    await page.goto(`/departments/${dept.id}`);
    await expect(page.getByRole('heading', { name: 'Department total' })).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/skills.spec.ts -g "Department skills rollup"`
Expected: FAIL — no "Department total" heading exists anywhere on the department detail page yet.

- [ ] **Step 3: Create the rollup component**

Create `src/components/departments/DepartmentSkillsRollup.tsx`:

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

interface DepartmentSkillsRollupProps {
  teams: Array<TeamWithStats & { skills?: SkillCoveragePoint[] }>;
}

export function DepartmentSkillsRollup({ teams }: DepartmentSkillsRollupProps) {
  const loaded = teams.every((t) => t.skills !== undefined);
  if (!loaded) {
    return (
      <div className="flex gap-2">
        <div className="h-48 flex-1 bg-gray-100 rounded animate-pulse" />
        <div className="h-48 flex-1 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const totalsById = new Map<string, { name: string; current: number; ambition: number }>();
  for (const team of teams) {
    for (const point of team.skills ?? []) {
      const existing = totalsById.get(point.id);
      if (existing) {
        existing.current += point.current;
        existing.ambition += point.ambition;
      } else {
        totalsById.set(point.id, { name: point.name, current: point.current, ambition: point.ambition });
      }
    }
  }

  if (totalsById.size === 0) {
    return <p className="text-xs text-gray-500">No skills configured for this department yet.</p>;
  }

  const rollup: SkillCoveragePoint[] = Array.from(totalsById.entries()).map(([id, t]) => ({
    id,
    name: t.name,
    current: t.current,
    ambition: t.ambition,
    gap: t.ambition - t.current,
  }));

  const data = rollup.map((s) => ({ skill: s.name, current: s.current, ambition: s.ambition }));
  const sortedGaps = [...rollup].sort((a, b) => b.gap - a.gap);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-900">Department total</h3>
        <p className="mt-0.5 text-xs text-gray-500">Sum of every team&apos;s current and target headcount.</p>
      </div>
      <div className="border-t border-gray-100 bg-gray-50/50 p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SkillRadarChart data={data} size={220} />
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs">
            <div className="mb-2 flex items-center gap-1">
              <h4 className="font-semibold text-gray-900">Skill coverage</h4>
              <InfoHint text="Ambition = sum of every team's own target for this skill. Current = sum of every team's actual headcount. Read-only — edit a team's target on its own row below." />
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
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire it into the department detail page**

In `src/app/departments/[deptId]/page.tsx`, add the import:

```typescript
import { DepartmentSkillsRollup } from '@/components/departments/DepartmentSkillsRollup';
```

Replace the "Skill Coverage" section:

```tsx
            <div className="mt-8">
              <h2 className="text-lg font-bold text-gray-900">Skill Coverage</h2>
              {(teamsQuery.data?.length ?? 0) > 0 ? (
                <>
                  <div className="mt-4">
                    <DepartmentSkillsRollup teams={teamsQuery.data ?? []} />
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    {(teamsQuery.data ?? []).map((team) => (
                      <DepartmentTeamRow key={team.id} team={team} />
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No skill data — assign teams to see coverage.</p>
              )}
            </div>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test tests/skills.spec.ts -g "Department skills rollup"`
Expected: PASS

- [ ] **Step 6: Run the full suite, type-check, and lint**

Run: `npm run type-check && npm run lint && npx playwright test`
Expected: all pass — this confirms the whole plan's changes are consistent end-to-end, including the earlier tasks and the pre-existing `departments.spec.ts`/`settings.spec.ts`/`home.spec.ts`/`api.spec.ts` suites.

- [ ] **Step 7: Manual smoke check**

Run `npm run dev:full` (or `npm run dev` with Azurite already running, `AUTH_DISABLED=true` for a quick anonymous check), navigate to a department detail page with two or more teams. Add a skill via Settings → Departments (no headcount field). Set different target headcounts on two teams for that skill via inline edit. Confirm the rollup panel above the per-team list shows the correct summed ambition and current. Confirm there is no "reset" button anywhere in the per-team panels.

- [ ] **Step 8: Commit**

```bash
git add src/components/departments/DepartmentSkillsRollup.tsx src/app/departments/[deptId]/page.tsx tests/skills.spec.ts
git commit -m "feat(skills): add department-level skills rollup panel"
```

---

## Post-plan checklist

- [ ] Update `wishlist.md` — mark `#42` and its parts `#42a`–`#42h` as `[x]` DONE, with a short summary line (matching the style of `#40`'s closing summary).
- [ ] Confirm `docs/superpowers/specs/2026-08-03-team-ambition-rollup-design.md`'s status remains accurate — this plan followed it as written, no amendment expected, but check after implementation same as the prior plan did.
