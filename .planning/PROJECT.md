# Workforce Planning

## What This Is

A web-based workforce planning tool for org leaders to model staffing scenarios across teams. Planners can drag-and-drop staff members between teams, apply business drivers (grow/contain/slim/neutral), simulate retirement waves and squad removals, snapshot states for comparison, and track changes via an audit trail. Deployed on Azure App Service with Azure Table Storage.

## Core Value

A planner can open a scenario, see their full team structure, and quickly model "what if" staffing changes without touching production HR data.

## Current Milestone: v2.0 Enterprise Departments

**Goal:** Introduce a Department layer above teams — each department gets its own page, visual identity (color, description, department head), and rollup stats; scenarios remain cross-department.

**Target features:**
- Department entity (name, color, description, dept head)
- Department CRUD in Settings
- `/departments` listing page with rollup stats (FTE, headcount per dept)
- `/departments/[deptId]` detail page showing that department's teams and board
- Team entity gets `departmentId` field with migration for existing teams
- Navigation updated to include Departments as a top-level section
- Seed/dev tooling updated to support multi-department setup
- Scenarios and board view remain cross-department (unchanged)

## Requirements

### Validated (v1.0)

- ✓ User can view all teams and staff members on a board — v1.0
- ✓ User can create, edit, and delete workforce scenarios — v1.0
- ✓ User can drag staff members between teams within a scenario — v1.0
- ✓ User can set business drivers per team (grow/contain/slim/neutral) — v1.0
- ✓ User can apply scenario logic (retirement wave, squad removal, business drivers) — v1.0
- ✓ User can save and restore named snapshots of a scenario — v1.0
- ✓ User can compare two snapshots side-by-side — v1.0
- ✓ User can view an audit trail of all scenario changes — v1.0
- ✓ App is deployed to Azure App Service with Azure Table Storage — v1.0

### Validated (v2.0)

- ✓ User can create, edit, and delete departments with name, color, description, and dept head — Phase 3
- ✓ User can assign teams to departments — Phase 3
- ✓ Existing teams are migrated to a default department on first run — Phase 3

### Validated (v2.0 — Phase 4)

- ✓ User can view all departments on a listing page with rollup FTE/headcount stats — Phase 4
- ✓ Navigation includes Departments as a top-level section — Phase 4

### Active (v2.0)

- [ ] User can navigate to a department detail page showing its teams
- [ ] Teams board within a department shows only that department's teams

### Out of Scope

- Per-department access control / auth — Not in v2.0; single-user app, defer to future
- Department-scoped scenarios — Scenarios remain cross-org; department is org display grouping
- Department budget fields — Not requested; can be added in future milestone
- Cross-department staff transfers as a formal workflow — Scenarios handle this already

## Context

**Tech Stack:**
- Next.js (App Router) with TypeScript
- Azure Table Storage (Azurite locally) — partition/row key design critical
- Zustand for UI state, TanStack Query for server state
- Tailwind CSS + Shadcn-style custom UI components
- Deployed: Azure App Service with WEBSITE_RUN_FROM_PACKAGE blob-storage method

**Codebase state entering v2.0:**
- Flat team structure — all teams in a single `teams` table with `partitionKey: 'team'`
- Staff members have `baseTeamId` pointing directly to a team (no dept layer)
- `BoardState` fetches all teams across the entire org (no dept filter)
- Settings page has a seed setup panel; no team management CRUD yet
- Navigation: Home (scenarios), Settings — no departments section

**Known constraints:**
- Azure Table Storage has no foreign keys — referential integrity enforced in app layer
- `partitionKey` design is critical for query performance; currently all teams share `'team'` partition
- Next.js version may differ from standard — see AGENTS.md / CLAUDE.md

## Constraints

- **Tech Stack**: Azure Table Storage only (no SQL) — all data model design must work with partition/row key queries
- **Compatibility**: Existing v1.0 data in Azure Table Storage must migrate gracefully — no destructive table changes
- **Next.js**: Read node_modules/next/dist/docs/ before writing any Next.js code — version may have breaking changes
- **Deployment**: WEBSITE_RUN_FROM_PACKAGE blob-storage deployment; infra changes require updating main.bicep

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Azure Table Storage (not SQL) | Cost, simplicity, existing infra | ✓ Good — working well for v1 scale |
| Flat partition key for teams (`'team'`) | Simple queries, v1 had single org | — Revisit for v2 (dept-scoped queries) |
| WEBSITE_RUN_FROM_PACKAGE blob deploy | Bypasses OneDeploy 409 conflict | ✓ Good — stable deployment |
| Scenarios are cross-org | Keep planning at org level | — v2 confirms this stays unchanged |
| Departments as pages not switcher | User prefers `/departments/[id]` routing | ✓ Implemented — Phase 3 |
| Raw fetch in delete/migrate hooks | `fetchJSON` throws before body can be read; 409 needs `assignedTeamCount` | ✓ Pattern established — Phase 3 |
| Custom dialog for BulkMigrateButton | `ConfirmDialog` accepts only primitive strings — no children slot for dropdown | ✓ Implemented — Phase 3 |
| `unassignedTeamCount` from `useTeamList` | `Department[]` objects don't carry team membership; teams query needed | ✓ Established pattern — Phase 3 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-20 — After Phase 4 (Navigation + Departments Listing)*
