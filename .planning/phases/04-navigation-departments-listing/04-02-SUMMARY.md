---
phase: 04-navigation-departments-listing
plan: 02
subsystem: navigation, ui
tags: [listing-page, display-component, rollup-stats]
duration_minutes: 12
completed_date: "2026-05-20"
completed_tasks: 2
completed_files: 2
dependency_graph:
  provides:
    - /departments listing page visible to users
    - DepartmentCard display component for reuse in detail page
  requires:
    - DepartmentWithStats type (Plan 01)
    - useDepartmentList hook (Plan 01)
    - AppShell layout component (pre-existing)
  affects:
    - Phase 05 (departments detail page — can reuse DepartmentCard)
    - Future phase: bulk actions on departments list
tech_stack:
  added: []
  patterns:
    - Loading skeleton with 3 animate-pulse cards
    - Mutually exclusive conditional rendering (isLoading → isError → data)
    - toFixed(1) for FTE float safety
    - Unassigned bucket detection via id === 'unassigned'
key_files:
  created:
    - src/app/departments/page.tsx
    - src/components/departments/DepartmentCard.tsx
  modified: []
---

# Phase 4 Plan 2: Departments Listing Page Summary

Create the /departments listing page and DepartmentCard display component, delivering the full departments listing feature with loading, error, empty, and Unassigned-bucket states.

## Completed Tasks

### Task 1: Create DepartmentCard display component
**Commit:** 6030f40

- Created `src/components/departments/DepartmentCard.tsx` as a display-only React component
- Renders color badge, name/description block, and three stat chips (headcount, FTE, team count)
- Detects Unassigned bucket via `dept.id === 'unassigned'` and applies distinct styling:
  - Dashed border and grey background for container
  - Grey dashed badge instead of colored badge
  - Literal "Unassigned" text (ignores dept.name)
  - No description shown for Unassigned
- Uses `toFixed(1)` on FTE to prevent IEEE 754 float display bugs (e.g., 8.500000000000002)
- Implements plural logic: "team" vs "teams" based on teamCount
- No hooks, no navigation links, no edit/delete actions (display-only per Phase 4 scope)
- No per-card queries required

**Files created:**
- src/components/departments/DepartmentCard.tsx (59 lines)

### Task 2: Create /departments listing page
**Commit:** f982672

- Created `src/app/departments/page.tsx` as a Client Component (required for useDepartmentList TanStack Query hook)
- Wraps entire content in `<AppShell>` with no board prop
- Page structure: max-width container with heading + subheading
- Single `useDepartmentList()` call — no per-card queries
- Three mutually exclusive rendering states:
  - **Loading:** 3 skeleton divs with `animate-pulse` and `h-16` height
  - **Error:** Red container with error message from `listQuery.error`
  - **Data:** Renders `DepartmentCard` per department, includes Unassigned bucket when present
- Empty state: Shows "No departments yet. Go to Settings..." when `listQuery.data?.length === 0`
- TypeScript compiles cleanly with zero errors

**Files created:**
- src/app/departments/page.tsx (51 lines)

## Verification

All plan success criteria met:

- ✓ `/departments` page renders department cards from `useDepartmentList`
- ✓ Shows loading skeleton (3 pulse cards) while fetching
- ✓ Shows error state with error text on fetch failure
- ✓ Shows empty state message when `data?.length === 0`
- ✓ Each card displays name, color badge, headcount, FTE (1 decimal), team count
- ✓ Unassigned bucket rendered with dashed border and grey styling
- ✓ FTE values display with exactly 1 decimal place via `toFixed(1)`
- ✓ Single `useDepartmentList` call (no per-card queries)
- ✓ `npx tsc --noEmit` exits 0 (zero TypeScript errors)

All 9 verification checks from plan pass:
1. ✓ `tsc --noEmit` exits 0
2. ✓ `grep -n "'use client'" src/app/departments/page.tsx` returns line 1
3. ✓ `grep -c 'useDepartmentList' src/app/departments/page.tsx` returns 2 (import + call)
4. ✓ `grep -c 'useDepartment(' src/app/departments/page.tsx` returns 0
5. ✓ `grep -n 'animate-pulse' src/app/departments/page.tsx` returns line 20
6. ✓ `grep -n 'border-red-200' src/app/departments/page.tsx` returns line 27
7. ✓ `grep -n "toFixed(1)" src/components/departments/DepartmentCard.tsx` returns line 51
8. ✓ `grep -n "dept.id === 'unassigned'" src/components/departments/DepartmentCard.tsx` returns line 10
9. ✓ `grep -n 'border-dashed' src/components/departments/DepartmentCard.tsx` returns lines 13, 17

## Deviations from Plan

None — plan executed exactly as written. All components match specified patterns, all state handling follows DepartmentsSection.tsx precedent, all styling matches design specs.

## Threats Addressed

Per threat_model in plan — no new threats introduced:

- **T-04-04 (Tampering — dept.name rendered as JSX):** React JSX auto-escapes string children; no dangerouslySetInnerHTML used anywhere
- **T-04-05 (Tampering — inline style color):** CSS color values have no script execution vector; scoped to element
- **T-04-06 (Information Disclosure — error.message):** Error originates from app's own fetch layer, not external attacker input; no PII in dept API errors
- **T-04-07 (Information Disclosure — all dept names visible):** Single-user app with no auth in v2.0; accepted known limitation per REQUIREMENTS.md out-of-scope

## Known Stubs

None. All functionality is wired and complete:
- Data flows from API → useDepartmentList → page → DepartmentCard
- All state conditions (loading/error/empty) have content
- Unassigned bucket integrated seamlessly
- No placeholder text, no TODO comments

## Context for Downstream Plans

- **For Phase 05 (departments detail page):** DepartmentCard is a reusable display component. The detail page can import it directly and use it in a filtered context (department-scoped teams only).
- **For future bulk-actions phase:** The listing page structure (single fetch, clean state handling) provides a stable foundation for adding selection checkboxes or bulk-action buttons without refactoring.

## Self-Check: PASSED

- ✓ src/app/departments/page.tsx exists and is a 'use client' Client Component
- ✓ src/components/departments/DepartmentCard.tsx exists with correct export
- ✓ Both files import their dependencies correctly
- ✓ Commit 6030f40 exists (DepartmentCard)
- ✓ Commit f982672 exists (/departments page)
- ✓ TypeScript compilation clean with zero errors
- ✓ All acceptance criteria verified via grep checks
