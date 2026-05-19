---
phase: 03-department-management-ui
plan: "01"
subsystem: ui
tags: [react, tanstack-query, hooks, departments, typescript]

# Dependency graph
requires:
  - phase: 02-department-api
    provides: Department CRUD REST endpoints at /api/departments and /api/admin/migrate-departments
provides:
  - TanStack Query hooks for all department CRUD operations (list, get, create, update, delete, migrate)
affects:
  - 03-02-department-settings-ui
  - 03-03-department-forms
  - 03-04-department-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useQuery with queryKey ['departments'] for list, ['department', id] for single
    - useMutation with onSuccess invalidateQueries for cache invalidation
    - Custom error extraction from non-ok fetch responses (409 with assignedTeamCount)

key-files:
  created:
    - src/lib/hooks/useDepartments.ts
  modified: []

key-decisions:
  - "useDeleteDepartment uses raw fetch (not fetchJSON) to access full response body for 409 error extraction including assignedTeamCount"
  - "useMigrateDepartments uses raw fetch for same reason — needs json.data extraction and error message from response body"
  - "useDepartment includes enabled: !!deptId guard matching pattern from useScenario.ts useBoardState"

patterns-established:
  - "Department hooks: all mutations invalidate ['departments'] queryKey on success"
  - "Error enrichment pattern: throw new Error(JSON.stringify({...})) to pass structured data through mutation error"

requirements-completed: [DEPT-01, DEPT-02, DEPT-03, DEPT-04]

# Metrics
duration: 1min
completed: 2026-05-19
---

# Phase 03 Plan 01: Department Query Hooks Summary

**Six TanStack Query hooks for department CRUD covering list, get, create, update, delete, and bulk migration with 409 assignedTeamCount error extraction**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-19T19:27:26Z
- **Completed:** 2026-05-19T19:28:40Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created useDepartments.ts with all 6 hooks following exact patterns from useScenario.ts and useTeamBoard.ts
- useDeleteDepartment extracts assignedTeamCount from 409 response body to allow UI to show "N teams still assigned" blocking message
- useMigrateDepartments calls POST /api/admin/migrate-departments for bulk team reassignment
- TypeScript compiles without errors (tsc --noEmit passes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useDepartments hooks file with TanStack Query patterns** - `39eaf5a` (feat)

**Plan metadata:** _(to be added with final docs commit)_

## Files Created/Modified

- `src/lib/hooks/useDepartments.ts` - All 6 department hooks: useDepartmentList, useDepartment, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, useMigrateDepartments

## Decisions Made

- Used raw `fetch` (not `fetchJSON`) in `useDeleteDepartment` and `useMigrateDepartments` because `fetchJSON` throws on non-ok responses before the caller can read the response body. Raw fetch allows extracting `assignedTeamCount` from 409 payloads and `json.error` from other error responses.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All department query hooks ready for use by Settings UI components in 03-02
- Cache invalidation pattern established: all mutations invalidate `['departments']` queryKey
- Error enrichment pattern ready for DeleteDepartmentModal in 03-03 to parse `assignedTeamCount`

---
*Phase: 03-department-management-ui*
*Completed: 2026-05-19*
