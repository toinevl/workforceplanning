---
phase: 03-department-management-ui
plan: "03"
subsystem: ui
tags: [react, tanstack-query, tailwind, departments, settings, typescript]

# Dependency graph
requires:
  - phase: 03-01
    provides: useDepartments hooks (useDepartmentList, useDepartment, useCreateDepartment, useUpdateDepartment, useDeleteDepartment)
  - phase: 03-02
    provides: DepartmentForm and ColorPicker components
  - src/components/ui/ConfirmDialog.tsx
    provides: Delete confirmation dialog with error display
  - src/lib/types/domain.ts
    provides: Department interface
provides:
  - DepartmentsSection component with full CRUD management UI
  - Settings page with integrated department management
affects:
  - src/app/settings/page.tsx (renders DepartmentsSection)
  - Users can now create, edit, delete departments from /settings

# Tech tracking
tech-stack:
  added: []
  patterns:
    - EditFormWrapper sub-component to defer useDepartment fetch until edit mode is active
    - parseDeleteError utility to extract assignedTeamCount from JSON-serialised error message
    - key={deptId} on DepartmentForm to force re-mount with fresh state when switching departments
    - deleteMutation.reset() on dialog close to clear stale error state
    - isAnyPending aggregate flag to disable all action buttons during any in-flight mutation

key-files:
  created:
    - src/components/departments/DepartmentsSection.tsx
  modified:
    - src/app/settings/page.tsx

key-decisions:
  - "EditFormWrapper sub-component created to encapsulate useDepartment fetch, which must only be called with a real deptId (rules of hooks prevent conditional hook calls)"
  - "key={deptId} forces DepartmentForm to remount when selectedDeptId changes, resetting controlled field state automatically"
  - "deleteError is tracked separately from deleteMutation.error to allow clearing on dialog close and re-open"
  - "DepartmentsSection is rendered after SeedSetupPanel in Settings page with its own h2 and description for visual consistency"

requirements-completed: [DEPT-01, DEPT-02, DEPT-03, DEPT-04]

# Metrics
duration: 1min
completed: 2026-05-19
---

# Phase 03 Plan 03: Department CRUD Integration Summary

**DepartmentsSection component integrating all six department hooks with create/edit form, paginated list, delete confirmation dialog, and 409 error extraction wired into the Settings page**

## Performance

- **Duration:** ~4 min (including TypeScript verification)
- **Started:** 2026-05-19T19:33:45Z
- **Completed:** 2026-05-19T19:37:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created DepartmentsSection.tsx with a two-column desktop layout (form left, list right) using CSS grid
- Integrated all four CRUD mutation hooks alongside the list and single-department query hooks
- EditFormWrapper sub-component correctly gates the `useDepartment` fetch behind a non-null `deptId`, satisfying React rules of hooks
- Delete flow: ConfirmDialog opens on delete click, 409 error message parsed from JSON-stringified error and displayed in dialog, success closes dialog and resets state
- Loading skeletons shown while department list and individual department are fetching
- All action buttons disabled while any mutation is pending via `isAnyPending` aggregate
- Settings page updated: DepartmentsSection imported and rendered after SeedSetupPanel with section heading and description
- TypeScript compiles without errors (tsc --noEmit clean)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DepartmentsSection component** - `013efd2` (feat)
2. **Task 2: Integrate DepartmentsSection into Settings page** - `dc144aa` (feat)

## Files Created/Modified

- `src/components/departments/DepartmentsSection.tsx` — Full CRUD section component: two-column grid layout, EditFormWrapper, DepartmentCard, delete dialog integration, 409 error parsing, loading/error states
- `src/app/settings/page.tsx` — Added import and `<DepartmentsSection />` after SeedSetupPanel with Departments heading

## Decisions Made

- Used `EditFormWrapper` sub-component to wrap `useDepartment` call: Rules of Hooks prevent calling a hook conditionally, so wrapping the edit-mode form in a separate component that is only mounted when `selectedDeptId` is non-null cleanly solves the conditional fetch problem.
- `key={deptId}` on `DepartmentForm` inside `EditFormWrapper`: ensures the form fully remounts (resetting all `useState` fields) when the user switches from editing one department to another, rather than showing stale values in controlled inputs.
- Separate `deleteError` state (not `deleteMutation.error`): allows the error to persist in the dialog even after the dialog is closed and the mutation is reset, preventing flash-of-no-error on re-open.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data flows from live TanStack Query hooks. No hardcoded, mock, or placeholder data.

## Threat Flags

None - no new network endpoints, auth paths, or schema changes introduced. DepartmentsSection consumes existing API endpoints already covered in the phase threat model (T-03-13 through T-03-18). The `parseDeleteError` function only exposes `assignedTeamCount` (integer) from the 409 response body — no PII, consistent with T-03-16 mitigate disposition.

## Self-Check

- FOUND: src/components/departments/DepartmentsSection.tsx
- FOUND: src/app/settings/page.tsx (contains DepartmentsSection import and usage)
- FOUND commit: 013efd2 (feat(03-03): create DepartmentsSection component)
- FOUND commit: dc144aa (feat(03-03): add DepartmentsSection to Settings page)

## Self-Check: PASSED

---
*Phase: 03-department-management-ui*
*Completed: 2026-05-19*
