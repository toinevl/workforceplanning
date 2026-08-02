# Golden Path Restructure — Design Spec

Date: 2026-08-02
Status: Approved

## Problem

The app dumps users onto a flat scenario list with no organizational context.
Settings is a junk drawer (seed, departments, team assignment, bulk ops).
Pages are peers with no guided flow. The planning lead has no entry narrative.

## Solution

Restructure the site around a golden path (happy flow) for the planning lead
persona: org dashboard → department detail → scenario board → impact → decision.

## Golden Path

1. Land on org dashboard — see departments, headcount, FTE, metrics at a glance
2. Click a department — see teams, skill coverage, current state
3. Start a scenario — "Plan Reorganization" creates a department-scoped scenario
4. Work the board — drag members, adjust teams (filtered to department only)
5. See impact — skill gaps, FTE changes, decision summary update live
6. Capture decision — session workspace records what changed
7. Compare — before/after snapshots

## Changes

### 1. Navigation restructure

Current: Home (scenarios), Settings (junk drawer), Departments (list)

New: Org (dashboard), Departments (list), Scenarios (list)

- "Org" replaces "Home" as the first nav item, links to /
- "Scenarios" promoted to top-level nav (was hidden route /scenarios)
- "Settings" removed from nav — accessible via small gear/link only
- Settings itself moves to /admin or stays at /settings with stripped content

### 2. New landing page — Org Dashboard (/)

Replaces ScenarioDashboard as the home page.

- Top row: org-level metrics (total headcount, total FTE, department count, team count)
- Main body: department cards in a grid
  - Each card: department name, color dot, team count, headcount, FTE, dept head name
  - Clicking opens /departments/[deptId]
- Purely informational — no scenarios, no actions, no admin
- Current ScenarioDashboard moves to /scenarios (route already exists)

Data source: GET /api/departments (already returns team counts and stats).

### 3. Department detail page (/departments/[deptId] — enhanced)

Becomes the pivot point of the golden path. Three additions:

a) "Plan Reorganization" button
   - Creates a new scenario with departmentId pre-filled
   - Jumps straight to the board (/scenarios/[id])
   - Uses existing scenario creation flow (type picker), scoped to department

b) Inline team assignment
   - Assign/unassign teams directly from this page
   - Reuses PATCH /api/teams/[id] endpoint (already supports departmentId)
   - Shows unassigned teams that could be added to this department

c) Active scenarios panel
   - Queries GET /api/scenarios?departmentId=X
   - Shows scenario name, type, last modified
   - Click to resume (links to /scenarios/[id])
   - Empty state: "No scenarios for this department yet"

### 4. Scenario entity — add departmentId

- Add nullable `departmentId: string | undefined` to ScenarioEntity
- Scenarios created from department page get it pre-filled
- Existing scenarios get null (legacy/global) — no data migration needed
- API: POST /api/scenarios accepts optional departmentId
- API: GET /api/scenarios accepts optional ?departmentId=X filter
- API: GET /api/scenarios/[id]/board filters teams by scenario.departmentId

### 5. Board — department-scoped view

When scenario.departmentId is set:
- Board loads only teams where team.departmentId === scenario.departmentId
- getScenarioBoardState filters teams before building the board state
- Legacy scenarios (null departmentId) load all teams as before

### 6. Settings — stripped down

Move to /admin (or keep /settings with stripped content). Contains only:
- Seed/sample data management (SeedSetupPanel)
- Bulk migration tool (BulkMigrateButton)

Department CRUD: already on the departments page (DepartmentsSection).
Move it from Settings to the /departments page if not already there.

Team assignment: moves to department detail page (inline).

### 7. Departments page (/departments — minor enhancement)

The DepartmentsSection (create/edit/delete departments) currently lives on
Settings. Move it here so department management is inline with the golden path.

## Out of scope

- Cross-department scenario planning (board shows one department only)
- Custom scenario templates (keep the 3 existing types)
- Org dashboard drill-down charts (purely informational for now)
- Authentication/role-based access (already handled)

## Technical notes

- All API endpoints and hooks already exist — mostly wiring and new components
- ScenarioEntity change: add field to domain type + table entity mapper
- OrgDashboard component: new, aggregates existing department data
- Board filtering: single filter in getScenarioBoardState
- No new dependencies
