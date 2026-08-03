# Team-Level Skill Ambition, Department Rollup — Design Spec

Date: 2026-08-03
Status: Approved

## Problem

The just-shipped department-skills feature (see
`2026-08-03-department-skills-design.md`) has ambition flowing top-down: a
department sets a default required headcount per skill, and a team can
override it. In practice, headcount targets are a team-level reality —
a team lead knows how many of their own people should carry a given
skill. The department-level number should be a *consequence* of the
teams' targets (a rollup), not an independent value teams merely
override.

## Solution

Invert the direction. Departments keep owning the skill *set* (which
skill names apply, added/removed via the admin form) but no longer hold
a headcount value. Every team sets its own target headcount per skill —
sparse, unset means 0, no fallback to anything. The department detail
page gains a rollup panel that sums every team's current and target
headcount per skill, shown above the existing per-team rows.

## Data model

- `DepartmentSkill` drops `requiredHeadcount` — becomes
  `{ id, name, sortOrder }`. Departments only ever define names now.
- `Team.skillOverrides` is renamed `skillTargets` throughout (domain
  type, entity field, API field, hook types) — it was never really an
  "override" once there's nothing left to override. Same shape
  (`Record<string, number>`), same sparse JSON-string storage on
  `TeamEntity`. A missing key means a target of 0.

## Backend logic

`src/lib/skills/departmentSkills.ts`:

- `resolveTeamSkills(department, team)` simplifies to
  `requiredHeadcount = team.skillTargets[skill.id] ?? 0` — the
  `?? departmentDefault` fallback is gone because there is no
  department default.
- `coverageForTeam` (per-team `SkillCoveragePoint[]`: id/name/current/
  ambition/gap) is otherwise unchanged.
- No new backend rollup function. The department-level sum is computed
  client-side (see "Department rollup panel" below) from data the
  detail page already fetches — avoids a second server-side aggregation
  path for numbers the client already has.
- `parseDepartmentSkillsInput` drops all `requiredHeadcount` validation;
  input becomes `{ name: string }[]`.
- `parseSkillOverridesInput` is renamed `parseSkillTargetsInput` — same
  validation (every key must be a current skill id of the team's
  department, values non-negative integers).

## API changes

- `POST` / `PATCH /api/departments[/id]`: `skills` payload is
  `{ name }[]` — no `requiredHeadcount` in request or response, ever.
- `PATCH /api/teams/[id]`: body field renamed `skillOverrides` →
  `skillTargets`. Validation unchanged in spirit (reject skill ids that
  aren't in the team's department).
- `GET /api/teams?departmentId=X`: response shape unchanged
  (`SkillCoveragePoint[]` per team) — only the values feeding it
  change, since `ambition` now comes straight from `skillTargets`.

## Admin UI — department skill set

`DepartmentForm.tsx`'s Skills section loses the "required headcount"
number input — rows become `[name input] [remove ×]`, plus "+ Add
skill." Adding a skill creates a new axis on every team's radar at
target 0 until team leads set it.

## Team-level UI

`DepartmentTeamRow.tsx`'s click-to-edit interaction is unchanged
(click the number, type, Enter/blur saves). The "Reset to department
default" action is removed — there's no default left to reset to;
editing to 0 is the equivalent.

## Department rollup panel (new)

New component `src/components/departments/DepartmentSkillsRollup.tsx`.
Rendered on `/departments/[deptId]`, above the existing per-team list
(which stays exactly where it is, still the place edits happen). Sums
`current` and `ambition` per skill across every team already returned
by `useDepartmentTeams` for that department — no new API endpoint.
Renders with the existing `SkillRadarChart` component (reused as-is,
same `CoveragePoint[]` prop shape) plus a read-only gap list matching
the existing per-team gap list's visual style, minus any edit
affordance. Uses the same "no skills configured" empty state pattern
as the per-team rows when the department has none.

## Seed script

`buildDefaultDepartmentSkills` (department-level) is replaced by
per-team derivation: for each seeded team, derive its skill tags from
its own members' roles (same `deriveSkillsForRole` mechanism as
today) and set `skillTargets[skillId]` to the count of its own members
carrying that tag — every team starts at gap 0 for its own
composition. `DepartmentEntity.skills` seeds with `{id, name,
sortOrder}` only, no headcount. This is a clean reseed with no
migration of existing data — the department-skills feature shipped to
production with only seed/demo content, nothing user-entered to
preserve.

## Testing

- Update existing `tests/skills.spec.ts` cases asserting the old
  department-default / override-with-fallback behavior to the new
  shapes (department skills have no `requiredHeadcount`; team targets
  have no department fallback).
- New coverage: department rollup arithmetic (sum across ≥2 teams
  matches a manually computed total, both current and ambition sides);
  admin form has no headcount input; per-team target editing has no
  reset button; seed script's per-team gap-0 baseline (not
  department-wide).

## Out of scope

- Migrating/backfilling existing department-default or team-override
  values from the prior model — clean reseed instead.
- A rollup endpoint independent of the per-team fetch (e.g. for the
  `/departments` list page) — can be added later if a surface needs
  the rollup without also needing per-team detail.
- Any change to the separate scenario-planning board's role-profile
  skill system (`TeamSkillBars.tsx`, `DecisionSummary.tsx`,
  `analysis.ts`) — untouched, out of scope, same as the prior spec.

## Technical notes

- This spec supersedes the "Admin UI — department skill set" and
  "Team-level override UI" sections of
  `2026-08-03-department-skills-design.md` where they describe a
  department-level default headcount; the rest of that spec (data
  model shape for the skill *set*, validation patterns, JSON-string
  storage convention) still holds.
- No new dependencies.
