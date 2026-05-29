# Milestones

## v2.0 Enterprise Departments (Shipped: 2026-05-20)

**Goal:** Add a Department layer above teams for multi-department org structures.
**Phases completed:** 5/5
**Execution passes:** 12

**Key accomplishments:**

- Production hardening for seed safety, shared team mapping, and idempotent department migration
- Department entity, Azure Table initialization, CRUD API, rollup stats, and team assignment endpoints
- Settings UI for department create/edit/delete, team department assignment, and bulk migration
- `/departments` listing with department rollups and an Unassigned bucket
- `/departments/[deptId]` read-only detail page with team headcount/FTE rows
- Department color badges in scenario board team headers

**Verification:**

- `npm run type-check`
- `npm run lint` (passes; warnings only from archived `.claude/worktrees`)
- `npm run build`

---

## v1.0 — Foundation (Complete)

**Shipped:** 2026-05-17
**Goal:** Build a working workforce planning app with scenario modelling, drag-and-drop board, snapshots, and Azure deployment.

**Delivered:**

- Team board with drag-and-drop staff member placement
- Scenario management (create, edit, delete, apply logic)
- Three scenario types: business drivers, retirement wave, squad removal
- Snapshot save/restore/compare
- Audit trail (papertrail panel)
- Azure Table Storage backend (7 tables)
- Azure App Service deployment via blob-storage Run-From-Package
- Azurite local dev environment
- CI/CD via GitHub Actions
- Settings page with seed data tooling
- UI audit pass (typography, spacing, color, accessibility, copywriting)

**Phases:** 1–? (no prior GSD tracking — bootstrapped at v2.0)
