# Authentication Milestone — Decision Framework

Objective: scope, analyze, and recommend an authentication approach for Workforce
Planning, closing ADR-004 (no auth, deferred to 2026-Q4) and backlog item #10.
This is a decision document — no implementation. Execution requires explicit
approval and a dedicated milestone.

**Status:** Planned (decision pending Q4 2026 review)
**Backlog:** #10 — (D) Authentication milestone (Entra ID / OIDC)
**ADR:** ADR-004 (No authentication — deferred to future milestone, review date 2026-Q4)

## Current State

- **All API routes are anonymous.** No auth headers are sent or validated
  anywhere in the codebase. This is an accepted risk (AR-01, review 2026-Q4).
- **18 API route files** exist under `src/app/api/` (full inventory below).
- **Single-tenant internal tool.** All users are trusted employees on the
  corporate network. No per-user or per-department access control (AR-02).
- **Input validation is enforced as defense-in-depth** even without auth:
  - UUID v4 regex on all ID path params (API routes + data layer `assertValidId`)
  - Hex color validation on department color (`/^#[0-9A-Fa-f]{6}$/`)
  - Non-empty string validation on required fields
- **No `middleware.ts` exists** — there is no centralized request interception
  point today. Auth would need to be added either via Next.js middleware or
  per-route checks.
- **Client-server pattern:** UI calls API routes via TanStack Query hooks
  (`src/lib/hooks/use*.ts`) through `fetchJSON` (`src/lib/utils/fetchJSON.ts`).
  All fetches are same-origin (no CORS, no external API surface).
- **Hosting:** Azure App Service (B1 Basic), single deployment, no API gateway
  or front-door layer in front of the app.

### API Route Inventory (18 files)

Every route below would need to be behind auth. Grouped by resource:

| Resource | Route | Methods | File |
|----------|-------|---------|------|
| Departments | `/api/departments` | GET, POST | `src/app/api/departments/route.ts` |
| Departments | `/api/departments/[id]` | GET, PATCH, DELETE | `src/app/api/departments/[id]/route.ts` |
| Teams | `/api/teams` | GET, POST | `src/app/api/teams/route.ts` |
| Teams | `/api/teams/[id]` | GET, PATCH, DELETE | `src/app/api/teams/[id]/route.ts` |
| Members | `/api/members` | GET | `src/app/api/members/route.ts` |
| Assignments | `/api/assignments` | POST | `src/app/api/assignments/route.ts` |
| Scenarios | `/api/scenarios` | GET, POST | `src/app/api/scenarios/route.ts` |
| Scenarios | `/api/scenarios/[id]` | GET, PATCH, DELETE | `src/app/api/scenarios/[id]/route.ts` |
| Scenarios | `/api/scenarios/[id]/board` | GET | `src/app/api/scenarios/[id]/board/route.ts` |
| Scenarios | `/api/scenarios/[id]/parameters` | GET, PATCH | `src/app/api/scenarios/[id]/parameters/route.ts` |
| Scenarios | `/api/scenarios/[id]/audit` | GET | `src/app/api/scenarios/[id]/audit/route.ts` |
| Scenarios | `/api/scenarios/[id]/reset` | POST | `src/app/api/scenarios/[id]/reset/route.ts` |
| Scenarios | `/api/scenarios/[id]/apply` | POST | `src/app/api/scenarios/[id]/apply/route.ts` |
| Snapshots | `/api/scenarios/[id]/snapshots` | GET, POST | `src/app/api/scenarios/[id]/snapshots/route.ts` |
| Snapshots | `/api/scenarios/[id]/snapshots/[snapId]` | GET, DELETE | `src/app/api/scenarios/[id]/snapshots/[snapId]/route.ts` |
| Snapshots | `/api/scenarios/[id]/snapshots/[snapId]/restore` | POST | `src/app/api/scenarios/[id]/snapshots/[snapId]/restore/route.ts` |
| Admin | `/api/admin/migrate-departments` | POST | `src/app/api/admin/migrate-departments/route.ts` |
| Seed | `/api/seed` | POST | `src/app/api/seed/route.ts` |

**Total: 18 route files, ~35 HTTP handlers (GET/POST/PATCH/DELETE).**

## Options Analysis

### Option 1: Entra ID (Azure AD) with NextAuth.js / Auth.js

**What it is:** Use [Auth.js](https://authjs.dev) (formerly NextAuth.js) with
the Azure AD / Microsoft Entra ID provider. Auth.js handles the OAuth 2.0 /
OIDC flow, session management, and provides server-side session access in
Next.js App Router (route handlers, server components, middleware).

**How it fits this project:**
- **Native Next.js integration:** Auth.js v5 has first-class App Router support.
  Session is available via `auth()` in server components and route handlers.
- **Entra ID as provider:** Users sign in with corporate credentials. App is
  registered as an Entra ID app (single-tenant). No separate user store.
- **Middleware protection:** Auth.js ships a middleware pattern
  (`src/middleware.ts`) that can gate all `/api/*` and page routes in one place.
  This avoids touching all 18 route files individually.
- **Session strategy:** JWT-based (stateless, stored in httpOnly cookie). No
  database session store needed — good fit since the app uses Table Storage,
  not a relational DB.

**Pros:**
- Industry-standard OIDC flow; no custom auth logic to maintain
- Session available in both server components and API routes
- Middleware-based protection covers all routes with one file
- Future role-based access control (RBAC) is straightforward via Entra ID
  app roles or group claims
- Well-documented Next.js + Entra ID patterns
- Closes AR-01 and AR-02 simultaneously (identity + future per-dept access)

**Cons:**
- New runtime dependencies: `next-auth` / `@auth/core`, `@auth/microsoft-entra-id`
- Requires Entra ID app registration in the tenant (admin portal work)
- Client-side session handling needs updating in all TanStack Query hooks
  (redirect to login on 401)
- More moving parts than a simple API key
- Auth.js v5 is relatively new; API still evolving

**Effort:** Medium-high (see estimate below)

---

### Option 2: OIDC Direct (no Auth.js)

**What it is:** Implement the OIDC authorization code flow directly using
`openid-client` or manual OAuth 2.0 calls, without the Auth.js abstraction
layer.

**How it fits this project:**
- Entra ID acts as the OIDC IdP. The app handles redirect, token exchange, and
  cookie-based session manually.
- Token validation happens in a custom `middleware.ts` or per-route helper.

**Pros:**
- No dependency on Auth.js (full control, no abstraction lock-in)
- Lighter dependency footprint
- Can be tailored exactly to the app's needs

**Cons:**
- **Significantly more custom code** — session management, token refresh, CSRF
  protection, cookie security all hand-rolled
- Higher risk of auth bugs (auth is security-critical; bespoke code is a risk)
- Must stay current with OIDC/OAuth security best practices manually
- No community-maintained middleware — all maintenance burden is internal
- Reinvents what Auth.js already provides for free

**Effort:** High (more code, more testing, more ongoing maintenance)

---

### Option 3: API Key (interim / pragmatic)

**What it is:** A static API key shared among all internal users. The app
checks for the key in an `Authorization` header or `x-api-key` header on every
request.

**How it fits this project:**
- A single `middleware.ts` checks the header against an env var
  (`APP_API_KEY`). No user identity, no login flow, no session.
- The key is distributed to internal users out-of-band (or injected via a
  gateway).

**Pros:**
- **Minimal effort** — one middleware file, one env var
- No Entra ID registration, no SDK dependencies
- Protects against anonymous external access immediately
- Transparent to the existing fetch pattern (headers added in `fetchJSON`)

**Cons:**
- **No user identity** — cannot do per-user audit, per-department access
  control (AR-02 stays open), or attribution
- **Key management burden:** rotation, distribution, revocation are manual
- Shared key = no individual accountability; if leaked, all access is
  compromised
- Does not satisfy the "real auth" goal — it's a stopgap
- Does not close AR-01 fully (still "no authentication," just "no anonymous
  access")

**Effort:** Low (1-2 days)

---

### Comparison Matrix

| Criterion | Entra ID + Auth.js | OIDC Direct | API Key |
|-----------|-------------------|------------|---------|
| User identity | ✅ Per-user | ✅ Per-user | ❌ Shared |
| Per-dept access (AR-02) | ✅ Future-ready | ✅ Future-ready | ❌ No |
| Implementation effort | Medium-high | High | Low |
| Ongoing maintenance | Low (library-maintained) | High (custom) | Low |
| Closes AR-01 fully | ✅ | ✅ | ⚠️ Partial |
| Audit trail enablement | ✅ | ✅ | ❌ |
| External dep weight | Medium | Low | None |
| Single-tenant simplicity | ✅ Entra-native | ✅ | ✅ |

## Recommended Approach

**Option 1: Entra ID + Auth.js (NextAuth v5)**

### Rationale

1. **Aligns with the best-practices doc** which recommends Azure AD auth for
   production apps (ADR-004 context).
2. **Single-tenant Entra ID is the natural identity provider** for an internal
   Azure-hosted tool. Users already have corporate accounts; no new credentials
   to manage.
3. **Auth.js middleware** protects all 18 route files and all pages with a
   single `src/middleware.ts` — no need to add auth checks to each route
   handler individually. This is the single biggest effort reducer.
4. **Session is JWT-based** (httpOnly cookie), which fits the stateless
   architecture. No database session table needed in Table Storage.
5. **Future-proofs for RBAC:** Entra ID app roles or group claims can later
   drive per-department access control, closing AR-02 without re-architecting.
6. **Closes AR-01 and AR-02** in one milestone rather than deferring AR-02
   further.
7. **Auth.js is the de facto Next.js auth standard** — community-maintained,
   well-documented, actively developed for App Router.

### When to use Option 3 (API Key) instead

If the Q4 2026 review concludes that the full Entra ID milestone is too much
scope for the immediate need, **API Key is a valid interim step.** It
eliminates anonymous access (the primary AR-01 risk) with minimal effort, and
the Entra ID milestone can follow later. The API key middleware would be
replaced by Auth.js middleware — no wasted work.

## Scope Estimate

### New files

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Auth.js middleware — gates `/api/*` and all pages except `/login` |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js route handler (or `src/auth.ts` + thin route) |
| `src/auth.ts` | Auth.js configuration (provider, callbacks, session strategy) |
| `src/app/login/page.tsx` | Login page (redirect to Entra ID) |
| `src/lib/auth/session.ts` | Helper to get current user in server components / route handlers |

### Modified files

| Area | Files | Change |
|------|-------|--------|
| API routes (all 18) | `src/app/api/**/route.ts` | **No code change** if using middleware-only protection. Optional: add `getUser()` calls for audit/attribution if needed. |
| TanStack Query hooks | `src/lib/hooks/use*.ts` (~8 files) | Handle 401 responses — redirect to login. Can be centralized in `fetchJSON.ts` via a response interceptor. |
| `fetchJSON.ts` | `src/lib/utils/fetchJSON.ts` | Add 401 handling — redirect to `/login` on auth failure. Cookies are sent automatically (same-origin), so no header changes needed. |
| `next.config.js` | Root | Potentially no change. Auth.js config is code-based, not config-based. |
| Layout / nav | `src/app/layout.tsx`, nav components | Add user info display, logout button (server component reading session). |
| `package.json` | Root | Add `next-auth` / `@auth/core`, `@auth/microsoft-entra-id` |

### UI changes

- **Login page:** Simple — "Sign in with Microsoft" button (or auto-redirect to
  Entra ID consent).
- **Logout:** Button in nav/header, calls sign-out, clears session cookie.
- **User display:** Show logged-in user name/email in nav (replaces or
  supplements the current anonymous state).
- **Protected layout:** Server component wrapper that redirects unauthenticated
  users to `/login`.
- **Loading states:** Auth check during SSR can cause a brief flash; handle
  with a loading skeleton or `redirect()` in middleware.

### TanStack Query integration

- **No changes to query keys or mutation logic.**
- The only change is in `fetchJSON.ts`: on a 401 response, call
  `redirect('/login')` or show a re-auth prompt. Since auth cookies are
  same-origin and sent automatically, no `Authorization` header is needed in
  fetch calls.
- If token refresh is needed (rare with cookie-based sessions), it's handled by
  Auth.js middleware transparently.

### Entra ID (Azure portal) setup

- Register a new application in Entra ID (single-tenant)
- Add redirect URI: `https://<app-url>/api/auth/callback/microsoft-entra-id`
- Add redirect URI for staging slot if slots are in use
- Create client secret, store in Key Vault (ties into the Key Vault migration —
  see `keyvault-migration-plan.md`)
- Optionally define app roles for future RBAC (e.g., "Admin", "Planner",
  "Viewer")

### Bicep / infra changes

- Store the Entra ID client ID and client secret as App Service app settings
  (or Key Vault references if the Key Vault migration is done first)
- New app settings: `AUTH_MICROSOFT_ENTRA_ID_ID`,
  `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_SECRET` (session signing key),
  `AUTH_URL` (app base URL)

## Timeline / Effort Estimate

Assumes one developer, sequential work, no parallelization.

| Phase | Effort | Description |
|-------|--------|-------------|
| Entra ID app registration | 0.5 day | Portal setup, redirect URIs, client secret, optional app roles |
| Auth.js integration | 2-3 days | Install deps, configure provider, session strategy, middleware, login page |
| UI changes | 1-2 days | Login page, logout, user display in nav, loading states |
| fetchJSON + TanStack Query 401 handling | 0.5 day | Centralized redirect on 401 |
| Testing | 1-2 days | E2E (Playwright) auth flow, session expiry, multi-user scenarios |
| Staging validation | 0.5 day | Deploy to staging, validate Entra ID redirect, consent flow |
| Documentation | 0.5 day | Update ADR-004 status, security-identity.md, README auth section |
| **Total** | **6-10 days** | **1.5-2 weeks elapsed** |

If Option 3 (API Key) is chosen as an interim:
| Phase | Effort |
|-------|--------|
| Middleware + env var | 0.5 day |
| fetchJSON header injection | 0.5 day |
| Testing | 0.5 day |
| **Total** | **1.5 days** |

## Open Questions for the User

1. **Timing:** Is the Q4 2026 review date firm, or should this be pulled
   forward / pushed back based on current risk appetite?
2. **Scope ambition:** Full Entra ID milestone now, or API Key interim now +
   Entra ID later? The API Key path is low-risk and eliminates anonymous
   access in days; Entra ID is the "real" solution but is 1.5-2 weeks.
3. **RBAC requirement:** Is per-department access control (AR-02) needed as
   part of this milestone, or is "any authenticated user can see everything"
   acceptable? This determines whether app roles / group claims need to be
   designed now.
4. **Entra ID admin access:** Do you have tenant admin access to register the
   app, or does this need to be requested from IT? This can gate the timeline.
5. **Staging slot dependency:** The Entra ID redirect URI needs to be
   registered for each environment. Backlog #1 notes the staging slot doesn't
   exist yet in Azure. Should this milestone gate on slot reconciliation, or
   proceed production-only?
6. **Audit trail:** Should authenticated mutations write to the existing
   `scenarioAuditEvents` table (and a new department/team audit table)? This
   would close AR-03 but adds scope.
7. **Key Vault dependency:** Should the Entra ID client secret be stored in
   Key Vault (after the Key Vault migration) or as a plain App Setting? If
   Key Vault is a prerequisite, the auth milestone should be sequenced after
   `keyvault-migration-plan.md` execution.
8. **Session strategy preference:** JWT cookie (stateless, recommended) vs
   database-backed sessions (would need a Table Storage session table)?

## Dependency Map

```
keyvault-migration-plan.md (optional prerequisite for secret storage)
    └→ auth-milestone-plan.md (Entra ID client secret in Key Vault)
            ├→ Entra ID app registration (portal)
            ├→ Auth.js integration (code)
            ├→ UI changes (login, logout, user display)
            └→ Testing + staging validation
```

If API Key interim is chosen, no dependencies — can start immediately.

## Decisions Required Before Execution

1. **Option selection:** Entra ID + Auth.js (recommended) vs API Key interim
   vs OIDC direct.
2. **RBAC scope:** Is per-department access control in-scope for this
   milestone or deferred?
3. **Sequencing:** Before or after Key Vault migration? Before or after
   staging slot reconciliation (backlog #1)?
4. **Session strategy:** JWT cookie (default) or database sessions?
5. **Audit trail:** Extend to department/team mutations in this milestone?
