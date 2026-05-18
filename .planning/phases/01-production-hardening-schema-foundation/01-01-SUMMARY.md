---
phase: 01-production-hardening-schema-foundation
plan: 01
subsystem: schema-types
tags: [departments, entity-types, backward-compatibility, phase-foundation]
dependencies:
  requires: []
  provides: [DepartmentEntity, Department type, departmentId on Team]
  affects: [phase-02, department-crud-api, department-ui]
tech_stack:
  added: []
  patterns: [azure-table-storage-partition-key, optional-field-backward-compatibility, domain-type-mapping]
key_files:
  created: []
  modified:
    - src/lib/db/tables.ts
    - src/lib/types/domain.ts
decisions:
  - Department uses fixed partitionKey='department' pattern (consistent with teams='team', members='member')
  - DepartmentEntity.departmentId is rowKey (uuid)
  - Team.departmentId is optional for backward compatibility (no migration needed)
  - Domain type Department maps directly from DepartmentEntity (minus partitionKey/rowKey)
metrics:
  duration_minutes: 5
  completed_tasks: 2
  completed_date: 2026-05-18
  files_modified: 2
---

# Phase 01 Plan 01: Schema Foundation Summary

**Objective:** Define the Department entity schema and update Team types to include optional department reference.

**Completed:** 2 tasks — Both schema and type definitions implemented without breaking changes.

## What Was Built

### Task 1: DepartmentEntity + TABLE_DEPARTMENTS

**File:** `src/lib/db/tables.ts`

Added `TABLE_DEPARTMENTS` constant and `DepartmentEntity` interface:

- **TABLE_DEPARTMENTS** = 'departments' (constant)
- **DepartmentEntity** extends TableEntity with 8 fields:
  - `partitionKey: 'department'` (fixed literal, matches pattern of teams='team', members='member')
  - `rowKey: string` (departmentId uuid)
  - `name: string`
  - `description?: string` (optional)
  - `color: string` (hex color)
  - `deptHead?: string` (optional, free-text name)
  - `sortOrder: number`
  - `createdAt: string` (ISO date)
  - `updatedAt: string` (ISO date)

**Pattern matched:** Existing TeamEntity and StaffMemberEntity patterns used as reference.

### Task 2: Department Type + departmentId on Team

**File:** `src/lib/types/domain.ts`

Added `Department` domain type and extended `Team` type:

- **Department** interface with 6 fields:
  - `id: string`
  - `name: string`
  - `description?: string` (optional)
  - `color: string`
  - `deptHead?: string` (optional)
  - `sortOrder: number`

- **Team** interface extended with:
  - `departmentId?: string` (optional field appended)
  - All existing fields remain unchanged (backward compatible)

**Backward compatibility:** Existing teams in Azure Table Storage without `departmentId` field deserialize as `undefined` — no breaking changes to existing callers.

## Verification

- ✓ TABLE_DEPARTMENTS constant exported with value 'departments' (line 11, tables.ts)
- ✓ DepartmentEntity interface with all 8 required fields and correct types (lines 38-48, tables.ts)
- ✓ Department type exported with 6 fields matching ARCHITECTURE.md spec (lines 20-26, domain.ts)
- ✓ Team type includes departmentId?: string as optional field (line 32, domain.ts)
- ✓ No circular dependencies between tables.ts and domain.ts
- ✓ TypeScript type-check passes with no errors (npx tsc --noEmit)
- ✓ Existing code using Team type still compiles (departmentId field is optional)

## Success Criteria Met

- ✓ TABLE_DEPARTMENTS = 'departments' constant is exported
- ✓ DepartmentEntity is exported with 8 fields, partitionKey: 'department'
- ✓ Department type is exported with 6 fields (id, name, description?, color, deptHead?, sortOrder)
- ✓ Team type includes departmentId?: string and maintains backward compatibility
- ✓ No TypeScript errors or import issues
- ✓ Pattern consistency maintained with existing entity types

## Threat Model Mitigation

| Threat ID | Category | Component | Disposition | Status |
|-----------|----------|-----------|-------------|--------|
| T-01-01 | Tampering | TeamEntity deserialization | mitigate | ✓ SATISFIED — departmentId field is optional; existing rows without it deserialize correctly as undefined |
| T-01-02 | Spoofing | DepartmentEntity.color field | mitigate | DEFERRED — color validation scheduled for Phase 2 API routes |
| T-01-03 | Repudiation | createdAt/updatedAt timestamps | mitigate | DEFERRED — server-side generation scheduled for Phase 2 API layer |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

✓ PASSED

- src/lib/db/tables.ts exists with DepartmentEntity and TABLE_DEPARTMENTS
- src/lib/types/domain.ts exists with Department type and departmentId on Team
- Both commits exist in git log (f4c7bd3, 5c419ad)
- TypeScript compilation passes

## Integration Notes

This plan establishes the **type contracts** that will be consumed by:

- Phase 2: Department CRUD API layer (src/lib/api/departments.ts)
- Phase 2: API routes for departments
- Phase 3: Department management UI and hooks
- Phase 4: Department listing page and navigation
- Phase 5: Department detail page

The optional `departmentId` on Team enables a gradual, non-destructive migration — existing v1.0 data in Azure Table Storage continues to work without any table schema changes or data migration scripts.

## Commits

| Hash | Message |
|------|---------|
| f4c7bd3 | feat(01-01): add DepartmentEntity and TABLE_DEPARTMENTS constant |
| 5c419ad | feat(01-01): add Department type and departmentId to Team |
