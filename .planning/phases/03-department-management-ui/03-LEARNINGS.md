---
phase: 3
phase_name: "department-management-ui"
project: "Workforce Planning"
generated: "2026-05-28"
counts:
  decisions: 6
  lessons: 4
  patterns: 5
  surprises: 2
missing_artifacts:
  - "03-VERIFICATION.md"
  - "03-UAT.md"
---

# Phase 3 Learnings: Department Management UI

## Decisions

### Use raw `fetch` (not `fetchJSON`) in hooks that need to read a non-ok response body
`useDeleteDepartment` and `useMigrateDepartments` call `fetch(...)` directly instead of the `fetchJSON` utility. `fetchJSON` throws on non-ok responses before the caller can read the body, so structured error data (e.g., `assignedTeamCount` from a 409) would be lost.

**Rationale:** The API was designed in Phase 2 to carry machine-readable data in error bodies. Using `fetchJSON` would silently discard that data. Raw `fetch` allows conditional body extraction before deciding to throw.
**Source:** 03-01-PLAN.md, 03-01-SUMMARY.md

---

### Error enrichment via `throw new Error(JSON.stringify({...}))`
Structured data is threaded through TanStack Query's `useMutation` error channel by serialising it into the Error message string:
```typescript
throw new Error(JSON.stringify({ error: json.error, assignedTeamCount: json.assignedTeamCount }));
```
The UI then parses `mutation.error?.message` to extract the count.

**Rationale:** TanStack Query's mutation error type is `Error`. There is no built-in mechanism to attach typed metadata. Serialising to JSON in the message is an established workaround that avoids wrapping TanStack Query with a custom error class.
**Source:** 03-01-PLAN.md

---

### ColorPicker uses `aria-pressed` on swatch buttons for WAI-ARIA compliance
Each color swatch button communicates its selected state with `aria-pressed={value === swatch.hex}` rather than a visual-only indicator.

**Rationale:** Screen readers need a programmatic signal for which swatch is currently selected. `aria-pressed` is the WAI-ARIA pattern for toggle buttons.
**Source:** 03-02-PLAN.md, 03-02-SUMMARY.md

---

### DepartmentForm conditionally includes optional fields only when non-empty after trimming
`description` and `deptHead` are omitted from the `onSubmit` payload when their trimmed value is an empty string. This prevents storing empty strings in Azure Table Storage where `undefined` (field absent) is the intended representation.

**Rationale:** Azure Table Storage stores empty strings as a property, which differs semantically from a missing property. Callers checking `!!dept.description` would incorrectly evaluate an empty string as truthy.
**Source:** 03-02-PLAN.md

---

### BulkMigrateButton uses a custom inline dialog instead of ConfirmDialog
The plan specified `ConfirmDialog` as the wrapping component, but `ConfirmDialog`'s interface accepts only primitive `title` and `description` strings — no children slot for a department dropdown selector. A custom dialog using `createPortal` with identical styling conventions was built instead.

**Rationale:** ConfirmDialog's API is intentionally narrow to prevent misuse. Rather than widening ConfirmDialog (which would affect all usages), a one-off custom dialog was built that matches the same visual conventions.
**Source:** 03-04-PLAN.md, 03-04-SUMMARY.md

---

### `unassignedTeamCount` computed via `useTeamList` filtering, not `useDepartmentList`
The count of teams with no department is derived by filtering `useTeamList()` for `team.departmentId === undefined`, not from `useDepartmentList()`. `Department[]` objects returned by `useDepartmentList` do not contain team membership data.

**Rationale:** Data the hook doesn't own (team membership) shouldn't be on the department type. This is a clean separation of concerns; the team list is already in the React Query cache, so filtering it is free.
**Source:** 03-04-PLAN.md, 03-04-SUMMARY.md

---

## Lessons

### React form elements require `e.preventDefault()` even in SPA modal flows
The Phase 3 plan incorrectly stated "Do NOT call preventDefault". Without `e.preventDefault()`, a `<form>` submit triggers full-page navigation even inside a modal in a Next.js SPA. The executor caught and auto-fixed this before it caused a bug.

**Context:** The plan's intent was that the `onSubmit` handler should manage async behavior (not a native form POST) — which is correct — but the implementation must still call `e.preventDefault()` to intercept the browser's default submit behavior. Plans for form components should always include this requirement explicitly.
**Source:** 03-02-SUMMARY.md

---

### entityToTeam mapper was missing the `departmentId` field entirely
Despite `departmentId` being added to `TeamEntity` in Phase 1, the `entityToTeam()` mapper in `mappers.ts` was never updated to include it. When Phase 3's TeamFormModal tried to pre-populate the department selector from `team.departmentId`, the value was always `undefined`.

**Context:** Domain type and entity type can drift silently from mapper code — TypeScript does not enforce that the mapper returns every domain field. The same class of bug occurred in Phase 1 with the `Team` type missing `departmentId`. Consider writing a type-level exhaustiveness check in mappers.
**Source:** 03-04-SUMMARY.md

---

### API contract mismatch: hook sent `{ departmentId }`, route expected `{ defaultDepartmentId }`
`useMigrateDepartments` was written to send `{ departmentId }` in its POST body, but the `/api/admin/migrate-departments` route handler read `req.json().defaultDepartmentId`. Every migration call would have returned 400 Bad Request silently.

**Context:** This is the classic API contract mismatch — the hook author and the route author used different field names for the same concept. This was discovered by the executor reading the route handler before completing the hook, not by a test. Plans should require the hook file to name the exact request body shape alongside the target route reference.
**Source:** 03-04-SUMMARY.md

---

### No PATCH /api/teams/[id] route existed when Phase 3 needed it
Phase 3's TeamFormModal needed to call a team update endpoint. No such route existed — only GET and POST were implemented for teams. The executor created the route, the `updateTeam` API function, and the `useUpdateTeam` hook mid-phase.

**Context:** The Phase 2 scope covered department CRUD only. Team update was implicitly assumed to exist. Cross-phase dependency audits should check that all HTTP methods needed by the UI phase exist before execution begins.
**Source:** 03-04-SUMMARY.md

---

## Patterns

### Raw fetch with conditional body extraction for error-enriched responses
```typescript
const r = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
const json = await r.json().catch(() => ({}));
if (!r.ok) {
  throw new Error(JSON.stringify({ error: json.error, assignedTeamCount: json.assignedTeamCount }));
}
```

**When to use:** Any hook that calls an endpoint designed to return structured data in error bodies (e.g., 409 with blocked-deletion counts). Do not use `fetchJSON` in these cases.
**Source:** 03-01-PLAN.md, 03-01-SUMMARY.md

---

### TanStack Query pattern: enabled guard for optional ID queries
```typescript
const useDepartment = (deptId?: string) =>
  useQuery({ queryKey: ['department', deptId], queryFn: () => fetchJSON(`/api/departments/${deptId}`), enabled: !!deptId });
```

**When to use:** Any `useQuery` hook whose query parameter can be undefined (e.g., selected entity not yet chosen). Mirrors the `useScenario` / `useTeamBoard` pattern already established in this codebase.
**Source:** 03-01-PLAN.md

---

### All mutations invalidate the parent list queryKey on success
Every `useMutation` for department create/update/delete/migrate calls:
```typescript
onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] })
```
This ensures the list view stays consistent without manual cache manipulation.

**When to use:** Any mutation that changes the membership or properties of a list. Do not selectively update cache entries — invalidation is simpler and less error-prone.
**Source:** 03-01-PLAN.md

---

### Custom dialog for complex modal content when shared dialog interface is too narrow
When `ConfirmDialog` (or any shared modal component) only accepts primitive string props and the use case requires interactive children (dropdowns, form fields), build a one-off custom dialog using `createPortal` matching the shared component's visual conventions. Do not widen the shared interface.

**When to use:** Modal content that requires interactive child components (selects, inputs). Keep the shared dialog simple; use custom dialogs for complex confirmations.
**Source:** 03-04-PLAN.md, 03-04-SUMMARY.md

---

### Mapper exhaustiveness: add new entity fields to mapper immediately
When a field is added to an entity type (e.g., `TeamEntity.departmentId`), update the corresponding mapper function (`entityToTeam`) in the same commit. Do not assume the mapper will be updated separately.

**When to use:** Every time a new field is added to an Azure Table Storage entity type. The mapper is the single translation boundary; missing it means the field is silently dropped from all domain objects.
**Source:** 03-04-SUMMARY.md, 01-01-SUMMARY.md

---

## Surprises

### ConfirmDialog's interface was too narrow for the BulkMigrateButton use case
The plan referenced `ConfirmDialog` as a required import for the bulk migration confirmation. At implementation time, `ConfirmDialog` turned out to accept only `string` props — no `children` prop for embedding a department dropdown. A custom dialog had to be built on the spot.

**Impact:** One extra component built; zero functional regression. The real surprise is that the plan referenced a shared component without checking its interface. Plans should reference component prop types explicitly when the use case is non-trivial.
**Source:** 03-04-SUMMARY.md

---

### Three bugs discovered mid-execution that were not visible during planning
A missing mapper field (`departmentId`), a wrong API body field name (`departmentId` vs `defaultDepartmentId`), and a missing route (`PATCH /api/teams/[id]`) were all discovered during Phase 3 execution — not during planning. None appeared in the threat model or pitfall analysis.

**Impact:** Each bug required an unplanned commit, but none required a plan revision because the executor caught them inline. The pattern suggests that executor-level cross-checks (reading the route handler before writing the hook) are a necessary complement to plan-level analysis.
**Source:** 03-04-SUMMARY.md
