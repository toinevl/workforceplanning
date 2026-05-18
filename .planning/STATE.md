---
milestone: v2.0
name: Enterprise Departments
status: planning
progress:
  phases_total: 5
  phases_complete: 0
  phases_in_progress: 0
---

## Current Position

Phase: Not started (roadmap defined, ready to plan Phase 1)
Plan: —
Status: Planning
Last activity: 2026-05-18 — Roadmap created (5 phases, 24 requirements)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-18)

**Core value:** A planner can open a scenario, see their full team structure, and quickly model "what if" staffing changes without touching production HR data.
**Current focus:** Phase 1 — Production Hardening + Schema Foundation

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

### Blockers
(none)

### Todos
(none)
