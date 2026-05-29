# Phase 4: Navigation + Departments Listing — Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 5 (3 new, 2 modified)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/layout/TopNav.tsx` (modify) | component | request-response | `src/components/layout/TopNav.tsx` itself | exact (self) |
| `src/lib/types/domain.ts` (modify) | model | — | `src/lib/types/domain.ts` itself | exact (self) |
| `src/lib/hooks/useDepartments.ts` (modify) | hook | request-response | `src/lib/hooks/useDepartments.ts` itself | exact (self) |
| `src/app/departments/page.tsx` (new) | component | request-response | `src/app/settings/page.tsx` | exact |
| `src/components/departments/DepartmentCard.tsx` (new) | component | request-response | `src/components/departments/DepartmentsSection.tsx` (internal `DepartmentCard`) | role-match |

---

## Pattern Assignments

### `src/components/layout/TopNav.tsx` (modify — add Departments link)

**Analog:** `src/components/layout/TopNav.tsx` lines 28–63 (existing Home/Settings link pattern)

**Active-state variable pattern** (lines 28–29):
```tsx
const isHome = pathname === '/' || pathname === '/scenarios';
const isSettings = pathname === '/settings';
```
Add after line 29:
```tsx
const isDepartments = pathname.startsWith('/departments');
```
Key difference: use `startsWith` not `===` — covers `/departments/[deptId]` detail pages (Phase 5).

**Nav link insertion point** (lines 49–64 — the `<div className="flex items-center gap-1">` block):
```tsx
<div className="flex items-center gap-1">
  <Link
    href="/"
    aria-current={isHome ? 'page' : undefined}
    className="rounded px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 aria-[current=page]:bg-gray-100 aria-[current=page]:text-gray-950"
  >
    Home
  </Link>
  <Link
    href="/settings"
    aria-current={isSettings ? 'page' : undefined}
    className="rounded px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 aria-[current=page]:bg-gray-100 aria-[current=page]:text-gray-950"
  >
    Settings
  </Link>
  {/* ADD HERE — copy className exactly from Settings link above */}
  <Link
    href="/departments"
    aria-current={isDepartments ? 'page' : undefined}
    className="rounded px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 aria-[current=page]:bg-gray-100 aria-[current=page]:text-gray-950"
  >
    Departments
  </Link>
</div>
```

---

### `src/lib/types/domain.ts` (modify — add DepartmentWithStats)

**Analog:** `src/lib/types/domain.ts` lines 20–27 (existing `Department` interface)

**Existing Department interface** (lines 20–27):
```ts
export interface Department {
  id: string;
  name: string;
  description?: string;
  color: string;
  deptHead?: string;
  sortOrder: number;
}
```

**Add after line 27 — extend, do not modify the base type:**
```ts
export interface DepartmentWithStats extends Department {
  headcount: number;
  totalFte: number;
  teamCount: number;
}
```
The `id: 'unassigned'` bucket from the API is already shaped as `DepartmentWithStats`, so this type covers it.

---

### `src/lib/hooks/useDepartments.ts` (modify — fix useDepartmentList return type)

**Analog:** `src/lib/hooks/useDepartments.ts` lines 1–12 (existing hook)

**Current import block** (lines 1–5):
```ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Department } from '../types/domain';
import { fetchJSON } from '../utils/fetchJSON';
```

**Updated import** — add `DepartmentWithStats` to the type import on line 4:
```ts
import type { Department, DepartmentWithStats } from '../types/domain';
```

**Current hook** (lines 7–12):
```ts
export function useDepartmentList() {
  return useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => fetchJSON('/api/departments'),
  });
}
```

**Fixed hook** — change the generic type only, leave queryKey and queryFn unchanged:
```ts
export function useDepartmentList() {
  return useQuery<DepartmentWithStats[]>({
    queryKey: ['departments'],
    queryFn: () => fetchJSON('/api/departments'),
  });
}
```

---

### `src/app/departments/page.tsx` (new — departments listing page)

**Analog:** `src/app/settings/page.tsx` (lines 1–77)

**Imports pattern** — copy from settings/page.tsx, replace component imports:
```tsx
'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useDepartmentList } from '@/lib/hooks/useDepartments';
import { DepartmentCard } from '@/components/departments/DepartmentCard';
```

**Page shell pattern** — copy `AppShell` + `max-w-6xl mx-auto py-6 px-4` layout from settings/page.tsx lines 16–19:
```tsx
export default function DepartmentsPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-6 px-4">
        {/* content */}
      </div>
    </AppShell>
  );
}
```

**Loading skeleton pattern** — copy from DepartmentsSection.tsx lines 266–270:
```tsx
{listQuery.isLoading && (
  <div className="flex flex-col gap-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
    ))}
  </div>
)}
```

**Error state pattern** — copy from DepartmentsSection.tsx lines 257–264:
```tsx
{listQuery.isError && (
  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
    <p className="text-sm text-red-700">
      Failed to load departments.{' '}
      {listQuery.error instanceof Error ? listQuery.error.message : ''}
    </p>
  </div>
)}
```

**Data rendering pattern** — map over query data:
```tsx
{!listQuery.isLoading && !listQuery.isError && (
  <div className="mt-6 flex flex-col gap-4">
    {(listQuery.data ?? []).map((dept) => (
      <DepartmentCard key={dept.id} dept={dept} />
    ))}
  </div>
)}
```

---

### `src/components/departments/DepartmentCard.tsx` (new — standalone card with stats)

**Analog:** `src/components/departments/DepartmentsSection.tsx` internal `DepartmentCard` (lines 29–78)

**Imports pattern** — no hooks needed in the card itself; `DepartmentWithStats` must be imported:
```tsx
import type { DepartmentWithStats } from '@/lib/types/domain';
```

**Props pattern** — single `dept` prop typed as `DepartmentWithStats`:
```tsx
interface DepartmentCardProps {
  dept: DepartmentWithStats;
}

export function DepartmentCard({ dept }: DepartmentCardProps) {
```

**Color badge pattern** — copy from DepartmentsSection.tsx lines 43–47:
```tsx
<span
  className="mt-1 h-4 w-4 flex-shrink-0 rounded-full border border-gray-200"
  style={{ backgroundColor: dept.color }}
  aria-hidden="true"
/>
```

**For the Unassigned bucket** (`dept.id === 'unassigned'`), use a grey badge instead:
```tsx
<span
  className="mt-1 h-4 w-4 flex-shrink-0 rounded-full border border-dashed border-gray-400 bg-gray-200"
  aria-hidden="true"
/>
```

**Card container** — copy border/bg/padding from DepartmentsSection.tsx line 41:
```tsx
<div className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4">
```
For the Unassigned bucket, use dashed border to distinguish it:
```tsx
<div className="flex items-start justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
```

**Stat chip pattern** — new for Phase 4 (no existing analog for chips; use existing pill/badge style from TopNav.tsx lines 43–46 as reference):
```tsx
<span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700">
  {dept.headcount} people
</span>
<span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700">
  {dept.totalFte.toFixed(1)} FTE
</span>
<span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700">
  {dept.teamCount} teams
</span>
```
Note: use `toFixed(1)` on `totalFte` to prevent IEEE 754 float display issues (e.g. `12.500000000000002`).

**Name and description pattern** — copy from DepartmentsSection.tsx lines 48–55:
```tsx
<div>
  <p className="text-sm font-semibold text-gray-900">{dept.name}</p>
  {dept.description && (
    <p className="mt-0.5 text-xs text-gray-500">{dept.description}</p>
  )}
</div>
```

---

## Shared Patterns

### Client Component Directive
**Source:** `src/components/layout/TopNav.tsx` line 1, `src/app/settings/page.tsx` line 1
**Apply to:** `src/app/departments/page.tsx`, `src/components/departments/DepartmentCard.tsx`
```tsx
'use client';
```
Required for any file using TanStack Query hooks or `usePathname`.

### AppShell Page Wrapper
**Source:** `src/app/settings/page.tsx` lines 16–18 and `src/app/page.tsx` lines 4–9
**Apply to:** `src/app/departments/page.tsx`
```tsx
<AppShell>
  <div className="max-w-6xl mx-auto py-6 px-4">
    {/* page content */}
  </div>
</AppShell>
```
Use without the `board` prop — the `board` prop is only for scenario board pages.

### TanStack Query isLoading / isError Guard
**Source:** `src/components/departments/DepartmentsSection.tsx` lines 257–270
**Apply to:** `src/app/departments/page.tsx`
Always check `isLoading` before `isError` before rendering data. Use `listQuery.data ?? []` for the data fallback.

### Inline Error Display
**Source:** `src/components/departments/DepartmentsSection.tsx` lines 257–264
**Apply to:** `src/app/departments/page.tsx`
```tsx
<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
  <p className="text-sm text-red-700">
    Failed to load departments.{' '}
    {listQuery.error instanceof Error ? listQuery.error.message : ''}
  </p>
</div>
```

### Animate-Pulse Loading Skeleton
**Source:** `src/components/departments/DepartmentsSection.tsx` lines 266–270
**Apply to:** `src/app/departments/page.tsx`
```tsx
<div className="flex flex-col gap-3">
  {[...Array(3)].map((_, i) => (
    <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
  ))}
</div>
```

---

## No Analog Found

All files have close analogs. No entries needed here.

---

## Metadata

**Analog search scope:** `src/components/layout/`, `src/app/`, `src/lib/hooks/`, `src/lib/types/`, `src/components/departments/`
**Files scanned:** 7
**Pattern extraction date:** 2026-05-20
