# Research Summary: v2.0 Enterprise Departments

**Project:** Workforce Planning — v2.0 Enterprise Departments milestone
**Synthesized:** 2026-05-18 from STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

The v2.0 milestone adds a Department entity as a grouping layer above the existing flat team structure. This is a well-scoped, additive change: no new dependencies are required, the existing Azure Table Storage + Next.js 16 + TanStack Query stack covers everything needed, and the data model change (`departmentId?: string` on `TeamEntity`) is backward-compatible by design.

The primary implementation risk is not technical complexity — it is data integrity on a live production system that already contains real team and staff data. Three hardening tasks must ship **before** any department feature code is written: seed panel live-data guard, migration idempotency sentinel, and `entityToTeam()` mapper consolidation.

---

## Stack Additions vs Reuse

**No new dependencies.** The existing stack covers everything.

| Area | New or Reused | Notes |
|------|--------------|-------|
| Storage | Reused | New `departments` table; same `@azure/data-tables` SDK, same partition-per-type pattern |
| Data access | New file | `src/lib/api/departments.ts` mirrors `teams.ts` structure exactly |
| Server state | New hooks | `useDepartments.ts` — same TanStack Query pattern |
| Color picker | No library | Custom swatch palette (10 Tailwind colors) + native `<input type="color">` |
| Routing | New pages | Next.js App Router; `await params` pattern already in codebase |
| Navigation | Modified | Add Departments link to `TopNav.tsx` |

**Critical version note:** Next.js 16. `params` is a `Promise` — must `await params` in Server Components, `use(params)` in Client Components. Existing codebase already follows this correctly.

---

## Feature Scope

### Table Stakes (all must ship v2.0)

- Department entity: name, color, description, dept head (free text)
- `departmentId` field on `Team` (membership link)
- Department CRUD in Settings (create, edit, delete)
- Team assignment via dropdown on team edit form in Settings
- Unassigned bucket for teams without `departmentId`
- `/departments` listing page with headcount, FTE, team count rollup
- `/departments/[deptId]` detail page showing dept's teams (baseline staffing, not scenario board)
- Department color badge on team board column headers
- Navigation updated: Departments as top-level section

### Differentiators (defer to v2.1 backlog)

- Business driver distribution rollup per dept (scenario-dependent, medium complexity)
- Retirement-eligible count per dept
- Squad vs non-squad count per dept

### Anti-Features (explicitly excluded)

- Per-department scenario scoping — breaks cross-org planning model
- Per-department RBAC — single-user app, future milestone
- Department budget fields — financial accuracy expectations the app cannot meet
- Nested departments — Azure Table Storage ill-suited for tree traversal
- Drag-and-drop team reassignment — structural master data; use a form
- Department health scores — pseudo-metrics with no agreed definition

---

## Architecture Decisions

### Schema Changes

**New table `departments`:** `partitionKey: 'department'` (fixed literal, consistent with `'team'`, `'scenario'`), `rowKey: uuid`. Fields: `name`, `description?`, `color`, `deptHead?`, `sortOrder`, `createdAt`, `updatedAt`.

**Modified `TeamEntity`:** add `departmentId?: string` — optional, backward-compatible. Existing rows load as `departmentId: undefined` with no change.

**Modified `Team` domain type:** matching `departmentId?: string` addition.

### Migration Strategy

Lazy, non-destructive. No migration script. Teams without `departmentId` appear as "Unassigned". One-time opt-in bulk-assign via `POST /api/admin/migrate-departments` in Settings. Uses `UpdateMode.Merge`. Protected by sentinel row `{ partitionKey: 'migration', rowKey: 'v2-departments' }` to ensure idempotency.

### Rollup Stats Strategy

Three parallel partition scans (departments, teams, members) at `/api/departments` request time. Group in memory: members by `baseTeamId`, teams by `departmentId`. Return `DepartmentSummary[]` with stats inline. **Never compute stats in a per-department loop.**

### Contradictions Reconciled

| Topic | Resolution |
|-------|------------|
| Startup migration | Use lazy/Unassigned approach — no data written without user action |
| Delete behavior | Block deletion if teams assigned (409), require explicit reassignment |
| CRUD location | Settings-first — consistent with existing `SeedSetupPanel` placement |

---

## Critical Pitfalls — Top 5

**Pitfall 1 (CRITICAL) — Seed `resetFirst` wipes live production teams.**
`runSeed()` with `resetFirst: true` calls `deleteByPartitionKey(teamClient, 'team')`. No environment guard exists.
- Prevention: Guard with `NODE_ENV` and connection string check before destructive delete.
- Phase: 1.

**Pitfall 2 (CRITICAL) — Migration not idempotent without sentinel row.**
Running migration twice creates duplicate "Default" departments.
- Prevention: Sentinel row `{ partitionKey: 'migration', rowKey: 'v2-departments' }` checked at migration start.
- Phase: 1.

**Pitfall 3 (CRITICAL) — `entityToTeam()` duplicated in `teams.ts` and `scenarios.ts`.**
TypeScript won't catch a missing optional field. Board state silently returns teams without `departmentId` from the scenario copy.
- Prevention: Consolidate to shared `src/lib/db/mappers.ts` before adding any new fields.
- Phase: 1.

**Pitfall 4 (MODERATE) — Deleting a department orphans team `departmentId` references.**
Azure Table Storage has no cascading deletes. Teams silently disappear from dept-scoped pages.
- Prevention: Block deletion if teams are assigned; confirmation dialog with assigned team count; require explicit reassignment.
- Phase: 3.

**Pitfall 5 (MODERATE) — Rollup stats as N parallel full-member scans.**
Calling `getAllMembers()` per department = N full table scans on every listing page load.
- Prevention: Fetch all members once, group in memory, return all stats in one `DepartmentSummary[]` response.
- Phase: 4.

---

## Recommended 5-Phase Build Order

| Phase | Name | Rationale |
|-------|------|-----------|
| 1 | Production Hardening + Schema Foundation | Must protect live data; 3 pre-conditions for all subsequent phases |
| 2 | Department CRUD API | UI depends on working endpoints; API is testable before UI exists |
| 3 | Department Management UI (Settings) | Departments must exist in DB before listing page shows anything useful |
| 4 | Navigation + Departments Listing Page | Depends on working API (Phase 2) + at least one dept in storage (Phase 3) |
| 5 | Department Detail Page + Visual Integration | Depends on dept filter API (Phase 2) and assigned teams (Phase 3–4) |

### Phase 1 deliverables
Seed production guard, migration sentinel design, `entityToTeam()` consolidation, `DepartmentEntity` + `TABLE_DEPARTMENTS`, `Department` type + `departmentId?` on `Team`, `'departments'` in `ensureTablesExist()`, seed updated with sample departments.

### Phase 2 deliverables
`src/lib/api/departments.ts`, API routes (`/api/departments` GET/POST, `/api/departments/[id]` GET/PATCH/DELETE), DELETE blocks on assigned teams (409), `GET /api/teams?departmentId=` optional filter, single-pass rollup computation, `POST /api/admin/migrate-departments` with sentinel check.

### Phase 3 deliverables
`DepartmentForm.tsx` (modal: name/color swatch/description/dept head), `useDepartments.ts` TanStack Query hooks, department CRUD section in Settings, `departmentId` dropdown on team edit form, bulk-assign Unassigned action, delete confirmation with team count.

### Phase 4 deliverables
`TopNav.tsx` Departments link (`pathname.startsWith('/departments')` active detection), `DepartmentCard.tsx`, `/departments` listing page with headcount/FTE/team count, "Unassigned" bucket, loading/error boundaries.

### Phase 5 deliverables
`DepartmentTeamList.tsx`, `/departments/[deptId]` detail page (read-only baseline staffing), breadcrumb nav, department color badge on team board column headers, loading/error boundaries.

---

## Open Decisions (safe defaults apply)

1. **Snapshot backward-compat:** Existing `boardStateJson` blobs have no `departmentId`. Since the field is optional they deserialize without error, but dept stats from restored snapshots will be incomplete. Default: accept limitation; add `schemaVersion: 1` to new BoardState objects.

2. **Detail page scope:** Read-only baseline staffing (default) vs full scenario board. Default: read-only — avoids scope creep into scenario API changes.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Stack | HIGH | Actual codebase inspection |
| Features (table stakes) | HIGH | Derived directly from data model and PROJECT.md spec |
| Architecture | HIGH | Direct code inspection of all relevant files |
| Migration safety | HIGH | `UpdateMode.Merge` confirmed in `@azure/data-tables` v13 |
| Pitfalls | HIGH | Direct codebase analysis; Azure Table Storage constraints confirmed |
