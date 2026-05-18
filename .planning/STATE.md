---
milestone: v2.0
name: Enterprise Departments
status: planning
progress:
  phases_total: 0
  phases_complete: 0
  phases_in_progress: 0
---

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-18 — Milestone v2.0 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** A planner can open a scenario, see their full team structure, and quickly model "what if" staffing changes without touching production HR data.
**Current focus:** Requirements and roadmap definition

## Accumulated Context

### Decisions
- Departments use `/departments/[deptId]` routing (not a switcher widget)
- Scenarios remain cross-department — no dept-scoped scenarios in v2.0
- No per-department access control in v2.0
- Department properties: name, color, description, department head (person name)
- Existing teams must migrate gracefully to a default department

### Blockers
(none)

### Todos
(none)
