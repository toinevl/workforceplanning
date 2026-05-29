# Phase 4: Navigation + Departments Listing — Research

**Researched:** 2026-05-19
**Domain:** Next.js 16 App Router navigation, React Client Components, TanStack Query v5, Tailwind CSS
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Top navigation includes a "Departments" link to `/departments` | TopNav.tsx is a Client Component using `usePathname` and `next/link` — add link in existing nav link group |
| NAV-02 | Departments nav link shows as active when path starts with `/departments` | `usePathname` + `pathname.startsWith('/departments')` — same pattern as `isHome`/`isSettings` already in TopNav |
| LIST-01 | `/departments` lists all departments with name, color, headcount, total FTE, and team count | `GET /api/departments` returns `Department & { headcount, totalFte, teamCount }[]` — one `useQuery` call |
| LIST-02 | Unassigned teams appear in dedicated "Unassigned" bucket with aggregate headcount and FTE | API already appends an `id: 'unassigned'` bucket when unassigned teams exist — filter or render specially on the client |
| LIST-03 | Departments listing page loads rollup stats in a single request | `useDepartmentList` already calls `GET /api/departments` — no per-card queries; hook needs type fix |
| LIST-04 | Departments listing shows loading state while fetching and error state on failure | TanStack Query `isLoading`/`isError` + animate-pulse skeleton pattern — same as DepartmentsSection.tsx |
</phase_requirements>

---

## Summary

Phase 4 is a focused UI phase: two nav changes and one new page. All data access is already wired — `GET /api/departments` delivers pre-computed rollup stats (headcount, FTE, team count) including an `Unassigned` bucket when appropriate. No new API endpoints, no new libraries, no new hooks beyond type fixes.

The primary work is: (1) add a "Departments" link to `TopNav.tsx` using the same `usePathname`-based active-state pattern already used for Home/Settings; (2) create `src/app/departments/page.tsx` as a Client Component wrapping `AppShell`; (3) create `DepartmentCard.tsx` to render each department row with color badge and stat chips; (4) handle loading skeleton and error state inline on the page.

One pre-existing type gap must be fixed before the page can be typesafe: `useDepartmentList` is typed as `useQuery<Department[]>` but the API actually returns `Array<Department & { headcount: number; totalFte: number; teamCount: number }>`. The listing page needs the richer type. Fix the hook to use `DepartmentWithStats[]` (define the type in `domain.ts` or inline) — do not access `headcount`/`totalFte`/`teamCount` as if they already exist on `Department`.

**Primary recommendation:** Make this a two-plan phase: Plan 01 — nav link update (topnav change, type fix); Plan 02 — departments page + DepartmentCard component.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Departments nav link + active state | Frontend (Client Component) | — | `usePathname` is a Client Component hook; TopNav is already 'use client' |
| Departments listing data fetch | Frontend (Client Component) | API / Backend | One `useQuery` → `GET /api/departments` already handles the rollup |
| Rollup computation (headcount, FTE, team count) | API / Backend | — | Computed server-side in `getDepartmentsWithStats()` via 3-parallel scans — must NOT move to frontend |
| Unassigned bucket construction | API / Backend | — | Server already appends `{ id: 'unassigned', ... }` when unassigned teams exist |
| Loading / error states | Frontend (Client Component) | — | TanStack Query `isLoading`/`isError` drives inline conditional rendering |

---

## Standard Stack

### Core (no new packages — all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/link` | 16.2.4 | Client-side navigation | Built into Next.js; used in TopNav already |
| `next/navigation` `usePathname` | 16.2.4 | Active nav detection | Client Component hook; already used in TopNav |
| `@tanstack/react-query` | ^5.100.6 | Data fetching + cache | Project standard for all data access |
| `tailwind-merge` + `clsx` (`cn`) | installed | Conditional class names | Project utility already in `src/lib/utils/cn.ts` |
| React 19 | 19.2.4 | UI framework | Project base |

### No New Packages

This phase installs zero new dependencies. All required capabilities exist in the current stack.

**Package Legitimacy Audit**

> No packages added in this phase. Audit section intentionally omitted.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Client)
    │
    ├─► TopNav.tsx ('use client')
    │       usePathname() → pathname.startsWith('/departments') → active class
    │       <Link href="/departments"> Departments </Link>
    │
    └─► /departments/page.tsx ('use client')
            │
            useDepartmentList() (TanStack Query)
                    │
                    GET /api/departments
                            │
                    getDepartmentsWithStats()
                            │
                    Azure Table Storage
                    (3 parallel scans: departments, teams, members)
                            │
                    Returns: Department & { headcount, totalFte, teamCount }[]
                    + Unassigned bucket appended if unassigned teams exist
                            │
            ┌── isLoading → <LoadingSkeleton>
            ├── isError   → <ErrorState>
            └── data      → departments.map(dept => <DepartmentCard dept={dept}>)
```

### Recommended Project Structure

```
src/
├── app/
│   └── departments/
│       └── page.tsx            # New: /departments listing page (Client Component)
├── components/
│   └── departments/
│       ├── DepartmentCard.tsx  # New: card with color badge + stat chips
│       ├── BulkMigrateButton.tsx  # Existing (Phase 3)
│       ├── ColorPicker.tsx        # Existing (Phase 3)
│       ├── DepartmentForm.tsx     # Existing (Phase 3)
│       └── DepartmentsSection.tsx # Existing (Phase 3)
├── lib/
│   ├── hooks/
│   │   └── useDepartments.ts   # Modify: fix useDepartmentList type
│   └── types/
│       └── domain.ts           # Modify: add DepartmentWithStats type alias
```

### Pattern 1: Active Nav Link with `usePathname`

**What:** Derive active state from current pathname; use `aria-current="page"` to drive visual highlight via CSS.
**When to use:** Any nav link where active state must persist across child routes (e.g., `/departments` AND `/departments/[id]`).

```tsx
// Source: node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md
// Pattern already used in TopNav.tsx for isHome / isSettings
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// In TopNav:
const isDepartments = pathname.startsWith('/departments');

<Link
  href="/departments"
  aria-current={isDepartments ? 'page' : undefined}
  className="rounded px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-colors
             hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none
             focus-visible:ring-2 focus-visible:ring-gray-500
             aria-[current=page]:bg-gray-100 aria-[current=page]:text-gray-950"
>
  Departments
</Link>
```

**Key difference from Home/Settings:** Use `pathname.startsWith('/departments')` not `pathname === '/departments'` — covers both listing and detail pages (Phase 5).

### Pattern 2: TanStack Query Loading/Error/Data States

**What:** Inline conditional rendering driven by `isLoading`, `isError`, and `data`.
**When to use:** All data-fetching pages in this project. See DepartmentsSection.tsx for the established pattern.

```tsx
// Source: established in DepartmentsSection.tsx (Phase 3)
const listQuery = useDepartmentList(); // fix type to DepartmentWithStats[]

if (listQuery.isLoading) {
  return <LoadingSkeleton />;  // animate-pulse divs
}

if (listQuery.isError) {
  return <ErrorState error={listQuery.error} />;
}

const departments = listQuery.data ?? [];
```

### Pattern 3: Client Component Page with AppShell

**What:** Pages outside the scenario board wrap content in `<AppShell>` (without `board` prop).
**When to use:** Any top-level page (see `src/app/settings/page.tsx` and `src/app/page.tsx`).

```tsx
// Source: src/app/settings/page.tsx (Phase 3) and src/app/page.tsx
'use client';
import { AppShell } from '@/components/layout/AppShell';

export default function DepartmentsPage() {
  return (
    <AppShell>
      {/* page content */}
    </AppShell>
  );
}
```

### Pattern 4: DepartmentCard with Color Badge and Stat Chips

**What:** Card component showing department color swatch, name, and three numerical stats.
**When to use:** Each department entry in the listing; also used for the Unassigned bucket.

```tsx
// Source: DepartmentsSection.tsx color badge pattern (Phase 3)
// Color badge:
<span
  className="h-4 w-4 flex-shrink-0 rounded-full border border-gray-200"
  style={{ backgroundColor: dept.color }}
  aria-hidden="true"
/>

// Stat chip pattern (no existing example — new for Phase 4):
<span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700">
  {dept.headcount} people
</span>
```

### Anti-Patterns to Avoid

- **Per-card queries:** Never call `useDepartment(dept.id)` inside `DepartmentCard`. The listing page must make exactly one `useQuery` call for `GET /api/departments` — rollup stats are already in the response.
- **Separate Unassigned fetch:** No separate API call for unassigned teams. The API already appends the Unassigned bucket (`id: 'unassigned'`) when applicable. Filter or identify it client-side by `dept.id === 'unassigned'`.
- **Server Component for this page:** The page uses `useDepartmentList` (TanStack Query hook), which requires a Client Component. Do not attempt to make it a Server Component.
- **Accessing `headcount`/`totalFte`/`teamCount` on the `Department` type:** These fields do not exist on the base `Department` type. Fix `useDepartmentList` to use `DepartmentWithStats` before writing the page.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active nav state | Custom state or context | `usePathname().startsWith()` | Already the project pattern; zero overhead |
| Rollup stats (headcount, FTE, team count) | Per-card fetches or client-side grouping | `GET /api/departments` response (already pre-computed) | Phase 2 implemented 3-parallel-scan server-side computation; re-doing it client-side defeats the design |
| Color swatch rendering | Custom CSS gradient or SVG | `style={{ backgroundColor: dept.color }}` on a rounded div | Same pattern as DepartmentsSection.tsx color badge |
| Loading skeleton | Spinner or `null` render | `animate-pulse` divs (same pattern as scenarios/loading.tsx) | Consistent project UX |
| Error display | Toast or alert box | Inline bordered error div (same pattern as DepartmentsSection.tsx `listQuery.isError` block) | Consistent; does not require portal/modal |

---

## Critical Pre-Existing Gap: `useDepartmentList` Type Mismatch

**What:** `useDepartmentList` in `src/lib/hooks/useDepartments.ts` is typed as `useQuery<Department[]>`, but `GET /api/departments` returns `Array<Department & { headcount: number; totalFte: number; teamCount: number }>`. TypeScript will not surface `headcount`, `totalFte`, or `teamCount` when consuming the hook.

**Impact:** Without a type fix, the listing page has two bad options: (a) use `as any` / type assertions — unsafe; (b) silently access undefined fields — runtime errors.

**Fix required in Plan 01:**
1. Add `DepartmentWithStats` to `src/lib/types/domain.ts`:
   ```ts
   export interface DepartmentWithStats extends Department {
     headcount: number;
     totalFte: number;
     teamCount: number;
   }
   ```
2. Update `useDepartmentList` to `useQuery<DepartmentWithStats[]>`.

**Note:** The Unassigned bucket (`id: 'unassigned'`) is already shaped as `DepartmentWithStats` by the API (same fields), so the type covers it too.

---

## Common Pitfalls

### Pitfall 1: `isHome`/`isSettings` pattern uses `===`, but Departments needs `startsWith`

**What goes wrong:** `pathname === '/departments'` makes the nav link appear inactive when visiting `/departments/[deptId]` (Phase 5 detail pages).
**Why it happens:** Exact match only covers the listing page URL.
**How to avoid:** Use `pathname.startsWith('/departments')` — confirmed by ROADMAP implementation note.
**Warning signs:** Nav link deactivates when clicking through to a department detail page.

### Pitfall 2: `useDepartmentList` type does not include stats fields

**What goes wrong:** TypeScript compiles but `dept.headcount`, `dept.totalFte`, `dept.teamCount` are `undefined` at runtime (or TypeScript errors prevent compilation).
**Why it happens:** `useDepartmentList` is typed as `Department[]` but the API returns the extended shape.
**How to avoid:** Fix the hook type in Plan 01 before the page is written in Plan 02.
**Warning signs:** TypeScript error "Property 'headcount' does not exist on type 'Department'" OR values silently undefined.

### Pitfall 3: Unassigned bucket rendered as a regular department card

**What goes wrong:** The Unassigned bucket (`id: 'unassigned'`) is rendered identically to real departments, but it has no real ID and must be visually distinguished (LIST-02: "clearly labeled 'Unassigned' bucket").
**Why it happens:** Mapping `departments.map(d => <DepartmentCard dept={d} />)` treats all items equally.
**How to avoid:** In `DepartmentCard` (or the page mapping logic), check `dept.id === 'unassigned'` and apply distinct styling (e.g., dashed border, grey badge, explicit "Unassigned" label).
**Warning signs:** Success criterion 4 fails — Unassigned bucket not visually distinct.

### Pitfall 4: Departments page is a Server Component importing TanStack Query hooks

**What goes wrong:** Next.js 16 throws a build error if `useQuery` is used without `'use client'`.
**Why it happens:** Next.js App Router defaults to Server Components for `page.tsx` files.
**How to avoid:** Add `'use client'` at the top of `src/app/departments/page.tsx`.
**Warning signs:** Build error: "You're importing a component that needs useState/useQuery. It only works in a Client Component."

### Pitfall 5: Stat chip number formatting

**What goes wrong:** FTE values like `12.5` display as `12.5` but `totalFte` accumulates as floating point and may show as `12.500000000000002`.
**Why it happens:** IEEE 754 float arithmetic in the server-side FTE summation.
**How to avoid:** Round or format with `toFixed(1)` when displaying FTE in stat chips.
**Warning signs:** FTE chips show unexpectedly long decimal strings.

---

## Code Examples

Verified patterns from official sources and project codebase:

### TopNav: Adding Departments Link

```tsx
// Source: src/components/layout/TopNav.tsx (existing pattern) + ROADMAP note
// Add inside the existing <div className="flex items-center gap-1"> block:

const isDepartments = pathname.startsWith('/departments');

<Link
  href="/departments"
  aria-current={isDepartments ? 'page' : undefined}
  className="rounded px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-colors
             hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none
             focus-visible:ring-2 focus-visible:ring-gray-500
             aria-[current=page]:bg-gray-100 aria-[current=page]:text-gray-950"
>
  Departments
</Link>
```

### DepartmentWithStats Type Addition

```ts
// Source: src/lib/types/domain.ts + src/lib/api/departments.ts (line 44)
// Add to domain.ts after Department interface:
export interface DepartmentWithStats extends Department {
  headcount: number;
  totalFte: number;
  teamCount: number;
}
```

### useDepartmentList Type Fix

```ts
// Source: src/lib/hooks/useDepartments.ts (existing, needs update)
import type { DepartmentWithStats } from '../types/domain';

export function useDepartmentList() {
  return useQuery<DepartmentWithStats[]>({
    queryKey: ['departments'],
    queryFn: () => fetchJSON('/api/departments'),
  });
}
```

### Departments Page Skeleton

```tsx
// Source: src/app/settings/page.tsx and src/app/scenarios/loading.tsx patterns
'use client';
import { AppShell } from '@/components/layout/AppShell';
import { useDepartmentList } from '@/lib/hooks/useDepartments';
import { DepartmentCard } from '@/components/departments/DepartmentCard';

export default function DepartmentsPage() {
  const listQuery = useDepartmentList();

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>

        {listQuery.isLoading && <LoadingSkeleton />}

        {listQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              Failed to load departments.{' '}
              {listQuery.error instanceof Error ? listQuery.error.message : ''}
            </p>
          </div>
        )}

        {!listQuery.isLoading && !listQuery.isError && (
          <div className="mt-6 flex flex-col gap-4">
            {(listQuery.data ?? []).map((dept) => (
              <DepartmentCard key={dept.id} dept={dept} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<Link>` required child `<a>` tag | No child `<a>` needed — `<Link>` is the anchor | Next.js v13.0.0 | Pass className directly to `<Link>` — no wrapping `<a>` |
| Active state via `router.pathname` | Active state via `usePathname()` hook | Next.js v13.0.0 | `usePathname` is the App Router idiom; used in TopNav already |
| `params` synchronous in page props | `params` is a `Promise<{...}>` — must `await params` in Server Components | Next.js 15+ | This phase doesn't use params in the listing page, but be aware for Phase 5 |

**Deprecated/outdated:**
- `useRouter().pathname`: Only for Pages Router. App Router uses `usePathname()` from `next/navigation`.
- Nested `<a>` inside `<Link>`: Removed in Next.js 13. Direct className on `<Link>` is correct.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Unassigned bucket is always the last entry in the API response array (sortOrder: 999) | Code Examples, Common Pitfalls | Low — ordering logic is in server code, verified in departments.ts line 122+ |

**All other claims verified directly from:**
- Project source files (TopNav.tsx, useDepartments.ts, src/lib/api/departments.ts, domain.ts)
- Official Next.js 16.2.4 docs (`node_modules/next/dist/docs/`)
- Phase 3 SUMMARY files confirming what was built

---

## Open Questions

1. **Should the Unassigned bucket be conditionally rendered only when `unassigned.teamCount > 0`?**
   - What we know: The API only appends the Unassigned bucket when `unassignedTeams.length > 0` (departments.ts line 125)
   - What's unclear: Should the page handle the case where bucket appears in the list client-side vs. never appearing?
   - Recommendation: Trust the API contract — if `id === 'unassigned'` appears in the response, render it; if not, no empty-state needed for it. The planner should note this in verification criteria.

2. **Should the listing page link to department detail pages (`/departments/[deptId]`)?**
   - What we know: Phase 5 adds the detail page. Phase 4 success criteria don't mention linking.
   - What's unclear: Whether `DepartmentCard` should be a link wrapper now or in Phase 5.
   - Recommendation: Make `DepartmentCard` a plain display card in Phase 4 (no link). Phase 5 can update it to be a link. This avoids broken links before the detail page exists.

---

## Environment Availability

> Step 2.6: SKIPPED — no new external dependencies. This phase is pure UI + routing changes using already-installed packages.

---

## Validation Architecture

> No test framework detected in project source (`find src -name "*.test.*"` returned no project files). `workflow.nyquist_validation` key absent from `.planning/config.json` (file does not exist) — treat as enabled.

### Test Framework

No test framework is installed or configured in this project. All validation is manual.

| Property | Value |
|----------|-------|
| Framework | None detected |
| Config file | None |
| Quick run command | `npm run type-check` (TypeScript only) |
| Full suite command | Manual browser verification |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| NAV-01 | Departments link appears in nav | manual-only | — | Browser: navigate to any page, verify nav link visible |
| NAV-02 | Active state on `/departments` and `/departments/[id]` | manual-only | — | Browser: verify highlight on both paths |
| LIST-01 | `/departments` shows name, color, headcount, FTE, team count | manual-only | — | Browser: verify all 5 fields per card |
| LIST-02 | Unassigned bucket appears with aggregate stats | manual-only | — | Requires unassigned teams in dev data |
| LIST-03 | Single fetch (no per-card queries) | `npm run type-check` (partial) | `tsc --noEmit` | Verify no per-card `useDepartment` calls in page/card |
| LIST-04 | Loading skeleton + error state | manual-only | — | Throttle network / mock error to verify |

### Wave 0 Gaps

- [ ] No test infrastructure to create — project has no test framework. TypeScript (`tsc --noEmit`) is the only automated check.

---

## Security Domain

> ASVS check for this phase.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in v2.0 (out of scope per REQUIREMENTS.md) |
| V3 Session Management | no | No sessions in v2.0 |
| V4 Access Control | no | Single-user app in v2.0 |
| V5 Input Validation | no | Read-only listing page — no user input |
| V6 Cryptography | no | No cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via department name/color in rendered HTML | Tampering | React's JSX auto-escapes string props — no `dangerouslySetInnerHTML` |
| CSS injection via `style={{ backgroundColor: dept.color }}` | Tampering | Inline style is scoped to the element; no script execution vector in CSS color values |

**Security posture:** This phase introduces no new attack surface. The listing page is read-only, uses no user input, and the only dynamic content (department names, colors) is already stored in Azure Table Storage via the validated API layer.

---

## Sources

### Primary (HIGH confidence)

- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md` — `usePathname` API, Client Component requirement
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md` — `<Link>` active state pattern with `usePathname`, `aria-current` usage
- `src/components/layout/TopNav.tsx` — Exact existing nav link pattern with `aria-current` + Tailwind active classes
- `src/lib/api/departments.ts` (lines 43–141) — `getDepartmentsWithStats` return type `Array<Department & { headcount, totalFte, teamCount }>` and Unassigned bucket logic
- `src/lib/hooks/useDepartments.ts` — Current type gap: `useDepartmentList` returns `Department[]` not `DepartmentWithStats[]`
- `src/lib/types/domain.ts` — `Department` interface (no stats fields)
- `src/app/scenarios/[scenarioId]/page.tsx` — Server Component `await params` pattern for reference
- `src/app/settings/page.tsx` — `'use client'` page with `AppShell` wrapper pattern
- `src/components/departments/DepartmentsSection.tsx` — Loading skeleton, error display, color badge patterns

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` — `pathname.startsWith('/departments')` direction, `DepartmentCard.tsx` name, single-fetch constraint
- `.planning/phases/03-department-management-ui/03-01-SUMMARY.md` — Hook patterns established in Phase 3
- `.planning/phases/03-department-management-ui/03-04-SUMMARY.md` — Type gap in `useDepartmentList` implicitly confirmed by `entityToTeam` fix pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json and node_modules
- Architecture: HIGH — all API shapes and component patterns verified in source code
- Pitfalls: HIGH — type gap verified by direct code inspection; other pitfalls from ROADMAP + code patterns
- Next.js API: HIGH — verified from installed docs in `node_modules/next/dist/docs/`

**Research date:** 2026-05-19
**Valid until:** 2026-06-18 (stable libraries; project codebase will change as phases execute)
