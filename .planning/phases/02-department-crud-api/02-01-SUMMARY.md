---
phase: 02-department-crud-api
plan: 01
subsystem: Data Access Layer
tags: [departments, CRUD, mappers, rollup-stats, parallel-scans, Azure-Tables]
dependency_graph:
  requires:
    - src/lib/db/tables.ts (DepartmentEntity, TeamEntity, StaffMemberEntity)
    - src/lib/types/domain.ts (Department, Team, StaffMember types)
    - src/lib/db/client.ts (getTableClient, UpdateMode.Merge)
  provides:
    - src/lib/db/mappers.ts::entityToDepartment
    - src/lib/api/departments.ts (getDepartments, getDepartmentById, getDepartmentsWithStats, createDepartment, updateDepartment, deleteDepartment, bulkAssignUnassignedTeams)
  affects:
    - Phase 2 Plan 2 (API routes will call these domain functions)
tech_stack:
  patterns:
    - Entity mappers (mirror entityToTeam pattern)
    - Azure Table Storage partition scans with Promise.all for parallelism
    - In-memory grouping with Map for stats computation
    - Idempotent operations with sentinel checking
    - UpdateMode.Merge for partial field updates
duration_minutes: 12
completed_date: "2026-05-18T19:16:11Z"
---

# Phase 2 Plan 1: Department CRUD API — Data Access Layer Summary

## What Was Built

### Task 1: entityToDepartment() Mapper
- **File:** src/lib/db/mappers.ts
- **What:** Added entityToDepartment(e: DepartmentEntity): Department function
- **Pattern:** Mirrors existing entityToTeam function
- **Mapping:** DepartmentEntity fields → Department domain type
  - rowKey → id
  - name → name
  - description → description (optional)
  - color → color
  - deptHead → deptHead (optional)
  - sortOrder → sortOrder

### Task 2: Department Domain Functions
- **File:** src/lib/api/departments.ts (new)
- **Functions:** Seven exported functions for complete CRUD and bulk operations

#### 1. getDepartments()
- Fetches all DepartmentEntity from TABLE_DEPARTMENTS
- Maps through entityToDepartment()
- Returns Department[] sorted by sortOrder ascending

#### 2. getDepartmentById(id: string)
- Fetches single department by rowKey
- Returns Department | null
- Gracefully handles not-found errors (no throw)

#### 3. getDepartmentsWithStats() ⭐ Pitfall 5 Solution
- **Three parallel partition scans** using Promise.all()
  1. departmentClient.listEntities<DepartmentEntity>()
  2. teamClient.listEntities<TeamEntity>()
  3. staffClient.listEntities<StaffMemberEntity>()
- **In-memory grouping:**
  - membersMap: Map<baseTeamId, StaffMemberEntity[]>
  - teamMap: Map<departmentId, TeamEntity[]>
- **Stats computation per department:**
  - headcount: sum of members across teams
  - totalFte: sum of FTE across members
  - teamCount: number of teams assigned
- **Unassigned bucket:** If teams exist without departmentId, includes a synthetic "Unassigned" department with sorted=999
- Returns Department[] with { headcount, totalFte, teamCount } appended

#### 4. createDepartment(name, color, description?, deptHead?)
- Generates new uuid for rowKey (v4())
- Computes sortOrder as max(existing) + 1 (or 1 if none)
- Calls getDepartments() to determine next sort order
- Creates DepartmentEntity with partitionKey='department'
- Upserts with 'Replace' mode
- Returns mapped Department

#### 5. updateDepartment(id, updates)
- Fetches existing entity, throws if not found
- Merges updates (name, color, description, deptHead)
- Preserves: id, createdAt, sortOrder, partitionKey
- Sets updatedAt to current ISO timestamp
- Upserts with 'Replace' mode
- Returns updated Department

#### 6. deleteDepartment(id)
- **Safety check:** Counts all TeamEntity where departmentId == id using table filter
- If assignedTeamCount > 0: returns { deleted: false, assignedTeamCount }
- If assignedTeamCount == 0: deletes entity, returns { deleted: true, assignedTeamCount: 0 }
- Caller (API route) will return HTTP 409 if deleted=false

#### 7. bulkAssignUnassignedTeams(defaultDepartmentId)
- **Idempotency via sentinel:** Checks for migration sentinel at rowKey='v2-departments-migration-sentinel'
- If sentinel missing, creates it (partitionKey='department')
- Fetches all TeamEntity from TABLE_TEAMS
- Filters teams with no departmentId
- For each unassigned: upsertEntity({ ...team, departmentId }, 'Merge')
  - **Merge mode ensures** partial updates don't overwrite other fields (Pitfall ASSIGN-04 mitigation)
- Returns { assigned: count, skipped: 0 }

## Verification Results

### ✓ All Functions Present
- [x] getDepartments
- [x] getDepartmentById
- [x] getDepartmentsWithStats
- [x] createDepartment
- [x] updateDepartment
- [x] deleteDepartment
- [x] bulkAssignUnassignedTeams

### ✓ TypeScript Compilation
```bash
npx tsc --noEmit
# Output: (no errors)
```

### ✓ Imports Resolve
- [x] entityToDepartment imported from '../db/mappers'
- [x] getTableClient imported from '../db/client'
- [x] Table constants (TABLE_DEPARTMENTS, TABLE_TEAMS, TABLE_STAFF)
- [x] Entity types (DepartmentEntity, TeamEntity, StaffMemberEntity)
- [x] Domain types (Department, Team, StaffMember)

### ✓ Key Implementation Details
- [x] getDepartmentsWithStats uses THREE PARALLEL partition scans (Promise.all)
- [x] bulkAssignUnassignedTeams checks sentinel before migration
- [x] bulkAssignUnassignedTeams uses UpdateMode.Merge for safe partial updates
- [x] deleteDepartment counts team assignments before deletion
- [x] All functions handle errors appropriately (try/catch for table ops)
- [x] No implicit any — all return types explicit
- [x] EntityToDepartment maps all DepartmentEntity fields

## Deviations from Plan

None — plan executed exactly as written.

## Integration Notes for Phase 2 Plan 2

**Phase 2 Plan 2 (API Routes)** will create HTTP endpoints that call these domain functions:

| Endpoint | Function | Notes |
|----------|----------|-------|
| GET /api/departments | getDepartments() | Returns sorted list |
| GET /api/departments/:id | getDepartmentById(id) | Returns 404 if not found |
| GET /api/departments/stats | getDepartmentsWithStats() | Includes rollup stats |
| POST /api/departments | createDepartment(...) | Request body validated at route layer |
| PATCH /api/departments/:id | updateDepartment(id, updates) | Partial update |
| DELETE /api/departments/:id | deleteDepartment(id) | Returns 409 if teams assigned |
| POST /api/departments/migrate | bulkAssignUnassignedTeams(defaultId) | One-time migration |

These functions encapsulate all data access logic before HTTP exposure.

## Threat Model Compliance

| Threat ID | Mitigation | Implemented |
|-----------|------------|-------------|
| T-02-01 | deleteDepartment checks team assignments | ✓ Returns count if any exist |
| T-02-02 | Stats computed from public data only | ✓ No sensitive filtering |
| T-02-03 | Three parallel scans (not sequential) | ✓ Promise.all() used |
| T-02-04 | Sentinel prevents duplicate migration | ✓ Checked before assignment |
| T-02-05 | sortOrder computed, not user input | ✓ Deterministic from max + 1 |

## Files Created / Modified

| File | Change | Status |
|------|--------|--------|
| src/lib/db/mappers.ts | Added entityToDepartment() | ✓ Complete |
| src/lib/api/departments.ts | Created with 7 functions | ✓ Complete |

## Commits

| Hash | Message |
|------|---------|
| fa40d65 | feat(02-01): add entityToDepartment mapper |
| 4dbbe88 | feat(02-01): create departments.ts with CRUD and rollup functions |

## Self-Check

- [x] src/lib/db/mappers.ts exists and contains entityToDepartment
- [x] src/lib/api/departments.ts exists with all 7 functions
- [x] fa40d65 commit exists: `git log --oneline | grep fa40d65`
- [x] 4dbbe88 commit exists: `git log --oneline | grep 4dbbe88`
- [x] TypeScript compiles without errors
- [x] All imports resolve correctly
