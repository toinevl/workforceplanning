# Architecture

## Overview

Workforce Planning is a single-page Next.js application for HR and managers to
model team reorganizations — create scenarios, drag members between teams,
compare snapshots, and apply changes — backed by Azure Table Storage.

A visual diagram is available as an editable Excalidraw file:
**[architecture.excalidraw](./architecture.excalidraw)**

> **How to view:** Open [excalidraw.com](https://excalidraw.com), then menu
> (top-left hamburger) → Open → select the `.excalidraw` file. Every element is
> fully editable.

## Layered Architecture

The application follows five layers, from top to bottom:

### 1. Browser — Client Side

| Concern | Technology |
|---------|-----------|
| Rendering | React 19 pages & components (App Router) |
| Server state | TanStack Query (cache, hooks) |
| UI state | Zustand store (panels, selection) |
| Drag & drop | dnd-kit (team member reordering) |
| Styling | Tailwind CSS v4, clsx, tailwind-merge |
| Icons / feedback | lucide-react, sonner (toasts) |

Client components communicate with the server exclusively via `fetch` calls to
the `/api/*` route handlers. Only pages that need event handlers, hooks, or
browser APIs opt into `'use client'`.

### 2. Next.js App Router (Server)

Two sub-layers live here:

**Server Components (RSC)** — the page tree, rendered on the server by default:

- `/` — redirects to `/scenarios`
- `/scenarios` — scenario list
- `/scenarios/[id]` — the board (client component): drag members, apply logic,
  view snapshots and audit trail
- `/departments` — listing with rollup FTE/headcount stats
- `/departments/[deptId]` — read-only department detail page
- `/settings` — department and team CRUD

**API Route Handlers** — all data access goes through Next.js route handlers
under `src/app/api/`:

| Endpoint group | Operations |
|---------------|-----------|
| `/api/scenarios` | CRUD, board state, apply logic, parameters, snapshots, audit |
| `/api/departments` | CRUD + rollup stats (single-pass computation) |
| `/api/teams` | CRUD + department filter |
| `/api/members` | Staff member records |
| `/api/seed` | Local dev sample data |
| `/api/admin/migrate-departments` | Idempotent bulk-assign to default dept |

### 3. Data Access Layer (`src/lib`)

- **`api/` modules** — domain logic per entity: `departments.ts`, `teams.ts`,
  `scenarios.ts`, `members.ts`. Input validation (UUID format, hex color) and
  rollup computation live here.
- **`db/` layer** — `client.ts` (TableClient factory), `tables.ts` (entity
  types & table name constants), `mappers.ts` (entity ↔ domain transforms).

### 4. Azure Table Storage

The sole persistence layer. No SQL, no foreign keys — referential integrity is
enforced in the application layer. Partition key design is critical for query
performance.

| Table | Partition key | Purpose |
|-------|--------------|---------|
| `teams` | `'team'` | Team records (carry optional `departmentId`) |
| `staffMembers` | `'member'` | Staff member baseline records |
| `departments` | `'department'` | Department records (name, color, head) |
| `scenarios` | `'scenario'` | Scenario definitions & parameters |
| `scenarioMemberStates` | `scenarioId` | Per-scenario member team assignments |
| `scenarioTeamDrivers` | `scenarioId` | Per-scenario team business drivers |
| `scenarioSnapshots` | `scenarioId` | Named board state snapshots |
| `scenarioAuditEvents` | `scenarioId` | Audit trail events |

Local development uses **Azurite** (Azure Storage emulator) with
`UseDevelopmentStorage=true`.

### 5. Deployment & CI/CD

- **CI** — GitHub Actions runs lint, type-check, and build on every push/PR
  to `main` (`.github/workflows/ci.yml`).
- **Runtime** — Azure App Service running Node.js in standalone output mode
  (`output: 'standalone'` in `next.config.js`).

## Key Design Decisions

- **Server components by default** — `'use client'` only where event handlers,
  hooks, or browser APIs are needed.
- **Cross-department scenarios** — scenarios operate at the org level, not
  per-department. Departments are an organizational grouping layer.
- **Single-pass rollups** — department and team FTE/headcount stats are computed
  in one pass over three parallel partition scans (departments, teams, members),
  not per-entity queries.
- **Optional `departmentId`** — existing teams migrate lazily; teams without a
  department appear in an "Unassigned" bucket on the listing page.
- **Strict TypeScript** — `no` `any`, `@/*` alias maps to `src/*`.
