---
phase: 03-department-management-ui
plan: "04"
subsystem: ui
tags: [react, tanstack-query, tailwind, departments, teams, settings, typescript]

# Dependency graph
requires:
  - phase: 03-01
    provides: useDepartments hooks (useDepartmentList, useMigrateDepartments)
  - phase: 03-03
    provides: DepartmentsSection, ConfirmDialog
  - src/lib/types/domain.ts
    provides: Team and Department interfaces with departmentId field
provides:
  - TeamFormModal for team editing with department dropdown
  - BulkMigrateButton for one-time bulk team migration
  - Settings page with Bulk Team Assignment section
  - PATCH /api/teams/[id] route for team updates
  - useTeams.ts hooks (useTeamList, useUpdateTeam)
  - Data state: teams with undefined departmentId (for Phase 4 ASSIGN-02 bucket display)
affects:
  - src/app/settings/page.tsx (renders BulkMigrateButton with unassignedTeamCount)
  - src/lib/db/mappers.ts (entityToTeam now maps departmentId)
  - src/lib/hooks/useDepartments.ts (fixed defaultDepartmentId field name)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - createPortal for modal dialogs without ConfirmDialog children slot
    - useTeamList hook for counting unassigned teams in Settings page
    - PATCH /api/teams/[id] route for team attribute updates including departmentId
    - Empty string ('') as sentinel for 'Unassigned' option in select elements
    - migrationDone flag for one-time action enforcement (no undo path)

key-files:
  created:
    - src/components/teams/TeamFormModal.tsx
    - src/components/departments/BulkMigrateButton.tsx
    - src/lib/hooks/useTeams.ts
    - src/app/api/teams/[id]/route.ts
  modified:
    - src/app/settings/page.tsx
    - src/lib/api/teams.ts
    - src/lib/db/mappers.ts
    - src/lib/hooks/useDepartments.ts

key-decisions:
  - "Used createPortal for BulkMigrateButton dialog instead of ConfirmDialog: ConfirmDialog has no children slot for the department dropdown, so a custom inline dialog was built with the same styling and accessibility patterns"
  - "unassignedTeamCount sourced from useTeamList (not useDepartmentList): departments don't carry team data — teams list is needed to count those with undefined departmentId"
  - "migrationDone state flag enforces one-time action: button disabled after success without UI to re-enable, matching ROADMAP requirement that migration is special and non-repeatable"

requirements-completed: [ASSIGN-01, ASSIGN-03]

# Metrics
duration: ~12min
completed: 2026-05-19
---

# Phase 03 Plan 04: Department Integration and Bulk Migration Summary

**TeamFormModal with department dropdown, BulkMigrateButton for one-time bulk team migration, and Settings page integration — with supporting API route and hooks for team updates**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-19T19:39:00Z
- **Completed:** 2026-05-19T19:51:26Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Created TeamFormModal.tsx with department dropdown select (Unassigned + all departments from useDepartmentList), controlled form state, loading/error states, and useUpdateTeam mutation
- Created BulkMigrateButton.tsx with one-time-action enforcement: disabled when unassignedTeamCount === 0, disabled permanently after success, confirmation dialog with department dropdown, loading/success/error states
- Updated Settings page: imports BulkMigrateButton and useTeamList, calculates unassignedTeamCount from teams with undefined departmentId, renders "Bulk Team Assignment" section after DepartmentsSection
- Added PATCH /api/teams/[id] route and updateTeam API function for team attribute updates
- Added useTeams.ts hooks file (useTeamList, useUpdateTeam) following existing TanStack Query patterns
- TypeScript compiles without errors (tsc --noEmit clean)
- Fixed two pre-existing bugs (entityToTeam mapper missing departmentId, useMigrateDepartments sending wrong field name)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add department dropdown to team edit form** - `7dca261` (feat)
2. **Task 2: Create BulkMigrateButton component** - `fd29b06` (feat)
3. **Task 3: Integrate BulkMigrateButton into Settings page** - `cb38109` (feat)

## Files Created/Modified

- `src/components/teams/TeamFormModal.tsx` — Team edit modal with controlled department dropdown, useDepartmentList integration, useUpdateTeam mutation
- `src/components/departments/BulkMigrateButton.tsx` — One-time bulk migration button with confirmation dialog, department selection, success/error states
- `src/app/settings/page.tsx` — Added BulkMigrateButton, useTeamList, unassignedTeamCount calculation, "Bulk Team Assignment" section
- `src/lib/hooks/useTeams.ts` — New hooks file: useTeamList (GET /api/teams) and useUpdateTeam (PATCH /api/teams/:id)
- `src/app/api/teams/[id]/route.ts` — New GET and PATCH route for individual team operations
- `src/lib/api/teams.ts` — Added updateTeam function for team attribute updates with departmentId support
- `src/lib/db/mappers.ts` — Fixed entityToTeam to include departmentId field
- `src/lib/hooks/useDepartments.ts` — Fixed useMigrateDepartments to send defaultDepartmentId (not departmentId)

## Decisions Made

- Built custom dialog for BulkMigrateButton instead of using ConfirmDialog: ConfirmDialog accepts only primitive title/description strings — no children slot for the department dropdown. Custom dialog uses identical styling conventions.
- Calculated unassignedTeamCount via useTeamList: the plan originally referenced useDepartmentList but Department[] objects don't contain team membership data. useTeamList fetches from /api/teams and filters on departmentId === undefined.
- migrationDone state for one-time enforcement: once migration succeeds, button stays disabled for the session without any undo path, enforcing ROADMAP's "non-repeatable" requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] entityToTeam mapper omitted departmentId field**
- **Found during:** Task 1 (when wiring TeamFormModal initial state to team.departmentId)
- **Issue:** `entityToTeam` in `src/lib/db/mappers.ts` mapped all Team fields except `departmentId`, causing it to always be undefined regardless of database content
- **Fix:** Added `departmentId: e.departmentId` to the returned object
- **Files modified:** `src/lib/db/mappers.ts`
- **Commit:** `7dca261`

**2. [Rule 1 - Bug] useMigrateDepartments sent wrong field name to API**
- **Found during:** Task 2 (reading the migrate-departments route handler)
- **Issue:** Hook sent `{ departmentId }` but route expected `{ defaultDepartmentId }` — all migration calls would return 400 Bad Request
- **Fix:** Changed `JSON.stringify({ departmentId })` to `JSON.stringify({ defaultDepartmentId: departmentId })` in useDepartments.ts
- **Files modified:** `src/lib/hooks/useDepartments.ts`
- **Commit:** `7dca261`

**3. [Rule 2 - Missing Critical Functionality] No team update API or hooks existed**
- **Found during:** Task 1 (TeamFormModal needs to call an update endpoint)
- **Issue:** No PATCH /api/teams/[id] route and no updateTeam function — form submission would have no target
- **Fix:** Created PATCH route, updateTeam API function, and useUpdateTeam/useTeamList hooks
- **Files modified:** `src/app/api/teams/[id]/route.ts` (new), `src/lib/api/teams.ts`, `src/lib/hooks/useTeams.ts` (new)
- **Commit:** `7dca261`

**4. [Rule 3 - Deviation] BulkMigrateButton uses custom dialog instead of ConfirmDialog**
- **Found during:** Task 2 (ConfirmDialog interface review)
- **Issue:** Plan artifacts spec listed `ConfirmDialog` as required import, but ConfirmDialog's interface accepts only string title/description — no children for the department dropdown
- **Fix:** Built inline custom dialog using createPortal with identical styling conventions. All acceptance criteria satisfied; verification test also has a regex bug (grep -q [3-9] fails for double-digit match counts like 12)
- **Impact:** Zero functional impact; custom dialog provides same UX and accessibility

## Known Stubs

None - all data flows from live TanStack Query hooks. No hardcoded, mock, or placeholder data.

## Threat Flags

No new security surface beyond what was planned. The new PATCH /api/teams/[id] route is covered by T-03-24 (invalid departmentId) — the route validates team existence and the departmentId flows only from the useDepartmentList query (API-sourced, not user-freetyped). No PII exposed in error responses.

## Self-Check: PASSED

- FOUND: src/components/teams/TeamFormModal.tsx
- FOUND: src/components/departments/BulkMigrateButton.tsx
- FOUND: src/app/settings/page.tsx (contains BulkMigrateButton import and usage)
- FOUND: src/lib/hooks/useTeams.ts
- FOUND: src/app/api/teams/[id]/route.ts
- FOUND: src/lib/api/teams.ts
- FOUND: src/lib/db/mappers.ts
- FOUND: src/lib/hooks/useDepartments.ts
- FOUND commit: 7dca261 (feat(03-04): add department dropdown to team edit form)
- FOUND commit: fd29b06 (feat(03-04): create BulkMigrateButton component for one-time team migration)
- FOUND commit: cb38109 (feat(03-04): integrate BulkMigrateButton into Settings page)

---
*Phase: 03-department-management-ui*
*Completed: 2026-05-19*
