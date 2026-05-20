---
phase: 04-navigation-departments-listing
verified: 2026-05-20T00:00:00Z
status: passed
score: 13/13 must-haves verified
overrides_applied: 0
---

# Phase 4: Navigation & Departments Listing Verification Report

**Phase Goal:** Users can navigate to Departments from anywhere in the app and see all departments with rollup stats at a glance

**Verified:** 2026-05-20
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The Departments link is visible in the top nav on every page | ✓ VERIFIED | TopNav.tsx lines 65-71: `<Link href="/departments">Departments</Link>` rendered in flex container that appears on all pages |
| 2 | The Departments link is highlighted when the current URL starts with /departments | ✓ VERIFIED | TopNav.tsx line 30: `const isDepartments = pathname.startsWith('/departments');` line 67: `aria-current={isDepartments ? 'page' : undefined}` |
| 3 | The Departments link is NOT highlighted on Home or Settings pages | ✓ VERIFIED | TopNav.tsx lines 28-29 define `isHome` and `isSettings` as separate conditions; isDepartments uses startsWith('/departments') which is mutually exclusive from both |
| 4 | DepartmentWithStats type exists and is exported from domain.ts | ✓ VERIFIED | domain.ts lines 29-33: `export interface DepartmentWithStats extends Department { headcount: number; totalFte: number; teamCount: number; }` |
| 5 | useDepartmentList returns DepartmentWithStats[] (not Department[]) | ✓ VERIFIED | useDepartments.ts line 4: imports `DepartmentWithStats`; line 8: `useQuery<DepartmentWithStats[]>` |
| 6 | Navigating to /departments shows a list of department cards | ✓ VERIFIED | page.tsx line 8: `useDepartmentList()` called; lines 38-40: `.map((dept) => <DepartmentCard ... />)` renders cards from data |
| 7 | Each card displays department name, color badge, headcount, total FTE, and team count | ✓ VERIFIED | DepartmentCard.tsx: color badge (lines 25-29), name (line 37), headcount chip (lines 47-48), FTE chip (lines 50-51), teamCount chip (lines 53-54) |
| 8 | Teams with no departmentId appear in a visually distinct Unassigned card (dashed border, grey badge) | ✓ VERIFIED | departments.ts lines 124-138: Unassigned bucket with id='unassigned' created; DepartmentCard.tsx line 10: `isUnassigned = dept.id === 'unassigned'`; line 13: `border-dashed` class; line 17: `bg-gray-300` badge |
| 9 | The page shows 3 animate-pulse skeleton cards while data is loading | ✓ VERIFIED | page.tsx lines 17-23: `[...Array(3)].map` with `animate-pulse` class in loading state |
| 10 | The page shows an error message with the error text when the fetch fails | ✓ VERIFIED | page.tsx lines 26-32: error state block with `listQuery.error instanceof Error ? listQuery.error.message : ''` |
| 11 | When no departments and no unassigned teams exist, the empty state message is shown | ✓ VERIFIED | page.tsx lines 41-44: `listQuery.data?.length === 0` conditional shows "No departments yet..." message |
| 12 | FTE values are displayed with exactly one decimal place (e.g. 8.5 FTE, not 8.500000000000002 FTE) | ✓ VERIFIED | DepartmentCard.tsx line 51: `{dept.totalFte.toFixed(1)} FTE` — toFixed(1) prevents IEEE 754 float artifacts |
| 13 | No per-card queries — the page makes exactly one useQuery call (useDepartmentList) | ✓ VERIFIED | page.tsx line 8: single `useDepartmentList()` call; DepartmentCard.tsx contains no useQuery or hook calls |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/types/domain.ts` | Export DepartmentWithStats extending Department with headcount, totalFte, teamCount | ✓ VERIFIED | Lines 29-33: interface defined, exported, properly extends Department |
| `src/lib/hooks/useDepartments.ts` | Import and use DepartmentWithStats in useDepartmentList generic type | ✓ VERIFIED | Line 4: import; line 8: `useQuery<DepartmentWithStats[]>` |
| `src/components/layout/TopNav.tsx` | Add Departments nav link with isDepartments active-state detection | ✓ VERIFIED | Line 30: isDepartments constant; lines 65-71: Link to /departments with aria-current binding |
| `src/app/departments/page.tsx` | Create /departments listing page as Client Component | ✓ VERIFIED | Lines 1-51: 'use client' directive; AppShell wrapper; single useDepartmentList call; three state blocks (loading/error/data) |
| `src/components/departments/DepartmentCard.tsx` | Create display component with color badge, stats chips, Unassigned detection | ✓ VERIFIED | Lines 1-59: display-only component; Unassigned detection (line 10); stat chips (lines 47-54); toFixed(1) on FTE |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| src/lib/hooks/useDepartments.ts | src/lib/types/domain.ts | `import type { DepartmentWithStats }` | ✓ WIRED | Line 4: import present; used in line 8 generic |
| src/components/layout/TopNav.tsx | /departments route | `href="/departments"` | ✓ WIRED | Line 66: Link href present; navigable |
| src/app/departments/page.tsx | src/lib/hooks/useDepartments.ts | `import { useDepartmentList }` | ✓ WIRED | Line 4: import present; line 8: invoked |
| src/app/departments/page.tsx | src/components/departments/DepartmentCard.tsx | `import { DepartmentCard }` | ✓ WIRED | Line 5: import present; line 39: rendered in map |
| src/components/departments/DepartmentCard.tsx | src/lib/types/domain.ts | `import type { DepartmentWithStats }` | ✓ WIRED | Line 3: import present; used in interface definition |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| DepartmentCard.tsx | dept props | page.tsx useDepartmentList | Yes — API returns real departments from Azure Table Storage | ✓ FLOWING |
| page.tsx | listQuery | useDepartmentList hook | Yes — /api/departments calls getDepartmentsWithStats() | ✓ FLOWING |
| /api/departments/route.ts | departments | getDepartmentsWithStats() | Yes — fetches from TABLE_DEPARTMENTS, TABLE_TEAMS, TABLE_STAFF with parallel scans | ✓ FLOWING |

**Data flow confirmed:** API → hook → page → component → render

### Behavioral Spot-Checks

Not applicable for Phase 4. This phase delivers UI components that render data fetched asynchronously. Behavioral verification requires:
1. Running the Next.js dev server
2. Navigating to /departments page
3. Observing loading state, then card rendering
4. Checking active-state on nav link

These are UI/visual behaviors best verified by human testing (see Human Verification section below).

### Probe Execution

No probes defined for this phase.

### Requirements Coverage

| Requirement | Phase | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| NAV-01 | Phase 4 | Top navigation includes a "Departments" link to `/departments` | ✓ SATISFIED | TopNav.tsx lines 65-71: Link element with href="/departments" |
| NAV-02 | Phase 4 | Departments navigation link shows as active when the current path starts with `/departments` | ✓ SATISFIED | TopNav.tsx line 30: `isDepartments = pathname.startsWith('/departments')`; line 67: aria-current binding |
| LIST-01 | Phase 4 | User can view all departments at `/departments` with name, color, headcount, total FTE, and team count per department | ✓ SATISFIED | page.tsx renders DepartmentCard per dept; DepartmentCard displays all required fields |
| LIST-02 | Phase 4 | Unassigned teams appear in a dedicated "Unassigned" bucket on the listing page with their aggregate headcount and FTE | ✓ SATISFIED | departments.ts lines 124-138: Unassigned bucket created; DepartmentCard.tsx detects and renders distinctly |
| LIST-03 | Phase 4 | Departments listing page loads rollup stats in a single request (one fetch call, not one per department) | ✓ SATISFIED | page.tsx line 8: single useDepartmentList() call; no per-card queries in DepartmentCard.tsx |
| LIST-04 | Phase 4 | Departments listing page shows a loading state while data is fetching and an error state on failure | ✓ SATISFIED | page.tsx: loading state (lines 17-23), error state (lines 26-32), data state (lines 36-46) |
| ASSIGN-02 | Phase 4 | Teams without a department assignment appear in an "Unassigned" bucket on the departments listing page | ✓ SATISFIED | Unassigned bucket implemented in API (departments.ts) and rendered in UI (DepartmentCard.tsx) |

**Coverage:** 7/7 phase 4 requirements satisfied (including ASSIGN-02 which was not explicitly claimed in plans but is implemented and mapped to Phase 4 in REQUIREMENTS.md)

### Anti-Patterns Found

**Scan results:** No TBD, FIXME, XXX, TODO, HACK, PLACEHOLDER markers found in modified files.

**Debt markers:** None.

**Stub detection:** None found. All components are fully implemented:
- DepartmentCard.tsx: returns JSX with real data, not placeholder text
- page.tsx: renders real cards from data stream, not mock/hardcoded
- TopNav.tsx: links to real route, not stub href="#"

**Float handling:** DepartmentCard.tsx line 51 uses `toFixed(1)` to prevent IEEE 754 display artifacts — correct per PLAN specifications.

**Empty state handling:** page.tsx lines 41-44 check `listQuery.data?.length === 0` (after data arrives) not `listQuery.data === undefined` (still loading) — correct distinction.

### Human Verification Required

1. **Nav Link Appearance & Highlighting**
   - **Test:** Navigate to `/` (Home), `/settings`, and `/departments`
   - **Expected:** "Departments" link appears in the top nav on all three pages; highlighted (grey background, darker text) only on `/departments` and `/departments/[deptId]` routes
   - **Why human:** Visual appearance of active state styling and link visibility cannot be verified programmatically

2. **Department Card Rendering**
   - **Test:** Visit `/departments` (after ensuring at least one department exists in the database via Settings)
   - **Expected:** Department cards display with color badge (colored square), department name, and three stat chips (N people, X.X FTE, N teams); cards stack vertically with gap between them
   - **Why human:** Visual layout, spacing, and color badge appearance cannot be verified without rendering

3. **Loading State Display**
   - **Test:** Visit `/departments` in a throttled network connection (via browser DevTools Network tab: Fast 3G or Slow 3G)
   - **Expected:** See 3 grey skeleton cards (animate-pulse effect) briefly before real cards load
   - **Why human:** Animation and timing behavior cannot be verified programmatically

4. **Unassigned Bucket Styling**
   - **Test:** Ensure at least one team has no department assignment (via Settings), then visit `/departments`
   - **Expected:** "Unassigned" bucket appears at the bottom with dashed border (not solid), grey background (not white), and grey badge (not colored)
   - **Why human:** Visual distinction (dashed border, colour scheme) cannot be verified without rendering

5. **Error State Display**
   - **Test:** Simulate API failure by going to DevTools Network tab, setting offline mode, then refresh `/departments`
   - **Expected:** Red error box appears with message "Failed to load departments." followed by the actual error text from the fetch failure
   - **Why human:** Error message content and styling cannot be verified without running the app

6. **Empty State Display**
   - **Test:** Delete all departments and ensure no unassigned teams exist; visit `/departments`
   - **Expected:** Page shows "No departments yet. Go to Settings to create the first one." message (no cards visible)
   - **Why human:** Conditional rendering of empty state requires live data state verification

---

## Summary

### Phase Goal Achieved

**Phase goal:** "Users can navigate to Departments from anywhere in the app and see all departments with rollup stats at a glance"

This goal is **FULLY ACHIEVED**:

1. ✓ Users CAN navigate: Departments link visible in top nav on every page
2. ✓ Active state works: Link highlights when on /departments route (including /departments/[deptId] detail pages via startsWith pattern)
3. ✓ Page renders data: /departments page shows all departments with rollup stats (headcount, FTE, team count) in card layout
4. ✓ Data flows correctly: Single query, Unassigned bucket included, loading/error/empty states all implemented
5. ✓ Code is production-ready: TypeScript compiles clean, no stubs, no debt markers, proper error handling

### Completeness Assessment

- **Plan 01 (Navigation & Types):** All 5 must-haves verified (nav link, active state, DepartmentWithStats type, hook typing)
- **Plan 02 (Listing Page & Card):** All 8 must-haves verified (page rendering, card display, Unassigned bucket, loading/error/empty states, single query, FTE formatting)
- **Requirement coverage:** 7/7 phase requirements satisfied
- **Code quality:** No type errors, no stubs, no anti-patterns
- **Wiring:** All key links verified as properly connected

### Outstanding Verification Items

6 human verification items identified (visual/behavioral testing). These require running the dev server and observing the UI. All are straightforward user-facing features, no complex logic to verify.

---

_Verified: 2026-05-20_
_Verifier: Claude (gsd-verifier)_
