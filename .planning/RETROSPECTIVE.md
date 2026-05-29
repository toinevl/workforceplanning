# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Enterprise Departments

**Shipped:** 2026-05-20 (archived 2026-05-29)
**Phases:** 5 | **Plans:** 12 | **Sessions:** multiple (2026-05-18 → 2026-05-29)

### What Was Built
- Department entity + `departments` table created on startup; teams gained an optional `departmentId`
- Idempotent (sentinel-guarded) migration moving existing teams into a Default department
- Department CRUD API with rollup stats and a bulk team-assignment endpoint
- Settings UI for department create/edit/delete, team→department assignment, and one-time bulk migration
- `/departments` listing (rollup FTE/headcount + Unassigned bucket) and `/departments/[deptId]` read-only detail page
- Department color badges threaded through scenario board team headers

### What Worked
- Phases 1-2 executed with zero deviations — building the API and schema before any UI paid off
- Code review caught 4 critical runtime bugs + 4 warnings in UI that passed both type-check and production build
- Single-pass rollup stat computation (compute headcount/FTE server-side from one members scan) kept the detail endpoint simple

### What Was Inefficient
- The milestone was recorded as "complete" while Phase 5's actual feature source (`/departments/[deptId]` page, `DepartmentTeamRow`, integration changes) sat **uncommitted** in the working tree — only its docs/UAT/security commits had landed. Caught and committed at archive time.
- A prior milestone-close attempt (2026-05-20) produced archive files and the MILESTONES.md entry but never committed them, left REQUIREMENTS.md in place, and created no git tag — leaving the close half-finished for 9 days.
- `.claude/worktrees/` checkouts leak into lint output (9 unused-var warnings from stale copies); the directory is untracked but not gitignored.

### Patterns Established
- **Code-review quality gate:** type-check + build passing is not sufficient; a dedicated review pass catches runtime null-safety and contract bugs that compile cleanly.
- **API contract verification:** verify request-body field names and HTTP-method existence when writing data-fetching hooks (field-name disagreement between hook and route caused a silent failure).
- **Error-body extraction:** `fetchJSON` reads the structured `{ error }` body before throwing so 409s surface usable messages.
- **Verify-then-commit-then-archive:** never archive a milestone on a dirty tree; commit the milestone's own source first.

### Key Lessons
1. "Phase complete" must mean *source committed*, not just docs/UAT committed — verify `git status` is clean before declaring a phase or milestone done.
2. TypeScript type safety does not guarantee runtime null safety on API-sourced values; guard `undefined`/`null` explicitly.
3. Entity mappers silently drop fields they forget to map (e.g. `departmentId`) — check mapper exhaustiveness at domain boundaries.
4. Finish milestone closes in one pass; a half-done close (uncommitted archives, no tag) is easy to forget and hard to reconstruct later.

### Cost Observations
- Model mix: predominantly opus (orchestration + execution), with subagent execution during phases
- Sessions: spread across 2026-05-18 → 2026-05-29
- Notable: most rework originated from incomplete commit hygiene at phase close, not from design churn

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 Foundation | bootstrapped | No GSD tracking — retrofitted at v2.0 |
| v2.0 Enterprise Departments | 5 | Per-phase LEARNINGS extraction + dedicated code-review gate introduced |

### Cumulative Quality

| Milestone | Type-check | Lint | Build |
|-----------|-----------|------|-------|
| v2.0 | ✓ pass | ✓ 0 errors (9 warnings from stale worktrees) | ✓ pass |

### Top Lessons (Verified Across Milestones)

1. Commit hygiene at phase close matters as much as the code — "done" requires a clean working tree.
2. Build green ≠ correct; a separate review pass is where runtime bugs surface.
