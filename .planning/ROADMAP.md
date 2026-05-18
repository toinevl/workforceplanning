# Roadmap: Workforce Planning v2.0 — Enterprise Departments

**Milestone:** v2.0 Enterprise Departments
**Started:** 2026-05-18
**Granularity:** Standard (5 phases)
**Requirements:** 24 v2.0 requirements, 100% mapped

---

## Phases

- [ ] **Phase 1: Production Hardening + Schema Foundation** - Guard live data, consolidate mappers, create Department entity and table
- [ ] **Phase 2: Department CRUD API** - All data access, API routes, rollup computation, and migration endpoint
- [x] **Phase 3: Department Management UI** - Department form, CRUD in Settings, team assignment dropdown
- [ ] **Phase 4: Navigation + Departments Listing** - Top nav update, `/departments` listing with rollup stats and Unassigned bucket
- [ ] **Phase 5: Department Detail Page + Visual Integration** - `/departments/[deptId]` detail page and color badges on board

---

## Phase Details

### Phase 1: Production Hardening + Schema Foundation

**Goal**: Live production data is protected and the data model foundation is ready for all Department feature work
**Depends on**: Nothing (first phase)
**Requirements**: HARD-01, HARD-02, HARD-03, DEPT-05, SEED-01

**Success Criteria** (what must be TRUE):

1. Running the seed panel on a production connection string does NOT wipe existing teams (destructive reset blocked)
2. Running the department migration endpoint twice results in exactly one "Default" department (sentinel row prevents duplicates)
3. A new `departmentId` field added to `TeamEntity` is returned by both the board state endpoint and the team listing endpoint without any code duplication (single `entityToTeam()` mapper)
4. The `departments` table is created automatically on app startup alongside all existing tables
5. The local dev seed creates sample departments and assigns teams to them, enabling multi-department development from first run

**Plans**: TBD

**Implementation notes**:

- Pitfall 1 (CRITICAL): Guard `runSeed()` `resetFirst` path with both `NODE_ENV === 'production'` and connection string check (non-`UseDevelopmentStorage`). Failing this wipes live teams.
- Pitfall 2 (CRITICAL): Sentinel row pattern — write `{ partitionKey: 'migration', rowKey: 'v2-departments' }` before any bulk insert; check for it at migration start. Same pattern applies to ASSIGN-04 in Phase 2.
- Pitfall 3 (CRITICAL): Consolidate `entityToTeam()` to `src/lib/db/mappers.ts` before touching any team schema. TypeScript will not catch missing optional fields from a stale copy.
- Schema: `DepartmentEntity` uses `partitionKey: 'department'` (fixed literal, matches `'team'`/`'scenario'` convention), `rowKey: uuid`. Fields: `name`, `description?`, `color`, `deptHead?`, `sortOrder`, `createdAt`, `updatedAt`.
- `departmentId?: string` on `TeamEntity` and `Team` domain type — optional, backward-compatible; existing rows load as `undefined` with no migration needed.

### Phase 2: Department CRUD API

**Goal**: All department and team-assignment operations are available via tested API endpoints before any UI is built
**Depends on**: Phase 1
**Requirements**: ASSIGN-04

**Success Criteria** (what must be TRUE):

1. `GET /api/departments` returns all departments with rollup stats (headcount, FTE, team count) computed in a single pass — not one request per department
2. `POST /api/departments`, `PATCH /api/departments/[id]`, and `DELETE /api/departments/[id]` all respond correctly; DELETE returns 409 with assigned team count when teams are still linked
3. `GET /api/teams?departmentId=` filters teams by department (supports future detail page)
4. `POST /api/admin/migrate-departments` assigns all unassigned teams to a default department, is idempotent (safe to run twice), and uses `UpdateMode.Merge` (no data loss on partial fields)

**Plans**: TBD

**Implementation notes**:

- Pitfall 4 (MODERATE): DELETE must check `departmentId` references across the teams table before deleting. Azure Table Storage has no cascading deletes — orphaned `departmentId` on teams causes silent disappearance from dept-scoped pages.
- Pitfall 5 (MODERATE): Rollup stats — fetch all departments, all teams, and all members in three parallel partition scans. Group in memory: members by `baseTeamId`, teams by `departmentId`. Never call `getAllMembers()` inside a per-department loop.
- `ASSIGN-04` migration endpoint uses same sentinel row pattern as HARD-03: check `{ partitionKey: 'migration', rowKey: 'v2-departments' }` before executing any writes.
- Mirror `src/lib/api/departments.ts` structure from `teams.ts` for consistency.

### Phase 3: Department Management UI

**Goal**: Users can create, edit, and delete departments and assign teams to departments via the Settings page
**Depends on**: Phase 2
**Requirements**: DEPT-01, DEPT-02, DEPT-03, DEPT-04, ASSIGN-01, ASSIGN-02, ASSIGN-03

**Success Criteria** (what must be TRUE):

1. User can open Settings, create a department with name, color (swatch palette), description, and department head, and see it appear immediately
2. User can edit any field of an existing department and save changes
3. User cannot delete a department that has teams assigned — a clear error message shows how many teams are blocking deletion
4. User can delete a department with no assigned teams
5. Team edit form in Settings shows a department dropdown; saving assigns the team to the chosen department
6. A one-time "Assign all unassigned teams" bulk action in Settings triggers the migration endpoint and shows success/failure feedback

**Plans**: 4 plans in 2 waves

- [x] 03-01-PLAN.md — useDepartments TanStack Query hooks (Wave 1)
- [x] 03-02-PLAN.md — ColorPicker and DepartmentForm components (Wave 1)
- [x] 03-03-PLAN.md — DepartmentsSection in Settings page (Wave 2)
- [x] 03-04-PLAN.md — Team form dropdown + bulk migration button (Wave 2)

**UI hint**: yes

**Implementation notes**:

- Color picker: custom swatch palette using 10 Tailwind colors + native `<input type="color">` fallback. No new library dependency.
- `useDepartments.ts` TanStack Query hooks mirror existing `useTeams`/`useScenarios` patterns.
- Pitfall 4 continuation: delete confirmation dialog must display the count of assigned teams, sourced from the 409 response body (not a separate fetch).
- ASSIGN-02 (Unassigned bucket) is surfaced on the listing page (Phase 4), but the underlying data state (team with no `departmentId`) is established here.
- ASSIGN-03 (bulk-assign) calls `POST /api/admin/migrate-departments` from Phase 2 — confirm the Phase 2 endpoint is fully operational before wiring the UI button.

### Phase 4: Navigation + Departments Listing

**Goal**: Users can navigate to Departments from anywhere in the app and see all departments with rollup stats at a glance
**Depends on**: Phase 3
**Requirements**: NAV-01, NAV-02, LIST-01, LIST-02, LIST-03, LIST-04

**Success Criteria** (what must be TRUE):

1. The top navigation bar includes a "Departments" link that navigates to `/departments`
2. The Departments nav link shows an active/highlighted state when the current URL path starts with `/departments` (including detail pages)
3. The `/departments` page lists all departments with name, color, headcount, total FTE, and team count for each
4. Teams with no `departmentId` appear in a clearly labeled "Unassigned" bucket with aggregate headcount and FTE
5. The page shows a loading skeleton while data fetches and a descriptive error state on fetch failure

**Plans**: TBD

**UI hint**: yes

**Implementation notes**:

- Active nav detection: `pathname.startsWith('/departments')` — catches both `/departments` and `/departments/[deptId]`.
- `DepartmentCard.tsx` — new component rendering department color badge, name, and three stat chips.
- LIST-03 (single fetch): the `GET /api/departments` endpoint from Phase 2 already returns pre-computed rollup stats. The listing page makes one `useQuery` call — do not add per-card queries.
- Unassigned bucket: filter teams with `departmentId === undefined` after the single fetch; no separate API call needed.
- Next.js 16: if using Server Components for this page, `await params` in the component. If Client Component, `use(params)`.

### Phase 5: Department Detail Page + Visual Integration

**Goal**: Users can view a department's full team composition and the board reflects department identity with color badges
**Depends on**: Phase 4
**Requirements**: DETAIL-01, DETAIL-02, DETAIL-03, DETAIL-04, DETAIL-05

**Success Criteria** (what must be TRUE):

1. Navigating to `/departments/[deptId]` shows the department's name, color, description, department head, and the list of its teams with baseline headcount and FTE per team
2. A breadcrumb "Departments / [Department Name]" appears at the top of the detail page and links back to `/departments`
3. The detail page shows a loading state while fetching and a descriptive error state on failure (including a non-existent department ID)
4. Team column headers on the main scenario board display a small color badge matching the team's assigned department color

**Plans**: TBD

**UI hint**: yes

**Implementation notes**:

- Detail page is read-only baseline staffing — not a scenario board. Do not scope-creep into scenario API changes.
- Breadcrumb: reuse or adapt whatever breadcrumb component exists in the v1 codebase; check Settings/scenario pages for patterns.
- DETAIL-04 (color badge on board): `departmentId` is now on every `Team` object (Phase 1 mapper); look up the department's color from the departments query already cached by TanStack Query — no extra fetch needed.
- Next.js 16: `await params` in Server Components; `use(params)` in Client Components. This codebase already uses this pattern correctly — follow existing page conventions.
- Open decision: existing `boardStateJson` snapshots have no `departmentId`. Since the field is optional, deserialization succeeds but dept stats from old snapshots will be incomplete. Accept this limitation; add `schemaVersion: 1` to new `BoardState` objects if forward-compat is needed.

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Production Hardening + Schema Foundation | 0/? | Not started | - |
| 2. Department CRUD API | 0/? | Not started | - |
| 3. Department Management UI | 4/4 | Planning complete | 2026-05-18 |
| 4. Navigation + Departments Listing | 0/? | Not started | - |
| 5. Department Detail Page + Visual Integration | 0/? | Not started | - |

---

*Roadmap created: 2026-05-18*
*Coverage: 24/24 v2.0 requirements mapped*
