# Domain Pitfalls: v2.0 Enterprise Departments

**Domain:** Adding a parent entity (Department) above a flat team hierarchy in a Next.js + Azure Table Storage app with live production data.
**Researched:** 2026-05-18
**Confidence:** HIGH — based on direct codebase analysis plus Azure Table Storage constraints

---

## Critical Pitfalls

These mistakes cause data loss, production outages, or full rewrites.

---

### Pitfall 1: Destructive seed wipe deletes live team data

**What goes wrong:**
`runSeed()` in `src/lib/db/seed.ts` calls `deleteByPartitionKey(teamClient, 'team')` when `options.resetFirst === true`. If a developer runs seed with reset during v2.0 development, all production team rows are deleted — including `departmentId` values just written by the migration.

**Why it happens:**
The `resetFirst` flag was safe in v1.0 (demo data only). In v2.0, the teams table holds live org data that is not re-creatable from seed config.

**Consequences:**
All teams lose their names, colors, sort orders, and department assignments. Staff `baseTeamId` references become orphaned. Scenarios referencing those teamIds in `scenarioTeamDrivers` become broken.

**Warning signs:**
- Seed panel in Settings has no guard against production use
- `resetFirst` is a boolean passed from the UI with no environment check
- No backup/export mechanism exists

**Prevention:**
- Add an environment guard: block `resetFirst: true` in `runSeed()` when `NODE_ENV === 'production'` or when `AZURE_STORAGE_CONNECTION_STRING` is not `UseDevelopmentStorage=true`
- Update `SeedSetupPanel` to visually warn when connected to a non-local storage account
- Never add departments to seed reset scope without the same guard

**Phase to address:** Phase 1 (before any migration work begins)

---

### Pitfall 2: Migration that writes `departmentId` to teams is not idempotent

**What goes wrong:**
A migration function runs at startup or via API and assigns teams to a "Default" department. If the migration runs twice (deploy restart, dev re-run, Azurite restart), it either:
- Creates a second "Default" department with a new UUID, orphaning teams that already had a `departmentId`
- Overwrites manual department assignments made after the first migration run

**Why it happens:**
Azure Table Storage has no schema versioning. Without a migration-state marker, there is no way to know whether the migration has already run.

**Consequences:**
Teams accumulate stale `departmentId` values pointing to deleted or duplicate department rows. The departments listing page shows phantom departments.

**Warning signs:**
- No migration state table or sentinel row exists in the codebase
- `upsertEntity` with `'Replace'` mode silently overwrites existing department assignments

**Prevention:**
- Write a sentinel row to a `migrations` partition (e.g., `partitionKey: 'migration', rowKey: 'v2-departments'`) after the migration completes
- Check for the sentinel at the start of the migration function and skip if present
- Use `'Merge'` mode (not `'Replace'`) when writing `departmentId` to existing team rows so other team fields are not touched

**Phase to address:** Phase 1 (migration design)

---

### Pitfall 3: `boardStateJson` in snapshots contains `Team` objects without `departmentId`

**What goes wrong:**
`SnapshotEntity.boardStateJson` stores a serialized `BoardState` including the `Team` type. After v2.0, `Team` gains a `departmentId` field. Existing snapshot JSON does not have this field. When a user restores a snapshot or views the compare page, the deserialized team objects have `departmentId: undefined`, which breaks any filtering or display logic that expects the field.

**Why it happens:**
`BoardState` is stored as a JSON blob. There is no migration path for already-persisted blobs. The `SnapshotEntity` in `tables.ts` stores `boardStateJson: string` — a raw serialized domain object, not a versioned schema.

**Consequences:**
- Snapshot restore silently drops `departmentId` assignments for all teams in the snapshot
- Compare page may show teams with no department affiliation even after migration
- Department page stats derived from restored state will be wrong

**Warning signs:**
- `boardStateJson` field in `SnapshotEntity` is unversioned
- `CompareView.tsx` deserializes snapshots without a schema version check
- No migration touches the `scenarioSnapshots` table

**Prevention:**
- Add a `schemaVersion: number` field to the `BoardState` type and to `boardStateJson` blobs
- On deserialization, check schema version and apply forward-migration logic (e.g., inject `departmentId: null` for teams when reading v1 snapshots)
- Treat `departmentId` as optional (`departmentId?: string`) in `Team` so old snapshots deserialize without runtime errors
- Document that pre-v2.0 snapshot compares will show teams with no department

**Phase to address:** Phase 2 (department data model), before snapshot display work

---

### Pitfall 4: `getAllTeams()` has no filter — department pages do a full table scan then filter in memory

**What goes wrong:**
`getAllTeams()` in `src/lib/api/teams.ts` uses `client.listEntities<TeamEntity>()` with no `queryOptions`. All teams in the `teams` table are fetched, then filtered in application code for a department page. This works at 6 teams, but at enterprise scale (50–200 teams) this scans the entire table on every department page load.

**Why it happens:**
The current `TeamEntity` uses `partitionKey: 'team'` for all rows. Azure Table Storage can only efficiently filter by `PartitionKey` and `RowKey`. Adding `departmentId` as a regular property means filtering by it requires a full table scan.

**Consequences:**
- Department pages become slow as team count grows
- Each `/departments/[deptId]` page load scans every team row
- No pagination is possible without redesigning the partition key

**Warning signs:**
- `TeamEntity` has `partitionKey: 'team'` (single partition, all rows)
- PROJECT.md already flags: "Flat partition key for teams — Revisit for v2"
- `getAllTeams()` has no filter parameter

**Prevention (two options, choose one):**

Option A — Accept the full scan, add in-memory filter:
Acceptable for ≤ ~200 teams. Add a `getTeamsByDepartment(deptId: string)` function that calls `getAllTeams()` and filters in memory. Document the scale limit.

Option B — Change partition key to `departmentId`:
Store team rows as `partitionKey: deptId, rowKey: teamId`. Enables efficient `PartitionKey eq 'deptId'` queries. Breaking change: requires a data migration for all existing team rows and all code that calls `getEntity('team', teamId)`.

**Recommended:** Use Option A for v2.0 (org has 6–24 teams; full scan is fast). Design `getTeamsByDepartment()` interface now so Option B is a drop-in later. Do NOT change the partition key in v2.0 — the migration risk to live data outweighs the benefit.

**Phase to address:** Phase 2 (department data model)

---

## Moderate Pitfalls

These mistakes cause bugs, incorrect data, or painful rework — not full rewrites.

---

### Pitfall 5: Deleting a department does not clear `departmentId` on its teams

**What goes wrong:**
A department is deleted via the Settings CRUD. The `departmentId` field on all teams that belonged to that department is not cleared. Those teams now reference a non-existent department. The departments listing page may show a count that excludes those teams; the teams themselves become invisible on all department-scoped pages.

**Why it happens:**
Azure Table Storage has no cascading deletes. Referential integrity is entirely the application's responsibility. There is no existing pattern in the codebase for this — `deleteScenario()` does clean up child entities, but only because they share the scenario's partition key (easy to query). Teams with a stale `departmentId` are scattered across the teams table.

**Consequences:**
- Teams disappear from the departments listing
- Staff members on those teams still exist but are only visible via the board (which uses `getAllTeams()` ignoring departmentId)
- No error is surfaced; data silently diverges

**Warning signs:**
- No `departmentId` index exists in Azure Table Storage to find teams by department
- Deleting a department currently requires a full teams-table scan to find and clear references

**Prevention:**
- Before deleting a department, fetch all teams (`getAllTeams()`), find those with `departmentId === deptId`, and set `departmentId = null` or assign them to a "Default" department
- Alternatively, block department deletion if any teams are assigned (simpler; force reassignment first)
- Add a confirmation dialog listing how many teams will be affected
- Never silently delete — always resolve referential integrity before completing the delete

**Phase to address:** Phase 3 (department CRUD)

---

### Pitfall 6: `entityToTeam()` in `scenarios.ts` and `teams.ts` do not map `departmentId` — two copies must be updated

**What goes wrong:**
The `entityToTeam()` helper exists in two places: `src/lib/api/teams.ts` (line 5) and `src/lib/api/scenarios.ts` (line 43). When `departmentId` is added to `TeamEntity`, both copies must be updated. Missing one means the board state returns `Team` objects without `departmentId` even after the migration — a subtle, hard-to-diagnose bug.

**Why it happens:**
The helper was duplicated because `scenarios.ts` is a large aggregation file and importing from `teams.ts` would create a circular or coupling concern. This is a DRY violation that becomes a correctness risk during the v2.0 data model change.

**Consequences:**
Department-filtered board views will fail to filter correctly because team objects on the board will not carry `departmentId`.

**Warning signs:**
- Both files define `function entityToTeam(e: TeamEntity): Team`
- TypeScript will NOT catch this if `departmentId?: string` (optional) — the field simply won't be populated

**Prevention:**
- Before adding `departmentId` to `TeamEntity`, consolidate `entityToTeam()` into a single shared utility (e.g., `src/lib/db/mappers.ts`)
- Add a TypeScript unit test asserting that `entityToTeam` maps all fields of `TeamEntity`
- Alternatively, add `departmentId` to both copies simultaneously in the same commit with a comment linking them

**Phase to address:** Phase 2 (department data model, before writing any department-filtering code)

---

### Pitfall 7: Rollup stats computed by loading all members then filtering — double full-table scan per department page

**What goes wrong:**
Computing FTE/headcount for a department requires:
1. Fetching all teams (to find which belong to the department)
2. Fetching all members (to find which belong to those teams)

The departments listing page will do this for every department simultaneously (e.g., 5 departments = 5 parallel calls to `getAllMembers()`, each scanning the full `staffMembers` table). Azure Table Storage is billed per operation and throttled under load.

**Why it happens:**
`StaffMemberEntity` stores `baseTeamId` as a regular property, not a partition key. There is no way to query "members of team X" without scanning all members or changing the data model. The current `getScenarioBoardState()` already fetches all members for every board load — this pattern will multiply on the departments listing.

**Consequences:**
- Departments listing page is slow (N × full member scan)
- Azure Table Storage read costs increase proportionally with departments
- Under Azurite locally this is invisible; in production it degrades

**Warning signs:**
- `getAllMembers()` has no filter parameter
- `getScenarioList()` in `scenarios.ts` already does a full member scan per scenario (lines 96–104) — this pattern is established but unscaled

**Prevention:**
- Compute rollup stats in a single pass: fetch all members once, group by `baseTeamId` in memory, then join with team→department mapping
- Cache the result in a single API response at `/api/departments` rather than computing per-department
- Do NOT call `getAllMembers()` once per department in parallel — batch the computation

**Phase to address:** Phase 4 (departments listing page)

---

### Pitfall 8: TopNav `isHome` and `isSettings` detection breaks when `/departments` routes are added

**What goes wrong:**
`TopNav.tsx` uses `pathname === '/' || pathname === '/scenarios'` and `pathname === '/settings'` to set `aria-current`. When `/departments` and `/departments/[deptId]` routes are added, neither condition matches — the active state will never highlight "Departments" in the nav unless the detection logic is updated.

**Why it happens:**
The nav uses exact equality checks, not `pathname.startsWith()`. This is fine with two routes; it becomes a maintenance burden as routes multiply.

**Consequences:**
The "Departments" nav link will never show `aria-[current=page]` styling. Minor UX issue, but inconsistent with existing nav behavior.

**Warning signs:**
- `isHome` and `isSettings` use exact string comparison
- Adding Departments link without updating the detection logic compiles without error

**Prevention:**
- Refactor nav active detection to use `pathname.startsWith('/departments')` for the departments link
- Consider extracting nav link config to a data structure: `[{ href: '/departments', label: 'Departments', match: (p) => p.startsWith('/departments') }]`
- Apply the same `startsWith` pattern retroactively to Home and Settings for consistency

**Phase to address:** Phase 5 (navigation update)

---

### Pitfall 9: `ensureTablesExist()` in `client.ts` does not include the new `departments` table

**What goes wrong:**
`ensureTablesExist()` has a hard-coded list of table names. Adding a `departments` table requires updating this list. If the table is not added here, the app will throw a `TableDoesNotExist` error on the first request to the departments API — but only on fresh environments. Existing environments (including production) already have the table created by the first request (Azure Table Storage auto-creates on first `upsertEntity` in some SDK paths), masking the bug in development.

**Why it happens:**
Table creation is centralized in `ensureTablesExist()` but there is no enforcement that all tables must be registered there.

**Consequences:**
- Fresh Azurite local setups and new production deployments fail with a 500 error on first department load
- The bug is invisible in environments where the table already exists

**Warning signs:**
- `ensureTablesExist()` is the only place tables are created; it is manually maintained
- New tables added to constants in `tables.ts` are not automatically registered

**Prevention:**
- Add `'departments'` to the `tables` array in `ensureTablesExist()` in the same commit that defines `TABLE_DEPARTMENTS`
- Consider deriving the list from the table constants (e.g., export an array of all table names from `tables.ts`)

**Phase to address:** Phase 2 (department data model)

---

## Minor Pitfalls

---

### Pitfall 10: `sortOrder` on teams loses meaning after department grouping

**What goes wrong:**
Teams currently have a global `sortOrder` (0, 1, 2…) used to sort across the entire org. After departments are introduced, the department detail page shows only its teams — but the global sort order may interleave badly (e.g., dept A has teams with sortOrder 0, 2, 4 and dept B has 1, 3, 5).

**Prevention:**
- For v2.0, sort teams within a department by their existing `sortOrder` — this preserves existing visual order without changes
- Do not re-number `sortOrder` values during migration; it changes live data unnecessarily
- Defer per-department sort order management to a future milestone

**Phase to address:** Phase 2 (note in implementation, no code change needed now)

---

### Pitfall 11: `color` field collision — departments and teams both have `color`

**What goes wrong:**
Both `TeamEntity` and the planned `DepartmentEntity` will have a `color` field. The department detail page and the team board both use team color for visual identity. If a department color is displayed alongside team colors, users may not know which color refers to what.

**Prevention:**
- Keep color semantics separate in the UI: department color is used for the department header/badge; team color is used for team cards
- Do not replace team color with department color on the board — the board's visual identity is team-based and must stay unchanged

**Phase to address:** Phase 3 (department entity design)

---

### Pitfall 12: `tags: string` (JSON-serialized array) pattern not followed for new department fields

**What goes wrong:**
`StaffMemberEntity.tags` stores a JSON array as a string because Azure Table Storage does not support array types. If new department fields need array or object values (e.g., multiple dept heads, a list of team IDs), developers may try to use native TypeScript arrays in the entity type — which will silently fail to persist correctly.

**Prevention:**
- Follow the existing pattern: any array or object field must be stored as `JSON.stringify()` string in the entity and parsed on read
- Document this constraint prominently in `tables.ts` near the new `DepartmentEntity` definition

**Phase to address:** Phase 2 (department entity design)

---

## Phase-Specific Warning Summary

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| Phase 1 | Seed guard | Pitfall 1: `resetFirst` wipes live teams | Add env guard to `runSeed()` before any migration work |
| Phase 2 | Department entity | Pitfall 9: `departments` table not in `ensureTablesExist()` | Add to table list in same commit |
| Phase 2 | Data model | Pitfall 6: `entityToTeam` duplicated in two files | Consolidate to shared mapper before adding `departmentId` |
| Phase 2 | Data model | Pitfall 12: Array fields need JSON serialization | Document pattern in `DepartmentEntity` definition |
| Phase 2 | Snapshot schema | Pitfall 3: Existing `boardStateJson` lacks `departmentId` | Make `departmentId` optional; add schema version field |
| Phase 2 | Query design | Pitfall 4: `getAllTeams()` is a full table scan | Implement `getTeamsByDepartment()` with in-memory filter |
| Phase 2 | Sort order | Pitfall 10: Global `sortOrder` interleaves across depts | Sort by existing `sortOrder` within dept; defer reordering |
| Phase 3 | Department CRUD | Pitfall 5: Deleting dept orphans team `departmentId` | Reassign or clear teams before delete; confirm dialog |
| Phase 3 | Entity design | Pitfall 11: Dept and team color semantics | Keep colors visually distinct in UI components |
| Phase 1 | Migration | Pitfall 2: Migration is not idempotent | Sentinel row in `migrations` partition |
| Phase 4 | Dept listing | Pitfall 7: N × full member scan for rollup stats | Compute in single pass; batch all dept stats in one API call |
| Phase 5 | Navigation | Pitfall 8: `isHome`/`isSettings` exact match breaks | Use `startsWith` for dept nav active detection |

---

## Sources

- Codebase direct analysis: `src/lib/db/tables.ts`, `src/lib/db/client.ts`, `src/lib/api/teams.ts`, `src/lib/api/scenarios.ts`, `src/lib/db/seed.ts`, `src/components/layout/TopNav.tsx`
- `.planning/PROJECT.md` — explicit constraint: "Azure Table Storage has no foreign keys — referential integrity enforced in app layer"
- Azure Table Storage constraints: single partition key per row, no transactions across tables, no FK support, array types must be serialized as strings
