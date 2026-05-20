---
phase: 04-navigation-departments-listing
plan: 01
subsystem: navigation, types
tags: [type-system, navigation, active-state]
duration_minutes: 8
completed_date: "2026-05-20"
completed_tasks: 2
completed_files: 3
dependency_graph:
  provides:
    - DepartmentWithStats type for downstream pages
    - Departments nav link entry point
  requires:
    - Department type (pre-existing)
    - Next.js Link, usePathname (pre-existing)
  affects:
    - Phase 04-02 (departments listing page — can now import DepartmentWithStats)
    - Phase 05 (departments detail page — inherits startsWith pattern)
tech_stack:
  added: []
  patterns:
    - startsWith active-state detection for nested routes
key_files:
  created: []
  modified:
    - src/lib/types/domain.ts (new DepartmentWithStats interface)
    - src/lib/hooks/useDepartments.ts (type updated)
    - src/components/layout/TopNav.tsx (Departments link added)
---

# Phase 4 Plan 1: Navigation & DepartmentWithStats Foundation Summary

Fix the DepartmentWithStats type gap and deliver the Departments navigation entry point (NAV-01, NAV-02).

## Completed Tasks

### Task 1: Add DepartmentWithStats to domain.ts and fix useDepartmentList type
**Commit:** 0f310cd

- Added `DepartmentWithStats extends Department` interface with three fields: `headcount: number`, `totalFte: number`, `teamCount: number`
- Updated `useDepartments.ts` to import `DepartmentWithStats`
- Changed `useDepartmentList()` return type from `useQuery<Department[]>` to `useQuery<DepartmentWithStats[]>`
- TypeScript compilation passes with zero errors

**Files modified:**
- src/lib/types/domain.ts (lines 29-32)
- src/lib/hooks/useDepartments.ts (lines 4, 8)

### Task 2: Add Departments nav link to TopNav.tsx
**Commit:** 0e41e71

- Added `isDepartments` constant using `pathname.startsWith('/departments')` (supports nested detail pages like /departments/[deptId])
- Added Departments Link element after Settings link in the navigation bar
- Applied identical className and aria-current active-state pattern as existing Home/Settings links
- Text content: "Departments"
- TypeScript compilation passes with zero errors

**Files modified:**
- src/components/layout/TopNav.tsx (lines 30, 66-71)

## Verification

All acceptance criteria met:

- ✓ `src/lib/types/domain.ts` exports `DepartmentWithStats extends Department` with headcount, totalFte, teamCount
- ✓ `src/lib/hooks/useDepartments.ts` imports DepartmentWithStats and uses it in useDepartmentList generic
- ✓ `src/components/layout/TopNav.tsx` declares isDepartments using startsWith pattern
- ✓ Departments Link has href="/departments", aria-current binding, and matching className styling
- ✓ isHome and isSettings declarations unchanged (lines 28-29)
- ✓ `npx tsc --noEmit` passes with zero errors
- ✓ grep confirms: isDepartments appears 2x, startsWith 1x, href="/departments" 1x

## Deviations from Plan

None — plan executed exactly as written.

## Threats Addressed

No new threats introduced. Per threat_model in plan:

- JSX text rendering auto-escaped by React (T-04-01) — no dangerouslySetInnerHTML used
- Color values in inline styles (T-04-02) — scoped to element, no script vector
- Route access (T-04-03) — single-user app, no auth required in v2.0

## Known Stubs

None. All functionality wired and typed correctly.

## Context for Downstream Plans

- **For Phase 04-02 (departments listing page):** DepartmentWithStats is now exported and ready to import. `useDepartmentList()` returns the correct type with rollup stats fields pre-typed.
- **For Phase 05 (departments detail page):** The `startsWith('/departments')` pattern in isDepartments ensures active-state persists when navigating to /departments/[deptId] detail routes.

## Self-Check: PASSED

- ✓ src/lib/types/domain.ts exists and contains DepartmentWithStats
- ✓ src/lib/hooks/useDepartments.ts exists and imports + uses DepartmentWithStats
- ✓ src/components/layout/TopNav.tsx exists and has Departments link with startsWith
- ✓ Commit 0f310cd exists
- ✓ Commit 0e41e71 exists
- ✓ TypeScript compilation passes
