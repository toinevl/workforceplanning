# Golden Path Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the workforceplanning site around a planning lead golden path: org dashboard → department detail → scenario board → impact → decision.

**Architecture:** Change the landing page from a flat scenario list to an org dashboard. Enhance the department detail page as the pivot point (scenario creation, inline team assignment, active scenarios). Add departmentId to the scenario entity for scoping. Strip Settings to admin-only. Update navigation.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Azure Table Storage, TanStack Query, Zustand

## Global Constraints

- Project root: /home/toine/AI-Projects/projects/workforceplanning
- Always use the @/ import alias (e.g. @/lib/types/domain)
- No `any` — use proper types or `unknown`
- Prefer server components; add 'use client' only for event handlers, hooks, or browser APIs
- API routes: src/app/api/ — hooks: src/lib/hooks/ — domain types: src/lib/types/domain.ts
- No comments unless the WHY is non-obvious
- Run type-check + lint after every change: npm run type-check && npm run lint
- Azurite must be running on localhost:10000 for local testing

---

### Task 1: Add departmentId to Scenario entity + domain type

**Files:**
- Modify: `src/lib/db/tables.ts` — add `departmentId?: string` to ScenarioEntity
- Modify: `src/lib/db/mappers.ts` — add `departmentId: e.departmentId` to entityToScenario
- Modify: `src/lib/types/domain.ts` — add `departmentId?: string` to Scenario interface and ScenarioSummary interface
- Modify: `src/lib/api/scenarios.ts` — update createScenario signature + getScenarioList/getScenario to include departmentId
- Modify: `src/app/api/scenarios/route.ts` — pass departmentId from POST body

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `Scenario.departmentId?: string`, `createScenario(type, name, description, params, departmentId?)`, `ScenarioEntity.departmentId?: string`

- [ ] **Step 1: Add departmentId to ScenarioEntity in tables.ts**

In `src/lib/db/tables.ts`, add `departmentId?: string;` to the `ScenarioEntity` interface (after `updatedAt: string;`).

- [ ] **Step 2: Add departmentId to Scenario and ScenarioSummary in domain.ts**

In `src/lib/types/domain.ts`:
- Add `departmentId?: string;` to the `Scenario` interface (after `updatedAt: string;`)
- Add `departmentId?: string;` to the `ScenarioSummary` interface (after `updatedAt: string;`)

- [ ] **Step 3: Update mapper in mappers.ts**

In `src/lib/db/mappers.ts`, in the `entityToScenario` function, add `departmentId: e.departmentId` to the returned object.

- [ ] **Step 4: Update createScenario in scenarios.ts**

In `src/lib/api/scenarios.ts`, update `createScenario` to accept an optional `departmentId` parameter:
- Signature: `createScenario(type, name, description?, params?, departmentId?)`
- Add `departmentId` to the entity upsertEntity call
- Add `departmentId` to the returned Scenario object

Also update `getScenarioList` to include `departmentId` in the summary objects.
Also update `updateScenario` to persist `departmentId` in the entity if present.

- [ ] **Step 5: Update POST /api/scenarios route**

In `src/app/api/scenarios/route.ts`, update the POST handler body type to accept `departmentId?: string` and pass it to `createScenario`.

- [ ] **Step 6: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both pass with zero errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(data): add departmentId to Scenario entity + domain type"
```

---

### Task 2: Filter board by departmentId in getScenarioBoardState

**Files:**
- Modify: `src/lib/api/scenarios.ts` — filter teams in getScenarioBoardState

**Interfaces:**
- Consumes: `Scenario.departmentId` from Task 1
- Produces: board state filtered to department teams when departmentId is set

- [ ] **Step 1: Add department filter to getScenarioBoardState**

In `src/lib/api/scenarios.ts`, in the `getScenarioBoardState` function, after fetching `allTeams`, add a filter:

```typescript
const teams = scenario.departmentId
  ? allTeams.filter(t => t.departmentId === scenario.departmentId)
  : allTeams;
```

Then use `teams` (filtered) instead of `allTeams` for the rest of the board building logic.

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(board): filter teams by departmentId in board state"
```

---

### Task 3: Build the Org Dashboard component + landing page

**Files:**
- Create: `src/components/org/OrgDashboard.tsx` — new landing page component
- Modify: `src/app/page.tsx` — replace ScenarioDashboard with OrgDashboard
- Modify: `src/app/scenarios/page.tsx` — move ScenarioDashboard here (if not already)

**Interfaces:**
- Consumes: `useDepartmentList()` hook (returns `DepartmentWithStats[]`)
- Produces: new landing page at `/` showing org overview

- [ ] **Step 1: Create OrgDashboard component**

Create `src/components/org/OrgDashboard.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useDepartmentList } from '@/lib/hooks/useDepartments';
import { extractErrorMessage } from '@/lib/utils/extractErrorMessage';
```

Layout:
- Top section: heading "Organization" + subtitle
- Metrics row: 4 stat cards (Total Headcount, Total FTE, Departments, Teams) — aggregate from department stats
- Main grid: department cards. Each card shows:
  - Color dot (department.color)
  - Department name (bold, linked to /departments/[deptId])
  - Dept head name (if present)
  - Stats: team count, headcount, FTE
- Loading state: skeleton placeholders
- Error state: red alert box
- Empty state: "No departments yet" with link to /departments

- [ ] **Step 2: Replace landing page**

In `src/app/page.tsx`, replace:
```tsx
import { ScenarioDashboard } from '@/components/scenarios/ScenarioDashboard';
```
with:
```tsx
import { OrgDashboard } from '@/components/org/OrgDashboard';
```
And render `<OrgDashboard />` inside `<AppShell>` instead of `<ScenarioDashboard />`.

- [ ] **Step 3: Ensure /scenarios page exists**

Check `src/app/scenarios/page.tsx` exists. If not, create it to render `<ScenarioDashboard />` inside `<AppShell>`. The ScenarioDashboard component already exists and is self-contained.

- [ ] **Step 4: Type-check and lint**

Run: `npm run type-check && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(ui): new Org Dashboard landing page replacing scenario list"
```

---

### Task 4: Update navigation (TopNav)

**Files:**
- Modify: `src/components/layout/TopNav.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: nav with Org, Departments, Scenarios (no Settings)

- [ ] **Step 1: Update nav links**

In `src/components/layout/TopNav.tsx`, update the nav links section:
- Change "Home" link text to "Org", href stays `/`
- Update `isHome` check: `pathname === '/'` stays (Org is at /)
- Keep "Departments" as-is
- Change "Settings" to "Scenarios", href `/scenarios`
- Update `isSettings` to `isScenarios`: `pathname === '/scenarios' || pathname.startsWith('/scenarios/')`
- Remove the isSettings variable and logic

- [ ] **Step 2: Type-check and lint**

Run: `npm run type-check && npm run lint`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(nav): restructure nav — Org, Departments, Scenarios"
```

---

### Task 5: Add departmentId filter to GET /api/scenarios

**Files:**
- Modify: `src/app/api/scenarios/route.ts` — accept ?departmentId= query param
- Modify: `src/lib/api/scenarios.ts` — pass filter to getScenarioList

**Interfaces:**
- Consumes: Scenario.departmentId from Task 1
- Produces: GET /api/scenarios?departmentId=X returns filtered list

- [ ] **Step 1: Add query param support to GET route**

In `src/app/api/scenarios/route.ts`, update GET to read searchParams:
```typescript
export async function GET(req: Request) {
  const departmentId = new URL(req.url).searchParams.get('departmentId');
  // pass to getScenarioList
}
```

- [ ] **Step 2: Filter in getScenarioList**

In `src/lib/api/scenarios.ts`, update `getScenarioList` to accept optional `departmentId?: string`. If provided, filter scenarios by `scenario.departmentId === departmentId` before building summaries.

- [ ] **Step 3: Add hook for department scenarios**

In `src/lib/hooks/useScenario.ts`, add:
```typescript
export function useScenariosByDepartment(departmentId: string) {
  return useQuery<ScenarioSummary[]>({
    queryKey: ['scenarios', 'department', departmentId],
    queryFn: () => fetchJSON(`/api/scenarios?departmentId=${departmentId}`),
    enabled: !!departmentId,
  });
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npm run type-check && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): filter scenarios by departmentId + hook"
```

---

### Task 6: Enhance Department Detail page

**Files:**
- Modify: `src/app/departments/[deptId]/page.tsx`
- Create: `src/components/departments/DepartmentScenarios.tsx`
- Create: `src/components/departments/DepartmentTeamManager.tsx`

**Interfaces:**
- Consumes: `useScenariosByDepartment` from Task 5, `useTeamList` + `useUpdateTeam` hooks (existing), createScenario via `useCreateScenario`
- Produces: department page with scenario creation, team assignment, active scenarios

- [ ] **Step 1: Create DepartmentScenarios component**

Create `src/components/departments/DepartmentScenarios.tsx`:
- Props: `departmentId: string`
- Uses `useScenariosByDepartment(departmentId)` hook
- Shows list of active scenarios for this department (name, type, last updated)
- "Plan Reorganization" button that creates a scenario with departmentId and navigates to the board
- Uses `useCreateScenario` from existing hooks, passes departmentId
- On success, `router.push('/scenarios/' + newScenario.id)`
- Empty state: "No scenarios yet. Start planning to model changes."

- [ ] **Step 2: Create DepartmentTeamManager component**

Create `src/components/departments/DepartmentTeamManager.tsx`:
- Props: `departmentId: string`
- Shows teams assigned to this department (from useDepartmentTeams)
- Shows unassigned teams (from useTeamList, filtered by !departmentId)
- Each team has a dropdown or button to assign to / unassign from this department
- Uses PATCH /api/teams/[id] via useUpdateTeam hook
- Follow the pattern from TeamAssignmentSection (inline dropdown, saves immediately)

- [ ] **Step 3: Integrate into department detail page**

In `src/app/departments/[deptId]/page.tsx`:
- Add `<DepartmentScenarios departmentId={deptId} />` below the teams section
- Add `<DepartmentTeamManager departmentId={deptId} />` inline with teams
- Keep existing DepartmentTeamRow rendering for skill radars

- [ ] **Step 4: Type-check and lint**

Run: `npm run type-check && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(departments): add scenario creation, team management, active scenarios to dept page"
```

---

### Task 7: Move department CRUD from Settings to Departments page

**Files:**
- Modify: `src/app/departments/page.tsx` — add DepartmentsSection
- Modify: `src/app/settings/page.tsx` — remove DepartmentsSection + TeamAssignmentSection
- Modify: `src/app/settings/page.tsx` — keep only SeedSetupPanel + BulkMigrateButton

**Interfaces:**
- Consumes: existing DepartmentsSection component
- Produces: department management inline on /departments, Settings stripped down

- [ ] **Step 1: Add DepartmentsSection to departments page**

In `src/app/departments/page.tsx`, import and render `<DepartmentsSection />` below the department list.

- [ ] **Step 2: Strip Settings page**

In `src/app/settings/page.tsx`:
- Remove import and rendering of DepartmentsSection
- Remove import and rendering of TeamAssignmentSection
- Keep only SeedSetupPanel + BulkMigrateButton
- Update the page heading/description to reflect admin-only purpose

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check && npm run lint`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: move department CRUD to /departments, strip Settings to admin only"
```

---

### Task 8: Final integration — build, test, push

**Files:**
- All files from Tasks 1-7

- [ ] **Step 1: Full type-check + lint + build**

```bash
npm run type-check && npm run lint && npm run build
```

- [ ] **Step 2: Run E2E tests**

```bash
# Ensure Azurite is running
AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true AUTH_DISABLED=true npx playwright test
```

- [ ] **Step 3: Fix any test failures**

The existing tests hit `/` expecting the scenarios page. Update tests that navigate to `/` to navigate to `/scenarios` instead. The `/` page now shows the org dashboard.

- [ ] **Step 4: Push**

```bash
git add -A && git commit -m "feat: golden path restructure — org dashboard, department pivot, scoped scenarios" && git push
```
