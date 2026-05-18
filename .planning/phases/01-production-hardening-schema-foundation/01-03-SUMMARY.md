---
phase: 01-production-hardening-schema-foundation
plan: 03
subsystem: Database Layer / Seed
tags: [production-guard, seed, migration, departments]
requires:
  - 01-01-SUMMARY.md
provides:
  - Departments table initialized on app startup
  - Production guard on seed resetFirst operation
  - Sample departments in seed data (Engineering, Product, Operations)
  - Idempotent default department sentinel (rowKey='default')
affects:
  - src/lib/db/client.ts (getConnectionString exported, 'departments' in ensureTablesExist)
  - src/lib/db/tables.ts (departmentId added to TeamEntity)
  - src/lib/db/seed.ts (production guard, sample departments, migration sentinel)
decisions: []
metrics:
  duration_minutes: 10
  tasks_completed: 4
  files_created: 0
  files_modified: 3
  commits: 2
  completed_date: 2026-05-18
---

# Phase 1 Plan 3: Production Guard + Departments Init Summary

Added production-safety guard to seed resetFirst, initialized departments table on startup, seeded sample departments, and implemented idempotent migration sentinel.

## Objective Achieved

✓ Departments table created on app startup via ensureTablesExist()
✓ resetFirst blocked on production (NODE_ENV check + connection string check)
✓ Sample departments (Engineering, Product, Operations) created in seed
✓ Teams assigned round-robin to departments via departmentId
✓ Default department with rowKey='default' created idempotently
✓ TypeScript compilation succeeds with no errors

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Add 'departments' to ensureTablesExist() + export getConnectionString | ✓ | de74287 |
| 2 | Add production guard to seed resetFirst operation | ✓ | bdc5bc4 |
| 3 | Add sample departments to seed and assign teams to them | ✓ | bdc5bc4 |
| 4 | Implement idempotent migration sentinel pattern (HARD-03) | ✓ | bdc5bc4 |

## Must-Haves Verification

**Truth Assertions:**

- ✓ Seed resetFirst is blocked when NODE_ENV is 'production' OR connection string does not contain 'UseDevelopmentStorage'
- ✓ resetFirst returns a clear error: "Cannot reset seed on production connection string. This would delete all live teams data."
- ✓ Default department uses sentinel row pattern (upsertEntity with fixed rowKey='default')
- ✓ Departments table is initialized in ensureTablesExist()
- ✓ Seed creates 3 sample departments: Engineering (#6366f1), Product (#3b82f6), Operations (#22c55e)

**Artifact Verification:**

- ✓ `src/lib/db/client.ts` — `'departments'` is first entry in tables array; `getConnectionString` exported
- ✓ `src/lib/db/seed.ts` — production guard checks `NODE_ENV` and `UseDevelopmentStorage`; departments created before teams; `ensureDefaultDepartment` called after team insertion

## Code Changes

### Task 1: client.ts

- Added `'departments'` as first entry in `ensureTablesExist()` tables array (before 'teams')
- Exported `getConnectionString()` so seed.ts can call it for the production check

### Task 2: seed.ts — production guard

```typescript
const connectionString = getConnectionString();
const isProduction = process.env.NODE_ENV === 'production' || !connectionString.includes('UseDevelopmentStorage');
if (isProduction) {
  throw new Error('Cannot reset seed on production connection string. This would delete all live teams data.');
}
```

### Task 3: seed.ts — sample departments + round-robin team assignment

3 departments seeded: Engineering (indigo), Product (blue), Operations (green), each with unique uuid rowKey, correct sortOrder, and `createdAt`/`updatedAt` timestamps. Teams assigned via `departmentId: assignedDeptId` using `index % deptArray.length`.

### Task 4: seed.ts — migration sentinel

```typescript
async function ensureDefaultDepartment(departmentClient: TableClient): Promise<void> {
  await departmentClient.upsertEntity({
    partitionKey: 'department', rowKey: 'default', name: 'Default', color: '#6b7280', sortOrder: 99, ...
  }, 'Replace');
}
```

Called after team insertion — upsertEntity guarantees idempotency by design.

### tables.ts — TeamEntity schema

- Added `departmentId?: string` to `TeamEntity` interface (optional, backward compatible)

## Deviations from Plan

- Fixed a duplicate `const now` variable introduced by the executor (original `now` at line 267 was reused for scenario creation at line 335 — removed the duplicate declaration)

## Threat Model Status

- ✓ **T-01-05** (Seed resetFirst on production): Mitigated — double-check guard prevents destructive deletes on prod
- ✓ **T-01-06** (Migration duplicate departments): Mitigated — upsertEntity with fixed rowKey 'default' ensures idempotency
- ✓ **T-01-07** (Production deletion guard false negative): Mitigated — both NODE_ENV and connection string checked; false positive preferred over false negative

## Self-Check

- ✓ `src/lib/db/client.ts` contains `'departments'` and exports `getConnectionString`
- ✓ `src/lib/db/seed.ts` contains `NODE_ENV` and `UseDevelopmentStorage` guard
- ✓ `src/lib/db/seed.ts` contains `partitionKey: 'department'` for sample departments
- ✓ `src/lib/db/seed.ts` contains `departmentId:` field in team upsert
- ✓ `src/lib/db/seed.ts` contains `ensureDefaultDepartment` with `rowKey: 'default'`
- ✓ Build succeeded with no errors

**Result: PASSED**
