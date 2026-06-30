# Communication Flow

How the components of Workforce Planning communicate — protocols, directions,
and the boundaries between layers.

## Layer Overview

```
Browser (Client)
    ↕  HTTP / JSON (fetch)
Next.js App Router (Server)
    ↕  function calls (in-process)
Data Access Layer (src/lib)
    ↕  HTTPS / OData (@azure/data-tables)
Azure Table Storage
```

Communication is strictly top-to-bottom: no layer calls upward. The browser
never touches Table Storage directly; the data access layer never returns raw
entities (only mapped domain types).

## 1. Browser → Next.js Server

**Protocol:** HTTP/HTTPS, JSON request/response bodies.

All client-to-server communication goes through `fetch()` calls to `/api/*`
route handlers. There is no WebSocket, no server actions, no tRPC.

- **GET requests** — TanStack Query wraps every fetch with caching, retry, and
  background refetch. Query keys are entity-scoped
  (e.g. `['departments']`, `['boardState', scenarioId]`).
- **Mutations** — TanStack Query `useMutation` with `onSuccess` invalidation
  of affected query keys. The mutation hook handles optimistic updates where
  applicable.
- **Error surfacing** — `fetchJSON` (`src/lib/utils/fetchJSON.ts`) reads the
  error body before throwing. API errors carry a structured `{ error: string }`
  body; the UI displays `json.error` or a fallback `"STATUS statusText"`.

No authentication headers are sent — the app is single-tenant with no auth
(see [Security & Identity](./security-identity.md)).

## 2. Client-side state boundaries

| State type | Owner | Examples |
|-----------|-------|---------|
| Server state | TanStack Query | Teams, departments, scenarios, board state, audit events |
| UI state | Zustand (`workforceStore`) | Panel open/close, selected member ID |
| Drag state | dnd-kit (`useDragDrop`) | Active drag, sensor state |

Zustand never duplicates server state — it only holds ephemeral UI toggles.
When a panel needs server data, it reads from TanStack Query, not Zustand.

## 3. Next.js Server internals

**Server Components ↔ API Routes:** There is no direct call path. Server
components fetch data by importing data-access functions from `src/lib/api/`,
not by calling their own API routes (no self-fetching). API routes and server
components share the same `src/lib/api/` modules — the route handlers are thin
HTTP wrappers around the same functions a server component calls directly.

**API route → data layer:** Synchronous in-process function calls. Route
handlers in `src/app/api/` import from `src/lib/api/` (domain logic) which
imports from `src/lib/db/` (storage client). No inter-process communication.

## 4. Data Access Layer → Azure Table Storage

**Protocol:** HTTPS, OData v4 query protocol via `@azure/data-tables`.

- **Connection:** `TableClient.fromConnectionString()` using
  `AZURE_STORAGE_CONNECTION_STRING`. Locally this is
  `UseDevelopmentStorage=true` (Azurite); in production it's a real connection
  string with account key.
- **Queries:** Partition scans (`listEntities` with optional OData filter).
  No cross-partition joins — all joins are done in-memory in the data layer.
- **Retry policy:** Local dev: 1 retry, 250ms delay. Production: 3 retries,
  1s initial, 64s max (exponential backoff).

## 5. CI/CD → Azure

| Direction | Channel | What flows |
|-----------|---------|-----------|
| GitHub Actions → Azure App Service | OIDC federated auth → `az webapp deploy` | Built standalone zip |
| GitHub Actions → App Service config | `az webapp config appsettings set` | Storage connection string, runtime settings |
| App Service → Table Storage | HTTPS connection string | All data queries |

CI never touches Table Storage directly — it only sets the connection string
as an app setting. The running app uses it at runtime.

## Communication anti-patterns avoided

- **No self-fetching:** Server components never call their own `/api` routes.
- **No server state in Zustand:** Prevents stale-cache bugs.
- **No raw entity leakage:** `mappers.ts` transforms every entity to a domain
  type before it crosses a layer boundary.
- **No connection pooling concerns:** TableClient is stateless; a new client
  is created per operation via `getTableClient()`.
