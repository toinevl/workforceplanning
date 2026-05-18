---
phase: 02-department-crud-api
plan: 02
subsystem: REST API Layer
tags: [departments, REST, routes, CRUD, team-filtering, bulk-migration]
dependency_graph:
  requires:
    - src/lib/api/departments.ts (getDepartmentsWithStats, createDepartment, updateDepartment, deleteDepartment, bulkAssignUnassignedTeams, getDepartmentById)
    - src/lib/api/teams.ts (getAllTeams)
    - next/server (NextResponse, Request)
  provides:
    - GET /api/departments (returns departments with stats)
    - POST /api/departments (creates new department)
    - PATCH /api/departments/[id] (updates department)
    - DELETE /api/departments/[id] (deletes department)
    - GET /api/teams (extended with departmentId filtering)
    - POST /api/admin/migrate-departments (bulk team assignment)
  affects:
    - Phase 3 (UI layer will call these endpoints)
tech_stack:
  patterns:
    - Next.js App Router with async route handlers
    - NextResponse for HTTP responses
    - Request body and query parameter parsing
    - Input validation at route layer
    - HTTP status codes (200, 201, 400, 404, 409)
duration_minutes: 8
completed_date: "2026-05-18T19:20:15Z"
---

# Phase 2 Plan 2: Department CRUD API — REST API Layer Summary

## What Was Built

Four new/modified route files implementing six REST endpoints for complete department CRUD operations and team filtering.

### Task 1: src/app/api/departments/route.ts

**GET Handler:**
- Calls `getDepartmentsWithStats()` from Phase 2 Plan 1
- Returns all departments with rollup stats (headcount, FTE, team count)
- Response: `{ data: Department[] }` with 200 status

**POST Handler:**
- Accepts request body: `{ name, color, description?, deptHead? }`
- Validates required fields: name (non-empty string) and color (non-empty string)
- Returns 400 if validation fails: `{ error: 'Missing or invalid name/color' }`
- Calls `createDepartment(name, color, description, deptHead)`
- Returns created department with 201 status: `{ data: createdDepartment }`

### Task 2: src/app/api/departments/[id]/route.ts

**PATCH Handler:**
- Accepts async params: `{ params: Promise<{ id: string }> }`
- Validates at least one updateable field is present (name, color, description, deptHead)
- Validates non-empty strings for name/color if provided
- Returns 400 if no fields or invalid fields provided
- Calls `updateDepartment(id, updates)` with only provided fields
- Returns 200 with updated department, or 404 if not found: `{ error: 'Not found' }`

**DELETE Handler:**
- Accepts async params: `{ params: Promise<{ id: string }> }`
- Calls `deleteDepartment(id)`
- Returns 200 on success: `{ data: { success: true } }`
- Returns 409 if teams are assigned: `{ error: '...', assignedTeamCount: N }`

### Task 3: src/app/api/teams/route.ts (Extended)

**GET Handler (Modified):**
- Now accepts optional `departmentId` query parameter: `/api/teams?departmentId=UUID`
- Calls `getAllTeams()` to fetch all teams
- If `departmentId` query param provided, filters teams where `t.departmentId === departmentId`
- Returns filtered or full team list with 200 status: `{ data: teams[] }`
- Backward compatible: without `departmentId` param, returns all teams as before

### Task 4: src/app/api/admin/migrate-departments/route.ts

**POST Handler:**
- Accepts request body: `{ defaultDepartmentId: string (UUID) }`
- Validates required field: defaultDepartmentId (non-empty string)
- Returns 400 if validation fails: `{ error: 'Missing or invalid defaultDepartmentId' }`
- Verifies department exists via `getDepartmentById(defaultDepartmentId)`
- Returns 404 if department not found: `{ error: 'Default department not found' }`
- Calls `bulkAssignUnassignedTeams(defaultDepartmentId)`
- Returns 200 with assignment counts: `{ data: { assigned: N, skipped: 0 } }`
- Idempotency handled by domain layer (sentinel checking)

## Verification Results

### ✓ All Four Route Files Created
- [x] src/app/api/departments/route.ts
- [x] src/app/api/departments/[id]/route.ts
- [x] src/app/api/teams/route.ts (modified)
- [x] src/app/api/admin/migrate-departments/route.ts

### ✓ All Expected Handlers Present
- [x] GET /api/departments
- [x] POST /api/departments
- [x] PATCH /api/departments/[id]
- [x] DELETE /api/departments/[id]
- [x] GET /api/teams (with departmentId filter)
- [x] POST /api/admin/migrate-departments

### ✓ Dependencies Import Correctly
- [x] getDepartmentsWithStats, createDepartment imported in departments/route.ts
- [x] updateDepartment, deleteDepartment imported in departments/[id]/route.ts
- [x] getAllTeams imported in teams/route.ts
- [x] bulkAssignUnassignedTeams, getDepartmentById imported in admin/migrate-departments/route.ts
- [x] NextResponse imported from 'next/server' in all route files

### ✓ HTTP Status Codes and Validation
- [x] GET returns 200 with data
- [x] POST returns 201 on creation, 400 on validation failure
- [x] PATCH returns 200 on success, 404 if not found, 400 on validation failure
- [x] DELETE returns 200 on success, 409 if teams assigned
- [x] departmentId filtering in GET /api/teams verified
- [x] Admin endpoint validates department exists before bulk assignment

## Integration Examples

### Example 1: Create Department
```bash
curl -X POST http://localhost:3000/api/departments \
  -H "Content-Type: application/json" \
  -d '{"name": "Engineering", "color": "#FF0000", "description": "Engineering team"}'
# Response: 201 Created
# { "data": { "id": "uuid", "name": "Engineering", "color": "#FF0000", ... } }
```

### Example 2: Get Departments with Stats
```bash
curl http://localhost:3000/api/departments
# Response: 200 OK
# { "data": [ { "id": "...", "name": "...", "headcount": 5, "totalFte": 4.5, "teamCount": 2 }, ... ] }
```

### Example 3: Filter Teams by Department
```bash
curl "http://localhost:3000/api/teams?departmentId=abc-123"
# Response: 200 OK
# { "data": [ { "id": "...", "name": "Team A", "departmentId": "abc-123" }, ... ] }
```

### Example 4: Update Department
```bash
curl -X PATCH http://localhost:3000/api/departments/abc-123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Engineering (Updated)"}'
# Response: 200 OK
# { "data": { "id": "abc-123", "name": "Engineering (Updated)", ... } }
```

### Example 5: Delete Department (with Safety Check)
```bash
curl -X DELETE http://localhost:3000/api/departments/abc-123
# If department has no assigned teams: 200 OK
# { "data": { "success": true } }
# If department has teams: 409 Conflict
# { "error": "Cannot delete department with assigned teams", "assignedTeamCount": 2 }
```

### Example 6: Bulk Team Migration
```bash
curl -X POST http://localhost:3000/api/admin/migrate-departments \
  -H "Content-Type: application/json" \
  -d '{"defaultDepartmentId": "default-dept-uuid"}'
# Response: 200 OK
# { "data": { "assigned": 5, "skipped": 0 } }
```

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Compliance

| Threat ID | Category | Mitigation | Implemented |
|-----------|----------|-----------|-------------|
| T-02-06 | Tampering | POST /departments input validation | ✓ Validates name/color non-empty |
| T-02-07 | Tampering | PATCH /departments/[id] partial updates | ✓ Only accepts updateable fields |
| T-02-08 | Tampering | DELETE /departments/[id] cascade safety | ✓ Returns 409 if teams assigned |
| T-02-09 | Tampering | POST /admin/migrate-departments authz | ✓ Unguarded (per v2.0 design) |
| T-02-10 | Info Disclosure | GET /api/teams?departmentId enumeration | ✓ Expected behavior for UI filtering |
| T-02-11 | DoS | GET /api/departments with large result set | ✓ Noted for Phase 4 pagination |

## Files Created / Modified

| File | Change | Lines | Status |
|------|--------|-------|--------|
| src/app/api/departments/route.ts | Created (GET, POST) | 37 | ✓ Complete |
| src/app/api/departments/[id]/route.ts | Created (PATCH, DELETE) | 69 | ✓ Complete |
| src/app/api/teams/route.ts | Modified (added departmentId filter) | +15 | ✓ Complete |
| src/app/api/admin/migrate-departments/route.ts | Created (POST) | 29 | ✓ Complete |

## Commits

| Hash | Message |
|------|---------|
| 087bdfd | feat(02-02): create departments route with GET (getAllDepartmentsWithStats) and POST (createDepartment) |
| f6e7ac1 | feat(02-02): create departments/[id] route with PATCH and DELETE handlers |
| a87833f | feat(02-02): extend teams route to support optional departmentId query filter |
| 10a89c6 | feat(02-02): create admin migrate-departments route for bulk team assignment |

## Self-Check

- [x] src/app/api/departments/route.ts exists with GET and POST handlers
- [x] src/app/api/departments/[id]/route.ts exists with PATCH and DELETE handlers
- [x] src/app/api/teams/route.ts modified with departmentId filtering
- [x] src/app/api/admin/migrate-departments/route.ts exists with POST handler
- [x] All imports resolve (getDepartmentsWithStats, createDepartment, updateDepartment, deleteDepartment, bulkAssignUnassignedTeams, getDepartmentById, getAllTeams)
- [x] All four commits exist in git history
- [x] Commit 087bdfd exists: `git log --oneline | grep 087bdfd`
- [x] Commit f6e7ac1 exists: `git log --oneline | grep f6e7ac1`
- [x] Commit a87833f exists: `git log --oneline | grep a87833f`
- [x] Commit 10a89c6 exists: `git log --oneline | grep 10a89c6`
