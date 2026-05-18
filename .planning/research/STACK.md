# Technology Stack — v2.0 Enterprise Departments

**Project:** Workforce Planning — Department layer milestone  
**Researched:** 2026-05-18  
**Scope:** Additive-only — covers NEW capabilities required for the departments feature

---

## 1. No New Dependencies Required

The existing stack covers everything needed. Do not introduce new packages. The additions below are patterns, not libraries.

---

## 2. Azure Table Storage — Departments Table

### Partition Key Strategy

**Use `partitionKey: 'department'` (static string, same pattern as teams).**

Rationale: The existing `teams` table uses `partitionKey: 'team'` for all rows. Department counts will be small (tens, not thousands) — a single-partition scan is fast and consistent with how the codebase already works. Do not introduce per-organisation partitioning; it adds complexity without benefit at this scale.

```typescript
export interface DepartmentEntity extends TableEntity {
  partitionKey: 'department';
  rowKey: string;          // departmentId (uuid)
  name: string;
  description?: string;
  color: string;           // hex e.g. '#6366f1'
  deptHead?: string;       // free-text name, no FK
  sortOrder: number;
  createdAt: string;       // ISO string
  updatedAt: string;
}
```

Add `TABLE_DEPARTMENTS = 'departments'` to `src/lib/db/tables.ts` and add `'departments'` to `ensureTablesExist()` in `src/lib/db/client.ts`.

### Team Entity — Adding `departmentId`

Add `departmentId?: string` as an optional field on `TeamEntity`. It is intentionally optional so existing rows without it remain valid during and after migration.

```typescript
export interface TeamEntity extends TableEntity {
  partitionKey: 'team';
  rowKey: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  departmentId?: string;   // NEW — absent on pre-migration rows
}
```

The domain type `Team` gains a matching optional field:

```typescript
export interface Team {
  id: string;
  name: string;
  description?: string;
  color: string;
  sortOrder: number;
  departmentId?: string;   // NEW
}
```

---

## 3. Referential Integrity (No FK Support in Azure Table Storage)

Azure Table Storage has no foreign keys. Enforce integrity in the application layer using three explicit rules:

### Rule 1 — Delete guard on departments
Before deleting a department, call `getTeamsByDepartment(deptId)`. If any teams are returned, reject with HTTP 409 and message "Cannot delete department with assigned teams. Reassign or delete teams first." Do not cascade-delete silently.

### Rule 2 — Validate on team create/update
When creating or updating a team with a `departmentId`, call `getDepartment(deptId)` first. If it returns null, reject with HTTP 400.

### Rule 3 — Orphan-tolerant reads
`getTeamsByDepartment` and the department detail page must tolerate teams whose `departmentId` references a deleted department. In practice: the delete guard above prevents orphans, but if orphans exist (e.g. from direct table edits in dev), the UI should render them as "Unassigned" rather than crashing.

**Do not implement a background consistency job** — overkill at this scale.

### Querying Teams by Department

Azure Table Storage does not support secondary indexes. To get all teams for a department, list all entities in the `teams` table (already done by `getAllTeams()`) and filter in-app:

```typescript
export async function getTeamsByDepartment(departmentId: string): Promise<Team[]> {
  const all = await getAllTeams();
  return all.filter(t => t.departmentId === departmentId);
}
```

This is acceptable because the total team count is small (tens to low hundreds). If team counts grow to thousands, an OData filter on `departmentId` can be added to `listEntities` — but do not add this now; the simple filter is clearer.

---

## 4. Data Migration — Existing Teams to Default Department

### Strategy: Lazy first-run migration via API route

**Do not run a standalone migration script.** Instead:

1. On app startup (`ensureTablesExist`), also call `ensureDefaultDepartment()`.
2. `ensureDefaultDepartment()` creates a well-known department with a fixed rowKey (e.g. `'default'`) if it does not exist. This is idempotent via `upsertEntity` or a try/catch on `createEntity`.
3. Provide a one-time migration endpoint `POST /api/admin/migrate-departments` that:
   - Lists all teams where `departmentId` is absent or empty.
   - Updates each to `departmentId: 'default'` via `updateEntity` with `UpdateMode.Merge`.
   - Returns a count of migrated teams.
4. Call this endpoint from the seed/settings panel in the UI, or manually once against production.

**Why `UpdateMode.Merge` matters:** Azure Table Storage's merge mode updates only the specified fields, leaving all other fields intact. Never use replace mode (`UpdateMode.Replace`) for additive migrations — it wipes unspecified fields.

```typescript
import { UpdateMode } from '@azure/data-tables';

await client.updateEntity(
  { partitionKey: 'team', rowKey: teamId, departmentId: 'default' },
  UpdateMode.Merge
);
```

### Default Department spec

```typescript
const DEFAULT_DEPT: DepartmentEntity = {
  partitionKey: 'department',
  rowKey: 'default',
  name: 'General',
  description: 'Default department for existing teams',
  color: '#6b7280',   // Tailwind gray-500
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

The fixed rowKey `'default'` makes idempotency trivial.

---

## 5. Next.js 16 — Dynamic Route Patterns

**This is Next.js 16.2.4 with React 19.2.4 — not v13/v14.** The key difference:

### `params` is a Promise — always `await` it

In Next.js 15+, `params` became an async Promise. In v14 and earlier it was synchronous. The codebase already uses the correct pattern (confirmed in `[scenarioId]/page.tsx` and `[id]/route.ts`):

**Page component (Server Component):**
```typescript
interface DepartmentPageProps {
  params: Promise<{ deptId: string }>;
}

export default async function DepartmentPage({ params }: DepartmentPageProps) {
  const { deptId } = await params;
  // ...
}
```

**Route handler:**
```typescript
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deptId: string }> }
) {
  const { deptId } = await params;
  // ...
}
```

**Client Component** (if needed inside the page tree):
```typescript
'use client';
import { use } from 'react';

export function DeptClientComponent({
  params,
}: {
  params: Promise<{ deptId: string }>;
}) {
  const { deptId } = use(params);
  // ...
}
```

Use `use(params)` (React 19 API), not `await`, in Client Components.

### TypeScript helper types (available in Next 16)

The docs list `PageProps<'/route'>`, `LayoutProps<'/route'>`, and `RouteContext<'/route'>` as globally available helpers. These are cleaner than manual `Promise<{...}>` annotations but the manual form works too — use whichever the team prefers. Existing code in this repo uses manual `Promise<{ id: string }>` forms — stay consistent with that.

### Do NOT use `generateStaticParams` for department pages

Department IDs are not known at build time. Omit `generateStaticParams` entirely — pages will be server-rendered on request, which is the correct default for data-driven pages in this app. Adding `generateStaticParams` would complicate the build with no benefit.

---

## 6. Color Picker — No New Dependency Needed

The existing `Team` type already has a `color: string` (hex) field and TeamHeader renders it via inline `style={{ backgroundColor: color }}`. Departments need the same.

**Use a custom Tailwind swatch picker, not an external library.** Reasons:
- No existing color picker library in the project
- Installing `react-colorful`, `@uiw/react-color`, or similar adds ~15–30 KB for a feature used only in department CRUD
- The project uses custom Shadcn-style components — a custom swatch component fits the pattern

**Implementation: predefined palette + hex input**

```typescript
// A curated set of Tailwind-safe hex values for department identity
export const DEPARTMENT_COLOR_PALETTE = [
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
  '#3b82f6', // blue-500
  '#6b7280', // gray-500
];
```

Render as a row of clickable circular swatches (same pattern as the team color dot in `TeamHeader`). Include a fallback `<input type="color" />` for custom hex values — the native browser color picker requires zero dependencies and is universally supported.

This approach matches the existing inline `style={{ backgroundColor: color }}` pattern already established for teams.

---

## 7. What NOT to Add

| Anti-pattern | Why |
|---|---|
| New ORM or query builder (e.g. Prisma, Drizzle) | Stack is Azure Table Storage, not SQL. These are incompatible. |
| Shadcn/ui or Radix UI installation | Project uses custom components — introducing Shadcn mid-project creates two component systems. |
| React Hook Form / Zod for department forms | Department CRUD is simple (4 fields). Controlled React state with manual validation is proportionate. Add Zod only if server-side validation of complex payloads is needed. |
| `generateStaticParams` on department routes | Departments are dynamic data — static generation is wrong here. |
| `partitionKey: organizationId` for multi-tenancy | Out of scope per PROJECT.md; single-org app. Adds complexity with no current benefit. |
| Background sync job for referential integrity | The delete guard + merge-mode migration covers all real cases at this scale. |
| External color picker library | Custom swatch palette + `<input type="color">` covers the requirement with zero new dependencies. |

---

## 8. `ensureTablesExist` Update

```typescript
// src/lib/db/client.ts — add 'departments' to the list
const tables = [
  'departments',        // NEW
  'teams',
  'staffMembers',
  'scenarios',
  'scenarioMemberStates',
  'scenarioTeamDrivers',
  'scenarioSnapshots',
  'scenarioAuditEvents',
];
```

---

## Sources

- Next.js 16.2.4 bundled docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
- Confirmed existing pattern: `src/app/scenarios/[scenarioId]/page.tsx`, `src/app/api/scenarios/[id]/route.ts`
- Azure SDK: `@azure/data-tables` v13.3.2 — `UpdateMode.Merge` is the correct partial-update mode
- Existing codebase: `src/lib/db/tables.ts`, `src/lib/db/client.ts`, `src/lib/types/domain.ts`
- Confidence: HIGH for all recommendations (based on actual codebase + bundled Next.js docs)
