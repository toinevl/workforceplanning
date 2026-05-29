---
phase: 2
phase_name: "department-crud-api"
project: "Workforce Planning"
generated: "2026-05-28"
counts:
  decisions: 4
  lessons: 2
  patterns: 4
  surprises: 1
missing_artifacts:
  - "02-UAT.md"
---

# Phase 2 Learnings: Department CRUD API

## Decisions

### Stats computed via three parallel Promise.all scans, not per-department queries
`getDepartmentsWithStats()` fetches all departments, all teams, and all staff members in a single `Promise.all`, groups them in-memory with `Map`, then computes headcount and FTE in a single pass over departments. No per-department query is issued.

**Rationale:** Azure Table Storage has no JOIN. Per-department queries would be O(n) round trips. Parallel partition scans + in-memory grouping reduces round trips to 3 regardless of department count, matching Pitfall 5 mitigation from ROADMAP.md.
**Source:** 02-01-PLAN.md, 02-VERIFICATION.md

---

### DELETE returns 409 with structured `assignedTeamCount` body when teams are still linked
When a department delete is blocked because teams are still assigned, the API returns HTTP 409 with `{ error: "...", assignedTeamCount: N }` in the body rather than a generic 4xx.

**Rationale:** The UI needs to display "N teams still assigned" to guide the user to re-assign before deleting. A plain 4xx would force the UI to make a second query to discover the count. The structured body colocates the count with the error at no extra cost.
**Source:** 02-01-PLAN.md, 02-VERIFICATION.md

---

### Migration endpoint uses sentinel check + `UpdateMode.Merge` for idempotency
`POST /api/admin/migrate-departments` checks for a sentinel entity before any writes, skips if found. All team updates use `UpdateMode.Merge` (not Replace) to preserve non-departmentId fields.

**Rationale:** Migration endpoints that are not idempotent cause data corruption on retry or re-deployment. `UpdateMode.Merge` also prevents accidentally wiping fields that aren't part of the migration's concern.
**Source:** 02-01-PLAN.md, 02-VERIFICATION.md

---

### Admin migration endpoint is a separate route, not part of the CRUD API
`/api/admin/migrate-departments` is deliberately placed under `/api/admin/` and not under `/api/departments`. This signals operator-only intent and separates it from user-facing CRUD endpoints.

**Rationale:** Admin endpoints that bulk-mutate data should be visually distinct from CRUD endpoints to reduce the risk of accidental invocation. The `/admin/` prefix also makes it easy to add route-level auth middleware later.
**Source:** 02-02-PLAN.md

---

## Lessons

### Azure Table Storage has no JOIN — stats always require multi-table scan
There is no native aggregation in Azure Table Storage. Any rollup stat (headcount, FTE, team count per department) requires fetching related tables and computing in application code.

**Context:** This is a fundamental constraint of the storage choice, not an oversight. Future phases that need cross-entity stats (e.g., "teams per department detail page") must follow the same parallel-scan + in-memory-grouping pattern.
**Source:** 02-01-PLAN.md

---

### 409 response body design matters at API design time, not just at route-handler time
The decision to include `assignedTeamCount` in the 409 body was made during ROADMAP planning (Pitfall 4). Had it been an afterthought, the UI in Phase 3 would have needed a second fetch to get the count, or the API would have required a breaking change.

**Context:** When a deletion or mutation can be blocked by a dependency, design the error response to carry enough data for the UI to explain the block without another round trip.
**Source:** 02-01-PLAN.md, 02-VERIFICATION.md

---

## Patterns

### Promise.all + in-memory Map for cross-entity stats in Azure Table Storage
```typescript
const [departments, teams, members] = await Promise.all([
  scanAll(deptClient), scanAll(teamClient), scanAll(staffClient)
]);
const teamMap = new Map<string, TeamEntity[]>();
// ... group teams by departmentId ...
return departments.map(dept => ({ ...entityToDepartment(dept), ...computeStats(teamMap, dept) }));
```

**When to use:** Any time a GET endpoint needs computed stats that span multiple Azure Table Storage tables. Never issue per-row queries inside a loop.
**Source:** 02-01-PLAN.md, 02-VERIFICATION.md

---

### Structured error body pattern for blocked mutations
When a mutation is blocked (e.g., FK-like constraint violation), return the blocker's machine-readable data in the error body alongside the human-readable message:
```typescript
return NextResponse.json({ error: "...", assignedTeamCount: N }, { status: 409 });
```

**When to use:** Any DELETE or UPDATE that can be blocked by a dependent entity the user controls. The caller (hook or UI) can then display the exact count without a follow-up query.
**Source:** 02-01-PLAN.md

---

### UpdateMode.Merge for safe partial updates in Azure Table Storage
Always use `UpdateMode.Merge` (not `Replace`) when updating an entity where only some fields are being changed. `Replace` will delete any fields not present in the update payload.

**When to use:** All PATCH operations and bulk migrations. Use `Replace` only when the intent is to fully overwrite a known set of fields.
**Source:** 02-01-PLAN.md, 02-VERIFICATION.md

---

### Migration sentinel + idempotency gate
Before any bulk write in an admin endpoint:
1. Check for sentinel entity (`getEntity` in try/catch)
2. If sentinel exists, return early (already migrated)
3. Create sentinel before first write
4. Perform writes with `UpdateMode.Merge`

**When to use:** Any one-time admin endpoint (backfill, schema migration, data repair). Makes the endpoint safe to call twice without side effects.
**Source:** 02-01-PLAN.md, 02-VERIFICATION.md

---

## Surprises

### Phase 2 executed with zero plan deviations and passed all verification checks
Both plans completed without auto-fixes. The verification report passed all four critical success criteria (rollup stats, delete safety, idempotency, correct HTTP codes). This is notable because Phase 2 introduced the most complex backend logic (parallel scans, sentinel, 409 body design).

**Impact:** The upfront ROADMAP pitfall analysis (Pitfalls 1-5) translated directly into implementation decisions, preventing the bugs that would otherwise have been found during verification. Investing in pitfall analysis at planning time pays off during execution.
**Source:** 02-VERIFICATION.md
