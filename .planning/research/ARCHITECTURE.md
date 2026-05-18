# Architecture: Department Layer Integration

**Milestone:** v2.0 Enterprise Departments
**Researched:** 2026-05-18
**Confidence:** HIGH — based on direct code inspection of all relevant files

---

## 1. Schema Changes

### 1a. New Table: `departments`

Add a new Azure Table Storage table named `departments`.

**Partition/Row key design:**

```
partitionKey: 'department'   (fixed literal — same pattern as 'team', 'member', 'scenario')
rowKey:       <uuid>         (departmentId — generated at creation time)
```

Rationale: all existing tables use a single fixed partitionKey per entity type (teams use `'team'`, scenarios use `'scenario'`). This is consistent, keeps all department entities in one partition, and matches the existing `listEntities()` + sort pattern used in `getAllTeams()`. At the scale of an enterprise org (tens of departments), a single partition is optimal — cross-partition scatter queries are never needed.

**New entity type to add to `src/lib/db/tables.ts`:**

```typescript
export const TABLE_DEPARTMENTS = 'departments';

export interface DepartmentEntity extends TableEntity {
  partitionKey: 'department';
  rowKey: string;        // departmentId (uuid)
  name: string;
  description?: string;
  color: string;         // hex color, e.g. '#6366f1'
  deptHead?: string;     // free-text name of department head
  sortOrder: number;
}
```

**New domain type to add to `src/lib/types/domain.ts`:**

```typescript
export interface Department {
  id: string;
  name: string;
  description?: string;
  color: string;
  deptHead?: string;
  sortOrder: number;
}
```

### 1b. Modified Entity: `TeamEntity`

Add `departmentId` as an optional field on `TeamEntity`. Optional (not required) is critical for backward compatibility — existing rows will not have this field and must be treated as `undefined`.

```typescript
export interface TeamEntity extends TableEntity {
  partitionKey: 'team';
  rowKey: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  departmentId?: string;   // NEW — optional, undefined = unassigned
}
```

**Corresponding change to the `Team` domain type:**

```typescript
export interface Team {
  id: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  departmentId?: string;   // NEW — optional
}
```

No default department is auto-assigned at write time. Unassigned teams appear in an "Unassigned" bucket on the `/departments` listing page and can be assigned via Settings.

---

## 2. API Changes

### 2a. New API Route File: `src/app/api/departments/route.ts`

Handles `GET` (list all departments) and `POST` (create department).

```
GET  /api/departments        → { data: Department[] }
POST /api/departments        → { data: Department }   body: { name, description?, color, deptHead?, sortOrder? }
```

### 2b. New API Route File: `src/app/api/departments/[id]/route.ts`

Handles `GET` (single), `PATCH` (update), `DELETE`.

```
GET    /api/departments/[id]  → { data: Department }
PATCH  /api/departments/[id]  → { data: Department }   body: partial Department fields
DELETE /api/departments/[id]  → 204
```

On DELETE: set `departmentId = undefined` on all teams belonging to this department (app-layer referential integrity, consistent with how the rest of the codebase handles this).

### 2c. New Library File: `src/lib/api/departments.ts`

Contains `getAllDepartments()`, `getDepartment(id)`, `createDepartment(...)`, `updateDepartment(id, updates)`, `deleteDepartment(id)`. Follows the identical pattern of `src/lib/api/teams.ts`.

### 2d. Modified File: `src/lib/api/teams.ts`

- `entityToTeam()` must forward `departmentId` from the entity to the domain type.
- Add `getTeamsByDepartment(departmentId: string): Promise<Team[]>` — uses `listEntities` with filter `PartitionKey eq 'team'` then filters in-memory on `departmentId`. Azure Table Storage OData filters on non-indexed columns require full partition scan regardless; in-memory filter after partition scan is equivalent and simpler. With tens of teams this is fast.

### 2e. Modified File: `src/app/api/teams/route.ts`

No route signature changes needed. Optionally accept `?departmentId=` query param to support the department detail page fetching only its own teams. This is additive and backward-compatible — existing callers passing no query param continue to receive all teams.

```
GET /api/teams                  → all teams (unchanged behavior)
GET /api/teams?departmentId=X   → teams filtered to department X
```

### 2f. Scenario/Board API — UNCHANGED

`src/app/api/scenarios/[id]/board/route.ts` and `src/lib/api/scenarios.ts` (`getScenarioBoardState`) are explicitly confirmed unchanged. The board already fetches ALL teams with `listEntities()` on the `'team'` partition. Adding `departmentId` to `TeamEntity` is transparent — the board continues to load all teams cross-department. `BoardState` and `TeamSnapshot` do not need a `departmentId` field because scenarios are defined as cross-org in the PROJECT.md out-of-scope section.

---

## 3. UI / Page Changes

### 3a. New Pages

| File | Route | Purpose |
|------|-------|---------|
| `src/app/departments/page.tsx` | `/departments` | Department listing with rollup FTE/headcount per dept |
| `src/app/departments/[deptId]/page.tsx` | `/departments/[deptId]` | Department detail: teams belonging to this dept + filtered board |
| `src/app/departments/loading.tsx` | `/departments` | Loading state skeleton (follows existing pattern) |
| `src/app/departments/error.tsx` | `/departments` | Error boundary (follows existing pattern) |
| `src/app/departments/[deptId]/loading.tsx` | `/departments/[deptId]` | Loading state |
| `src/app/departments/[deptId]/error.tsx` | `/departments/[deptId]` | Error boundary |

### 3b. New Components

| File | Purpose |
|------|---------|
| `src/components/departments/DepartmentCard.tsx` | Card for a dept on the listing page — shows name, color chip, FTE, headcount |
| `src/components/departments/DepartmentForm.tsx` | Create/edit form for a department (name, color, description, deptHead) |
| `src/components/departments/DepartmentTeamList.tsx` | Team list within a department detail page |

### 3c. New Hooks / Query Files

| File | Purpose |
|------|---------|
| `src/lib/hooks/useDepartments.ts` | TanStack Query hooks: `useDepartments()`, `useDepartment(id)`, `useCreateDepartment()`, `useUpdateDepartment()`, `useDeleteDepartment()` |

### 3d. Modified File: `src/components/layout/TopNav.tsx`

Add a "Departments" nav link between "Home" and "Settings". The `isDepartments` active-check mirrors the existing `isHome` / `isSettings` pattern:

```typescript
const isDepartments = pathname.startsWith('/departments');
```

The link renders with `aria-current={isDepartments ? 'page' : undefined}` and the same Tailwind classes as existing nav links.

### 3e. Modified File: `src/app/settings/page.tsx`

Add a "Departments" CRUD section (or a link to `/departments`) alongside the existing SeedSetupPanel. Department management (create, edit, delete, assign teams to departments) lives in Settings, consistent with the existing settings-first pattern.

Alternatively, department CRUD can live entirely on `/departments` with a modal/sheet pattern. Either approach works; the Settings-first approach avoids a new primary nav destination for an admin-only CRUD flow.

### 3f. Department Detail Page — Filtered Board

`/departments/[deptId]` fetches teams for that department via `GET /api/teams?departmentId=[deptId]`, then renders a read-only (or scenario-agnostic) team grid. This is NOT a scenario board — it shows baseline staffing for the department. If the user wants to model changes, they open a scenario from the main board.

The department detail page does NOT reuse the `BoardState`/`AppShell` pattern — it uses a simpler layout showing only baseline member counts per team. Reusing the scenario board here would require adding dept filtering to scenario APIs, which is out of scope per PROJECT.md.

---

## 4. Rollup Stats Computation

Azure Table Storage has no aggregation primitives. Rollup FTE and headcount per department must be computed in application code.

**Strategy: compute at fetch time, not stored.**

On `GET /api/departments`, the response should include rollup stats inline:

```typescript
interface DepartmentSummary extends Department {
  teamCount: number;
  headcount: number;
  totalFte: number;
}
```

**Computation steps:**
1. Fetch all departments (partition scan `'department'`).
2. Fetch all teams (partition scan `'team'`).
3. Fetch all staff members (partition scan `'member'`).
4. In memory: group teams by `departmentId`, group members by `baseTeamId`, then roll up FTE and headcount per department.

This is 3 parallel Azure Table Storage partition scans. Given typical scale (dozens of teams, hundreds of members), this completes in one round-trip with `Promise.all`. No caching layer is needed at v2.0 scale.

**Do not store denormalized rollup counts.** Storing them creates stale-data bugs when teams are reassigned or members change. Compute-on-read is correct and fast enough.

---

## 5. Migration Strategy for Existing Teams

**Approach: lazy / non-destructive.**

- Do NOT run a migration script that touches existing `TeamEntity` rows.
- The `departmentId` field on `TeamEntity` is optional (`departmentId?: string`).
- Existing teams in production have no `departmentId` field — they load fine as `departmentId: undefined`.
- The `/departments` listing page shows an "Unassigned" bucket for teams with no `departmentId`.
- Team assignment to a department happens via the Settings UI (PATCH `/api/teams/[id]` with `{ departmentId }`), or via a bulk-assign action in Settings.

**No data loss. No table schema migrations. No down-time writes required.**

The seed script (`src/lib/db/seed.ts`) should be updated to create 2–3 sample departments and assign seed teams to them, so dev/test environments work correctly out of the box.

`ensureTablesExist()` in `src/lib/db/client.ts` must add `'departments'` to its table list.

---

## 6. New vs Modified Files — Explicit List

### New Files

```
src/lib/db/tables.ts                         MODIFIED (add DepartmentEntity + TABLE_DEPARTMENTS)
src/lib/types/domain.ts                      MODIFIED (add Department type, add departmentId to Team)
src/lib/api/departments.ts                   NEW
src/lib/db/client.ts                         MODIFIED (add 'departments' to ensureTablesExist)
src/lib/db/seed.ts                           MODIFIED (create sample departments, assign teams)
src/lib/api/teams.ts                         MODIFIED (entityToTeam forwards departmentId, add getTeamsByDepartment)
src/app/api/departments/route.ts             NEW
src/app/api/departments/[id]/route.ts        NEW
src/app/api/teams/route.ts                   MODIFIED (optional ?departmentId= filter param)
src/app/departments/page.tsx                 NEW
src/app/departments/loading.tsx              NEW
src/app/departments/error.tsx               NEW
src/app/departments/[deptId]/page.tsx        NEW
src/app/departments/[deptId]/loading.tsx     NEW
src/app/departments/[deptId]/error.tsx      NEW
src/components/departments/DepartmentCard.tsx        NEW
src/components/departments/DepartmentForm.tsx        NEW
src/components/departments/DepartmentTeamList.tsx    NEW
src/lib/hooks/useDepartments.ts             NEW
src/components/layout/TopNav.tsx            MODIFIED (add Departments nav link)
src/app/settings/page.tsx                   MODIFIED (add dept management section)
```

### Unchanged Files (confirmed)

```
src/app/api/scenarios/[id]/board/route.ts   UNCHANGED
src/lib/api/scenarios.ts                    UNCHANGED
src/lib/types/domain.ts → BoardState        UNCHANGED (no departmentId in board types)
src/components/teams/TeamBoard.tsx          UNCHANGED
src/components/layout/AppShell.tsx          UNCHANGED
```

---

## 7. Data Flow — Where Does Dept Filter Happen?

```
/departments listing page
  → GET /api/departments
      → getAllDepartments() + getAllTeams() + getAllMembers()  [3 parallel scans]
      → in-memory groupBy(departmentId) → rollup stats
  ← DepartmentSummary[]

/departments/[deptId] detail page
  → GET /api/departments/[id]           [point read]
  → GET /api/teams?departmentId=[id]    [partition scan + in-memory filter]
  → GET /api/members                    [partition scan, filter in-memory by baseTeamId matching dept teams]
  ← Department + Team[] + per-team headcount

/api/scenarios/[id]/board (cross-dept, UNCHANGED)
  → getAllTeams() — returns ALL teams, no dept filter applied
  → getAllMembers()
  ← BoardState with all teams and members across all departments
```

The dept filter is applied exclusively in the department-scoped pages and APIs. Scenario/board APIs are dept-unaware by design.

---

## 8. Suggested Build Order

Build order is driven by data dependency: schema and types must exist before API, API before UI, and migration tooling runs alongside schema.

### Phase 1: Schema + Types Foundation
- Add `DepartmentEntity` to `src/lib/db/tables.ts`
- Add `Department` type + `departmentId` to `Team` in `src/lib/types/domain.ts`
- Update `ensureTablesExist()` in `src/lib/db/client.ts`
- Update `entityToTeam()` in `src/lib/api/teams.ts` to forward `departmentId`
- Update seed in `src/lib/db/seed.ts` to create sample departments and assign teams

**Why first:** Everything downstream depends on the entity types. The `departmentId?: string` change to `Team` is backward-compatible — existing callers ignore the new optional field.

### Phase 2: Department CRUD API
- `src/lib/api/departments.ts` (getAllDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment)
- `src/app/api/departments/route.ts` (GET, POST)
- `src/app/api/departments/[id]/route.ts` (GET, PATCH, DELETE)
- `src/app/api/teams/route.ts` — add optional `?departmentId=` filter

**Why second:** The UI depends on these endpoints. The API layer can be tested via curl/Postman before any UI exists.

### Phase 3: Department Management UI (Settings)
- `src/components/departments/DepartmentForm.tsx`
- `src/lib/hooks/useDepartments.ts`
- Extend `src/app/settings/page.tsx` with department CRUD section (create, edit, delete, assign teams to departments)

**Why third:** CRUD before read-only pages — you need departments in the database before the listing page can show anything meaningful.

### Phase 4: Navigation + Listing Page
- `src/components/layout/TopNav.tsx` — add Departments link
- `src/components/departments/DepartmentCard.tsx`
- `src/app/departments/page.tsx` + loading + error

**Why fourth:** The listing page depends on the CRUD API working correctly and departments existing in storage.

### Phase 5: Department Detail Page
- `src/components/departments/DepartmentTeamList.tsx`
- `src/app/departments/[deptId]/page.tsx` + loading + error

**Why last:** The detail page requires the `?departmentId=` teams filter (Phase 2) and at least one department with assigned teams (Phase 3).

---

## 9. Integration Points — What Breaks vs What Stays

### What Breaks (Must Fix)
- `entityToTeam()` in both `src/lib/api/teams.ts` and the local copy in `src/lib/api/scenarios.ts` must be updated to pass `departmentId` through. The copy in `scenarios.ts` (line 43–50) currently drops all fields not explicitly mapped — if `Team` gains `departmentId`, that mapper must add it. However since `BoardState` intentionally does not expose `departmentId`, the scenarios.ts mapper can safely continue to omit it with no behavior change.
- `src/lib/db/client.ts` `ensureTablesExist()` must include `'departments'` or the table will not be created on first run.

### What Stays
- All scenario API routes — zero changes.
- `BoardState`, `TeamSnapshot`, `ScenarioMemberState`, `ScenarioTeamDriver` types — unchanged.
- `AppShell` component — unchanged.
- `TeamBoard`, `TeamColumn`, `TeamHeader` components — unchanged.
- All scenario-related hooks and mutations — unchanged.
- `StaffMember` type and `StaffMemberEntity` — unchanged. `baseTeamId` continues pointing directly to a team; no `baseDepartmentId` is needed.

---

## 10. Confidence Notes

- **Schema design** (HIGH): directly derived from existing codebase patterns.
- **Backward compatibility** (HIGH): optional field addition + lazy migration is a well-established Azure Table Storage pattern.
- **Rollup computation** (HIGH): 3-table scan + in-memory join is the only option in Azure Table Storage; no aggregation functions exist.
- **Scenario/board unchanged** (HIGH): confirmed by reading `getScenarioBoardState` — it fetches all teams with no filter and constructs `BoardState` from them. Adding an optional field to `TeamEntity` does not affect this code path.
- **Next.js App Router file structure** (MEDIUM): based on existing project patterns + App Router conventions; verify against `node_modules/next/dist/docs/` as per AGENTS.md before writing page files.
