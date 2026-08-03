# Department-Level Skills — Design Spec

Date: 2026-08-03
Status: Approved

## Problem

The skill radar chart on the department detail page derives its axes and
"ambition" values bottom-up from `ROLE_PROFILES` (`src/lib/skills/roles.ts`)
— a hardcoded, free-text mapping of role name → skill weights. A team's
ambition is whatever the sum of its members' role-profile weights happens to
be; nobody chooses it, and it isn't editable anywhere in the app. There is no
concept of a department deciding what skills matter to it, and no admin UI
for managing skills at all — the only way to change a skill name today is
editing `roles.ts` source.

## Solution

Skills become department-owned data. An admin defines, per department, the
fixed set of skills that apply to every team in that department, plus a
default required headcount per skill. Individual teams can't add or remove
skills from that set, but can override the required headcount per skill for
their own team. The radar's "current" side is unchanged — it stays a
headcount of team members carrying that skill tag.

## Data model

- `DepartmentEntity` gains `skills: string` — JSON array of
  `{ id, name, requiredHeadcount, sortOrder }`. `id` is a slug of `name`,
  generated on save. Missing/empty `skills` means "not configured yet."
- `TeamEntity` gains `skillOverrides: string` — sparse JSON map
  `{ [skillId]: number }`. Only skills where the team's required headcount
  differs from the department default get an entry.
- No new table. This matches the existing pattern of JSON-string fields on
  Table Storage entities (`StaffMemberEntity.tags`, `ScenarioEntity.parameters`).

## Backend logic

New module `src/lib/skills/departmentSkills.ts` replaces `ambitionForTeam`/
`coverageForTeam` in `roles.ts` for this purpose:

- `resolveTeamSkills(department, team)` → ordered list of
  `{ id, name, requiredHeadcount }`, where
  `requiredHeadcount = teamOverrides[id] ?? departmentDefault`.
- `coverageForTeam(resolvedSkills, members)` → axes are the department's
  fixed skill list (not a union of ambition/current keys). `current[skill]`
  = headcount of members whose `tags` include that skill name, matched by
  exact string equality (case-sensitive) — same mechanic and same matching
  rule as today's `currentForTeam`. A department skill name that doesn't
  exactly match any member tag simply shows 0 current, same as any other
  unmet skill.

`roles.ts` / `ROLE_PROFILES` is kept only for `deriveSkillsForRole` (seed
data tag generation). `ambitionForTeam` and the old `coverageForTeam` are
removed along with their call sites.

A team with no `departmentId` (Unassigned), or a department with no `skills`
configured, shows the existing empty-state pattern instead of a radar.

## API changes

- `POST` / `PATCH /api/departments[/id]`: accept and return `skills` array.
  Validate: non-empty trimmed name, unique names within the department,
  `requiredHeadcount` a non-negative integer.
- `PATCH /api/teams/[id]`: accept `skillOverrides` map. Validate every key is
  an `id` present in the parent department's current skill list — reject
  stray keys, which prevents orphaned overrides after a skill is removed.
- `GET /api/teams?departmentId=X`: internals swapped to use
  `resolveTeamSkills` + the new `coverageForTeam`. Response shape
  (`{ ...team, skills: { current, ambition, gap } }`) is unchanged, so
  `DepartmentTeamRow` / `SkillRadarChart` need no prop-shape changes.

## Admin UI — department skill set

Lives inside the existing department create/edit form (Settings →
Departments — `DepartmentsSection`), not a new page. Adds a "Skills"
section: rows of `[name input] [required headcount number] [remove ×]`,
plus "+ Add skill." Row order is saved as `sortOrder`.

Renaming a skill changes its `id`. Any team overrides keyed to the old `id`
become orphaned and are dropped on save — renaming is effectively
delete-and-add from the data's perspective. This is an accepted edge case,
not handled specially.

## Team-level override UI

On the department detail page, where `DepartmentTeamRow` already renders the
skill-gap panel per team: each skill's required-number becomes click-to-edit
(click → number input → save on blur/Enter). No new page, no modal.

No "differs from department default" visual indicator in v1 — the panel
stays visually identical to today, just editable. A "Reset to department
default" action is available per overridden skill.

## Seed script

`DEPARTMENTS` in `src/lib/db/seed.ts` gets a `skills` list per department,
derived from the union of skill names targeted by role profiles of that
department's seeded members. Default `requiredHeadcount` per skill = the
actual seeded headcount carrying that tag in that department, so the gap
starts at 0 (a clean, non-alarming baseline). Admins raise targets from
there to model growth ambitions.

## Testing

- Unit tests for `resolveTeamSkills` / `coverageForTeam`: override
  precedence, missing skills, empty department.
- E2E: add a department skill via Settings and see it appear as a radar
  axis on the department detail page; override a team's required headcount
  inline and see the gap update; reset to default.

## Out of scope

- Team-level custom skills (teams can only adjust required headcount, not
  add/remove skills)
- Per-member skill proficiency levels (current stays a flat headcount count)
- Visual "differs from default" indicator on overridden team values
- Migrating/backfilling the old role-profile-derived ambition data — the new
  model replaces it outright, seed data is regenerated instead

## Technical notes

- `ROLE_PROFILES` stays for seed tag generation only; its `skillTargets`
  weights are no longer used for ambition anywhere
- No new dependencies
