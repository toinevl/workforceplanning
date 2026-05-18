# Feature Landscape: Department Hierarchy Layer

**Domain:** Enterprise workforce planning — department/division entity above teams
**Researched:** 2026-05-18
**Milestone:** v2.0 — Adding departments above existing teams

---

## Context: What Already Exists

The app has a flat team structure. `Team` has `{ id, name, description, color, sortOrder }`.
`StaffMember.baseTeamId` points directly to a team. `BoardState` returns all teams org-wide.
The new `Department` entity wraps teams into named, colored groups for org navigation and rollup visibility.

---

## Table Stakes

Features a department entity must have to be useful. Missing any of these = the feature feels broken or incomplete.

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Department name | Fundamental identity | Low | — |
| Department color | Visual differentiation in UI; matches existing `Team.color` pattern | Low | — |
| Department description | Context for what the dept does | Low | — |
| Department head (person name, free text) | Stakeholder accountability — planners always ask "who owns this?" | Low | — |
| `departmentId` on `Team` | Membership link — without this, departments are empty shells | Low | Department CRUD must exist first |
| `/departments` listing page | Central navigation hub; without it, departments have no entry point | Medium | Department entity + team membership |
| Total headcount rollup per department | Most-asked question in workforce review meetings | Low | `Team.members` aggregation |
| Total FTE rollup per department | Second most-asked; FTE != headcount due to part-time members | Low | `StaffMember.fte` aggregation |
| Team count per department | Shows org scope at a glance on the listing page | Low | Team-to-dept membership |
| `/departments/[deptId]` detail page | Navigation destination from listing; shows dept's teams | Medium | Listing page routing |
| Dept detail page shows that dept's teams (filtered board or team list) | Core promise of the feature — "see your department's teams" | Medium | `BoardState` needs dept filter |
| Department CRUD in Settings | Lifecycle management — create, rename, recolor, delete | Medium | Department entity |
| Team assignment to department (in Settings or team edit) | Teams must be assignable to depts | Low-Medium | Department CRUD must exist first |
| Default/ungrouped department for existing teams | Migration path — existing teams must not become orphans | Low | Migration logic |
| Department color badge on team cards (team board) | Visual connection back from teams to their dept | Low | Department entity + color |

---

## Differentiators

Nice-to-have features that add real value without over-engineering. Worth considering for v2.0 or near-term backlog.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Business driver distribution rollup on dept listing | Shows how many teams per dept are on Grow/Contain/Slim/Neutral — useful for capacity planning conversations | Medium | Requires aggregating `ScenarioTeamDriver` per dept; scenario-dependent so must be shown in context of active scenario |
| Retirement-eligible count per dept | Surfaces risk concentration — "Engineering has 8 retirements in 3 yrs" | Low-Medium | Already have `retirementEligibleYear` on `StaffMember`; just aggregate per dept |
| Squad vs non-squad count per dept | Useful for delivery capacity framing | Low | `StaffMember.isSquad` already exists |
| Removed members count per dept (scenario-aware) | Shows planning impact per dept in an active scenario | Low | Requires aggregating `removedMembers` per dept |
| Sort departments on listing page (alphabetical or by headcount) | Usability on large orgs | Low | Client-side only |
| Dept color indicator on breadcrumb/header on detail page | Orientation cue — user knows which dept they're in | Low | Purely cosmetic |
| "Last updated" for dept metadata | Auditability | Low | Requires `updatedAt` on Department entity |
| Link from team board column header back to dept | Navigation shortcut for cross-dept planners | Low | Requires dept context in board view |

---

## Anti-Features

Features to explicitly NOT build in v2.0. Each entry explains why the pattern is harmful here.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Per-department scenario scoping | Scenarios are the core cross-org planning primitive. Scoping them to depts breaks the model — a retirement wave spans depts, a squad removal may touch teams in multiple depts. Splitting this would require duplicating scenario logic and create conflicting states. | Keep scenarios cross-department. The dept detail page just shows that dept's teams within the global scenario. |
| Per-department access control / auth | Single-user app at v2.0 scale. Adding RBAC now adds enormous complexity (middleware, role tables, permission checks everywhere) for zero current users. It would also change the data model substantially when added later. | Defer to a future auth milestone. Note the design as "RBAC-ready" via department entity existing. |
| Department budget or cost fields | Budget data in a workforce tool creates liability — users expect it to be authoritative. It then needs actuals, variance tracking, integration with finance systems. None of that is scoped. | If budgetary framing is needed, FTE × assumed cost can be done externally or in a future analytics phase. |
| Nested departments (sub-departments) | The ask is one layer above teams. Recursive hierarchy (Engineering > Platform > Infra) multiplies UI complexity: breadcrumbs, rollup recursion, partial-dept views, tree navigation. Azure Table Storage is particularly ill-suited for tree traversal. | One layer: Department → Teams. That is the stated model. If sub-depts are needed later, it's a new milestone. |
| Department-level analytics dashboards (charts, trend lines, history) | This would require storing time-series data, which the current storage model (Azure Table Storage, snapshot-based) does not support naturally. | Snapshots and compare already provide time-based comparison. A per-dept comparison can be derived from existing snapshot data if needed. |
| Drag-and-drop team assignment between departments | Team-to-dept membership is a master data operation, not a planning operation. DnD implies "cheap moves" — but reassigning a team to a different dept is a structural org change that should be deliberate (form/modal). | Use a dropdown select on the team edit form to set `departmentId`. |
| Department "health score" or computed rating | These are pseudo-metrics with no agreed definition in workforce planning. Every stakeholder interprets them differently, and displaying them creates questions you can't answer. | Show raw numbers (FTE, headcount, driver distribution). Let planners draw their own conclusions. |
| Mandatory department assignment before team creation | Forces users to create depts before they can use the app. Breaks the onboarding path for new setups. | Default to an "Ungrouped" or first-available department. Allow assignment later. |

---

## Rollup Stats: Priority Ranking for Department Listing Page

Listed in order of usefulness in workforce planning conversations:

1. **Total headcount** — count of staff members assigned to teams in the dept (scenario-aware where applicable). The single number stakeholders always want first.
2. **Total FTE** — sum of `StaffMember.fte` for all members in the dept. Essential because FTE != headcount; part-time and shared resources are common.
3. **Team count** — how many teams are in the dept. Gives scope context.
4. **Business driver distribution** (scenario-context) — how many teams are Grow / Contain / Slim / Neutral within the active scenario. Useful but scenario-dependent; only show if a scenario is active.
5. **Retirement-eligible count** — members with `retirementEligibleYear` within the next N years. Surface org risk at a glance.
6. **Squad count vs non-squad** — delivery capacity framing. Lower priority but derivable from existing data.

Stats 1-3 are baseline (always shown). Stats 4-6 are scenario-contextual or secondary (show only when data is available).

---

## Expected UX: Department CRUD

### Creating a Department

**Pattern: Modal form triggered from Settings page or a "New Department" button on the listing page.**

- Inline creation (directly in listing page row) is a poor fit here because departments have 4 fields plus team assignment. Use a modal with a small form: name (required), color picker, description (optional textarea), dept head (optional text input).
- Color should default to a distinct color from existing departments (cycle through a preset palette, same UX pattern as teams).
- On success: close modal, listing page refreshes, new dept appears. Toast confirmation.

### Editing a Department

**Pattern: Edit modal, same form, triggered from a "..." or edit icon on the listing row or dept detail page header.**

- Do not use inline row editing — the color picker and description textarea are too complex for inline UX.
- The dept head field is free text (no user lookup needed since this is a single-user app with no auth model).
- Editing a dept name or color does NOT affect scenarios — it is pure metadata.

### Deleting a Department

**Pattern: Confirmation dialog with consequence explanation, triggered from Settings or the "..." menu.**

- Block deletion if the department still has teams assigned to it. Show which teams must be reassigned first. Do not cascade-delete teams.
- If a department can be deleted empty, just confirm intent and remove.
- Soft-delete is not needed here — departments are master data, not transactional records.

### Team-to-Department Assignment

**Pattern: Dropdown on the team edit form (in Settings), not a separate flow.**

- A `departmentId` dropdown on each team's edit form is the minimal correct solution.
- The listing page or dept detail page could also provide a "Move team to dept" action for bulk re-assignment, but that is a differentiator, not required.

---

## Department Detail Page: What to Show

The `/departments/[deptId]` page is essentially a dept-scoped team board. It should:

1. **Header:** Department name, color swatch, description, dept head name, rollup stats (headcount, FTE, team count).
2. **Teams section:** The teams that belong to this department. Because `TeamBoard` already renders a `BoardState`, the cleanest path is to filter `BoardState.teams` by `departmentId` and pass the filtered subset to `TeamBoard`. This means the dept detail page still requires an active scenario context to use the board — same as the main board.
3. **Read-only mode option:** If no scenario is active, show a static list of teams with their current (baseline) staff rather than a board. Or prompt to select a scenario.
4. **Navigation:** Breadcrumb back to `/departments`. Link to each team's detail if team detail pages exist.

The dept detail page should NOT be a standalone analytics page. It is a navigation layer: "here are your teams, filtered to this department."

---

## Feature Dependencies Map

```
Department entity (CRUD)
  └── Team.departmentId field (migration required for existing teams)
        ├── /departments listing page (rollup stats require team membership)
        │     └── headcount/FTE rollup (requires StaffMember data per dept)
        │     └── driver distribution (requires active Scenario + ScenarioTeamDriver per dept)
        └── /departments/[deptId] detail page
              └── Filtered BoardState (requires scenario selection, same as main board)
              └── Team color badge showing dept affiliation (requires color on dept entity)
```

Correct build order: Department entity → Team migration → Listing page → Detail page.

---

## MVP Recommendation

For v2.0, prioritize all Table Stakes items. The MVP should:

1. Ship the `Department` entity with full CRUD in Settings.
2. Migrate existing teams to a default department.
3. Build `/departments` listing with headcount + FTE + team count rollup (stats 1-3 only).
4. Build `/departments/[deptId]` detail page showing teams via filtered `TeamBoard`.
5. Add dept color badge to team board column headers (low effort, high visual payoff).

Defer to later backlog:
- Business driver distribution rollup (requires more scenario-coupling on listing page)
- Retirement risk rollup (useful but not blocking)
- Any form of per-dept analytics beyond raw counts

---

## Sources

Analysis based on:
- Project codebase: `domain.ts` type definitions, `TeamBoard.tsx` component structure, `PROJECT.md` v2.0 spec
- Domain knowledge of enterprise HR/workforce planning tools (Orgvue, Workday Workforce Planning, Anaplan, Pigment, Rippling HRIS org views)
- UX patterns for hierarchical org navigation in planning tools
- Confidence: HIGH for table stakes (derived directly from existing data model and stated requirements); MEDIUM for differentiators (based on domain patterns, not verified against external source due to tool restrictions)
