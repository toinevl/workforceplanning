---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: planned
last_updated: "2026-05-18T20:50:00.000Z"
last_activity: 2026-05-18 -- Phase 2 planned (2 plans, 2 waves)
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 2
  completed_plans: 0
  percent: 20
---

## Current Position

Phase: 2 (Department CRUD API) — PLANNED, ready to execute
Plan: 0 of 2
Status: Plans verified — ready to execute
Last activity: 2026-05-18 -- Phase 2 planned: data access layer + API routes (6 endpoints)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** A planner can open a scenario, see their full team structure, and quickly model "what if" staffing changes without touching production HR data.
**Current focus:** Phase 2 — Department CRUD API

## Accumulated Context

### Decisions

- Departments use `/departments/[deptId]` routing (not a switcher widget)
- Scenarios remain cross-department — no dept-scoped scenarios in v2.0
- No per-department access control in v2.0
- Department properties: name, color, description, department head (person name)
- Existing teams migrate lazily — no `departmentId` = "Unassigned" bucket
- Rollup stats computed in single pass (3 parallel partition scans, group in memory)
- Detail page is read-only baseline staffing — not a scenario board
- Color picker: custom swatch palette (10 Tailwind colors) + native `<input type="color">`; no new library
- **[Plan 01]** DepartmentEntity uses fixed partitionKey='department' (consistent with teams='team')
- **[Plan 01]** Team.departmentId is optional for backward compatibility (no destructive migration)

### Blockers

(none)

### Todos

(none)
