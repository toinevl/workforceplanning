# Seed Scripting

How the Workforce Planning dev database is populated — the three-layer seed
pipeline, the request contract, and the default dataset.

## Architecture

Seeding flows through three layers. Each has a single responsibility:

```
scripts/seed-dev.ts          CLI wrapper — loads env, POSTs to the API
        ↓ POST /api/seed
src/app/api/seed/route.ts    API route — validates body, enforces limits
        ↓ runSeed(options)
src/lib/db/seed.ts           Core logic — writes departments, teams, members, scenarios
```

| Layer | File | Responsibility |
|-------|------|----------------|
| CLI | `scripts/seed-dev.ts` | Loads `dotenv`, sends a bare `POST` to `/api/seed`, prints the result. |
| API | `src/app/api/seed/route.ts` | Parses and validates the request body (team shapes, count limits), then calls `runSeed()`. |
| Logic | `src/lib/db/seed.ts` | Exports `runSeed(options?)`. Creates departments, teams, staff, and scenarios in Azure Table Storage. |

The CLI never imports the seed logic directly — it always goes through the HTTP
API. This keeps the code path identical whether seeding is triggered from the
terminal, a test, or another HTTP client.

## Running the seed locally

Prerequisites: Azurite must be running (the local Azure Storage emulator).

```bash
# Terminal 1 — start Azurite
npm run azurite

# Terminal 2 — start the dev server
npm run dev

# Seed the database (POSTs to http://localhost:3000/api/seed)
npm run dev:seed
```

`npm run dev:seed` is a thin alias for `npx tsx scripts/seed-dev.ts`. The script
reads `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`) to find the dev
server, then sends an empty-body POST — so it runs the **default seed** (no
`resetFirst`, no custom teams).

To reset all data first or seed a custom dataset, POST options directly (see
[Custom seeding via HTTP](#custom-seeding-via-http)).

## SeedOptions

Defined in `src/lib/types/seed.ts`:

```ts
export interface SeedOptions {
  membersPerTeam?: number;
  resetFirst?: boolean;
  teams?: SeedTeamConfig[];
}
```

| Option | Type | Default | Effect |
|--------|------|---------|--------|
| `membersPerTeam` | `number?` | unset (use full 56-member dataset) | When set and no custom `teams` are provided, trims each default team to the first N members. Ignored when `teams` is supplied (each team's `members` count governs instead). |
| `resetFirst` | `boolean?` | `false` | Deletes all existing rows from `teams`, `staffMembers`, `scenarios`, `departments`, `scenarioMemberStates`, `scenarioTeamDrivers`, and `scenarioSnapshots` before seeding. **Subject to a production safety guard** — see below. |
| `teams` | `SeedTeamConfig[]?` | unset (6 built-in teams) | Replaces the built-in team roster with a custom one. When provided, member records are **generated** (named from a first/last name pool) rather than drawn from the curated dataset. |

The API route applies two implicit rules on top:

- If `teams` is provided, `resetFirst` is forced to `true` (custom configs
  always wipe first — you can't merge custom teams onto existing data).
- If `resetFirst` is explicitly `true` in the request body, it is honored
  directly.

## SeedTeamConfig

Defined in `src/lib/types/seed.ts`:

```ts
export interface SeedTeamConfig {
  id?: string;
  key?: string;
  name: string;
  color: string;
  members: number;
  retirees: number;
  squad: number;
}
```

| Field | Required | Validation |
|-------|----------|------------|
| `name` | yes | Non-empty after trim. |
| `color` | yes | Must match `/^#[0-9a-fA-F]{6}$/` (hex color). |
| `members` | yes | Whole number, 1–200. |
| `retirees` | yes | Whole number, 0–`members`. |
| `squad` | yes | Whole number, 0–`members`. |
| `id` | no | Override the generated team ID. Falls back to `team-<slug>-<n>`. |
| `key` | no | Stable key used for the `baseTeamKey → teamId` lookup (see [teamId mapping](#baseteamkey--teamid-mapping)). Falls back to `id` or `custom-<index>`. |

When `teams` is omitted, the seed builds six default configs (Alpha–Foxtrot)
with built-in member/retiree/SQUAD counts.

The API enforces: at least 1 team, at most 24 teams. The route returns `400`
with a descriptive `error` string on any validation failure.

## Production safety guard

`resetFirst` is dangerous — it deletes every row in six tables. The seed logic
refuses to run a reset unless the connection string is provably local:

```ts
const connectionString = getConnectionString();
const isProduction =
  process.env.NODE_ENV === 'production' ||
  !connectionString.includes('UseDevelopmentStorage');
if (isProduction) {
  throw new Error(
    'Cannot reset seed on production connection string. ' +
    'This would delete all live teams data.'
  );
}
```

Two conditions must hold: `NODE_ENV` must not be `'production'`, **and** the
connection string must contain `UseDevelopmentStorage` (the Azurite marker).
If either fails, `runSeed` throws before any deletion occurs. This makes it
safe to call `resetFirst: true` from scripts and tests — it will no-op against
a real Azure account.

There is one escape hatch: if `E2E_ALLOW_EMULATOR_FALLBACK === 'true'` and
table setup fails, the API route silently disables both `resetFirst` and
custom `teams`, falling back to a non-destructive default seed. This exists for
end-to-end test environments where Azurite may not be fully ready.

## Default dataset

When called with no options (the `npm run dev:seed` path), `runSeed` writes a
curated, hand-authored dataset:

| Entity | Count | Details |
|--------|-------|---------|
| Departments | 3 + 1 sentinel | Engineering, Product, Operations (round-robin assigned to teams), plus an idempotent `Default` sentinel (`rowKey: 'default'`, `sortOrder: 99`) that catches unassigned teams. |
| Teams | 6 | Alpha, Bravo, Charlie, Delta, Echo, Foxtrot — each with a distinct hex color and `sortOrder`. Departments are assigned round-robin by index. |
| Staff | 56 | Hand-authored members with realistic names, roles, and start dates. |
| Scenarios | 3 | SQUAD Removal, Retirement Wave, Business Drivers — each with default parameters from `defaultParams(type)`. |

Characteristics of the 56 staff members:

- **SQUAD-tagged:** 4 members (one each in Alpha, Bravo, Charlie, Delta; Echo
  and Foxtrot have none). These carry `isSquad: true` and a `['SQUAD']` tag.
- **Retirement-eligible:** 8 members with `birthYear` ≤ 1965 (birth year + 65
  falls at or before 2030). `retirementEligibleYear` is computed as
  `min(birthYear + 65, startYear + 30)`.
- **Varied FTE:** mostly 1.0, with several 0.8 and 0.6 entries to exercise
  part-time FTE math in rollups.
- **Long service:** start dates range from 1989 to 2023, so tenure-based
  retirement eligibility (start year + 30) is meaningful for older hires.

## baseTeamKey → teamId mapping

Staff records reference their team by `baseTeamKey` (a stable string like
`'alpha'`), not by the team's row key. `runSeed` resolves this to a concrete
team ID at seed time by populating a lookup map with **three** keys per team:

```ts
teamIdMap[id] = id;                       // the team's own id
teamIdMap[team.key] = id;                 // the stable key (e.g. 'alpha')
teamIdMap[`custom-${index}`] = id;        // a positional fallback
```

This is why `baseTeamKey` in the seed data (e.g. `'alpha'`, `'bravo'`) matches
the `key` field on the default team configs. For custom teams without an
explicit `key`, the member generator falls back to `team.key ?? team.id ??
\`custom-${teamIndex}\`` — so the positional `custom-<index>` map entry is what
binds generated members to their team.

The resolved id is written to each staff member's `baseTeamId` column, which is
immutable thereafter (see [Data Flow](./architecture/data-flow.md) — scenarios
move members via a separate `scenarioMemberStates` overlay, never by mutating
`baseTeamId`).

## Custom seeding via HTTP

The `/api/seed` route accepts `POST` with a JSON body:

```jsonc
{
  "resetFirst": true,          // optional, default false (forced true if teams given)
  "membersPerTeam": 5,         // optional, ignored when teams is present
  "teams": [                   // optional, omits to use the built-in 6 teams
    {
      "name": "Platform",
      "color": "#6366f1",
      "members": 8,
      "retirees": 2,
      "squad": 1
    },
    {
      "name": "Mobile",
      "color": "#10b981",
      "members": 5,
      "retirees": 0,
      "squad": 0
    }
  ]
}
```

Equivalent curl:

```bash
curl -X POST http://localhost:3000/api/seed \
  -H 'Content-Type: application/json' \
  -d '{
    "resetFirst": true,
    "teams": [
      { "name": "Platform", "color": "#6366f1", "members": 8, "retirees": 2, "squad": 1 },
      { "name": "Mobile",   "color": "#10b981", "members": 5, "retirees": 0, "squad": 0 }
    ]
  }'
```

Response shape:

```jsonc
{
  "data": { "teams": 2, "members": 13, "scenarios": 3 },
  "fallback": false   // true only if E2E_ALLOW_EMULATOR_FALLBACK kicked in
}
```

When `teams` is provided, members are **generated** (not curated): names are
drawn from a first/last name pool, SQUAD members get the first N slots per
team, retirees get birth years in the 1960–1964 range, and FTE alternates 0.8
every seventh member. This is faster and more flexible than the hand-authored
dataset, but less realistic.

### Validation reference

The route returns `400` with `{ "error": "..." }` on any of:

- `teams` is present but not an array, or is empty, or exceeds 24 entries.
- Any team lacks a `name`, has a non-hex `color`, or has `members` outside 1–200.
- `retirees` or `squad` exceeds `members` for any team.
