---
phase: 1
phase_name: "production-hardening-schema-foundation"
project: "Workforce Planning"
generated: "2026-05-28"
counts:
  decisions: 4
  lessons: 2
  patterns: 3
  surprises: 1
missing_artifacts:
  - "01-VERIFICATION.md"
  - "01-UAT.md"
---

# Phase 1 Learnings: Production Hardening & Schema Foundation

## Decisions

### Azure Table Storage partitionKey strategy: all departments share 'department'
All `DepartmentEntity` rows use `partitionKey: 'department'` with the department UUID as `rowKey`. This matches the existing `TeamEntity` pattern and enables a single partition scan to retrieve all departments without cross-partition queries.

**Rationale:** Azure Table Storage scales within a partition but charges per cross-partition query. Using a constant partition key for a small entity set (departments are few and rarely change) gives simple scan semantics with no fan-out cost.
**Source:** 01-01-PLAN.md

---

### Mapper consolidation: single mappers.ts module for all entity-to-domain conversions
Moved `entityToTeam()` from duplicate definitions in `teams.ts` and `scenarios.ts` into a shared `src/lib/db/mappers.ts` module. Phase 1 introduced `entityToDepartment()` in the same module.

**Rationale:** Two callers already had duplicate mapper implementations at phase start — any new field would need updating in two places. Centralising early prevents field-mapping drift across parallel development streams.
**Source:** 01-02-PLAN.md

---

### Production guard on seed.ts: check NODE_ENV before any write
Added an explicit `NODE_ENV !== 'production'` check at the top of the seed reset path. The guard throws rather than silently returning so misconfigured CI pipelines surface the error rather than appearing to succeed.

**Rationale:** Seed scripts that truncate tables are catastrophic if run against a production database. The guard is belt-and-suspenders alongside any deployment process controls.
**Source:** 01-03-PLAN.md

---

### Idempotent seeding via upsertEntity('Replace')
Sample departments and the "Default" department are written with `upsertEntity(..., 'Replace')` rather than `createEntity`, making the seed script safe to re-run without duplicating rows.

**Rationale:** Developers run seed scripts repeatedly during local setup; insert-only seeds break on second run. Upsert semantics make the seed a no-op when data already exists.
**Source:** 01-03-PLAN.md

---

## Lessons

### entityToTeam() was duplicated across two callers before Phase 1
At phase start, `src/lib/api/teams.ts` and `src/lib/api/scenarios.ts` each contained their own copy of `entityToTeam()`. The copies had diverged slightly — discovering this during Phase 1 forced a mid-phase consolidation refactor.

**Context:** Field mapping duplication is hard to detect until a new field is added and one copy is forgotten. The consolidation took a full plan slot (01-02) that was not originally budgeted.
**Source:** 01-02-PLAN.md

---

### `departmentId` was absent from the `Team` domain type before Phase 1
The `Team` domain type in `domain.ts` did not include a `departmentId` field even though the underlying `TeamEntity` in Azure Table Storage had the column. The field was invisible to all TypeScript consumers until explicitly added.

**Context:** Domain types that don't mirror all entity fields create silent data loss. Any field omitted from the mapper is dropped silently, producing `undefined` at runtime without a compile error. This pattern recurred in Phase 3 (see 03-LEARNINGS.md).
**Source:** 01-01-PLAN.md

---

## Patterns

### Shared mapper module (mappers.ts)
Keep all `entity → domain type` conversion functions in `src/lib/db/mappers.ts`. When adding a new entity type, add its mapper here first before writing any domain function that returns a domain object.

**When to use:** Any time a new Azure Table Storage entity type is introduced. Do not inline mapper logic inside API functions.
**Source:** 01-02-PLAN.md, 01-02-SUMMARY.md

---

### Migration sentinel: upsert a marker entity to track one-time operations
Before executing a one-time data migration, check for a sentinel entity (`partitionKey: 'department', rowKey: 'v2-departments-migration-sentinel'`). Create it if absent, skip the migration body if present. This makes the migration endpoint idempotent.

**When to use:** Any admin endpoint that should only run once (e.g., backfills, schema migrations). Combined with `UpdateMode.Merge` on the actual data writes so re-runs don't overwrite partial updates.
**Source:** 01-03-PLAN.md

---

### Round-robin team assignment for seed data
When seeding sample teams across departments, assign `teamIndex % departments.length` rather than hard-coding per-team department values. This keeps seed data balanced without manual maintenance when the department list changes.

**When to use:** Any seed script that distributes entities across a set of parent records.
**Source:** 01-03-PLAN.md

---

## Surprises

### Phase 1 executed with zero plan deviations
All three plans completed without any auto-fixes or discovered bugs. This is unusual for a schema-touching phase. The clean run is attributable to the phase being purely additive (no existing code was broken, only new types and functions were introduced).

**Impact:** Set an optimistic baseline that subsequent phases did not maintain — Phase 3 had four auto-fixed bugs and Phase 4 had four critical review findings.
**Source:** 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md
