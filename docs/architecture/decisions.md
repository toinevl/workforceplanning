# Architecture Decision Records

ADR-style decisions for Workforce Planning, incorporating recommendations from
the Azure SWA + Next.js + Table Storage best-practices doc and the drone
findings. Each record follows: Context → Decision → Status.

---

## ADR-001: Azure App Service (not Static Web Apps) for hosting

**Date:** 2026-06-29
**Status:** Accepted (active)

### Context
The best-practices doc (`docs/azure-swa-nextjs-table-storage-best-practices.md`)
describes two Azure hosting models for Next.js apps: SWA Hybrid (managed
Functions) and Static Export + Linked Backend. The project was initially built
on Azure App Service with `output: 'standalone'` and `WEBSITE_RUN_FROM_PACKAGE`.

### Decision
Stay on Azure App Service. The app uses Next.js App Router with server
components and API route handlers — both require a Node.js runtime, which App
Service provides natively. SWA Hybrid mode (managed Functions) has known
limitations: 250MB size cap, cold-start issues on Free tier, and Node.js
version lag. App Service gives full control over runtime, startup command, and
scaling.

### Consequences
- `output: 'standalone'` stays in `next.config.js`
- Deploy via zip publish (`az webapp deploy`), not SWA build pipeline
- No `api_location` / `output_location` config needed
- Standard tier (#9, now S1) resolves cold-start and Always On limitations,
  and enables deployment slots (#7 — staging slot now provisioned and wired
  into deploy.yml with a health-gated swap)
- If SWA Hybrid is revisited later, the app would need migration to managed
  Functions and the SWA build pipeline

---

## ADR-002: Azure Table Storage as sole persistence layer

**Date:** 2026-06-29
**Status:** Accepted (active)

### Context
The best-practices doc recommends Azure Table Storage for NoSQL workloads
with partition-key-based queries. The project has 8 tables with flat partition
keys (`'team'`, `'member'`, `'department'`, `'scenario'`, and `scenarioId`
for scenario-scoped tables).

### Decision
Keep Table Storage as the sole persistence layer. No SQL, no Cosmos DB.
Partition key design is sufficient for the current scale (single-org, small
dataset). All queries are partition scans with in-memory grouping.

### Consequences
- No foreign keys — referential integrity in app layer (DELETE dept checks
  teams first, sentinel-guarded migrations)
- Table naming stays lowercase plural (`teams`, `staffMembers`, etc.) — the
  doc recommends PascalCase singular, but the project's convention is
  established and changing it would be a breaking data migration
- `@azure/data-tables` retry/backoff configured: local 1 retry/250ms,
  production 3 retries/1s with 64s max (exponential backoff)
- Connection string uses HTTPS in production (`DefaultEndpointsProtocol=https`)
- `allowBlobPublicAccess: false`, `minimumTlsVersion: TLS1_2`,
  `supportsHttpsTrafficOnly: true` enforced in Bicep

---

## ADR-003: Connection string as App Setting (not Key Vault + MI)

**Date:** 2026-06-29
**Status:** Accepted (interim — upgrade planned via #5)

### Context
The best-practices doc recommends Key Vault + Managed Identity over plaintext
connection strings. The project currently stores `AZURE_STORAGE_CONNECTION_STRING`
as an App Service application setting. The 10-year SAS token path has been
removed (#8).

### Decision
Keep connection string as App Setting for now. Migrate to Key Vault + Managed
Identity as part of the Azure rebuild (#5). This is an interim decision — the
connection string is not logged, not shell-exported in CI, and exists only as
an app setting.

### Consequences
- CI deploy workflow no longer parses or echoes the connection string
- Storage key is not exposed in deploy logs
- Upgrade path to Key Vault is documented in `.planning/azure-rebuild-plan.md`
- Key Vault Bicep module is planned but not yet deployed

---

## ADR-004: No authentication (single-tenant internal tool)

**Date:** 2026-06-29
**Status:** Superseded — auth implemented via Entra ID + Auth.js (2026-07-08)

### Context
The best-practices doc recommends Azure AD auth for production apps. The
project is a single-tenant internal tool used by trusted employees. Adding
auth is a scope expansion that would touch every API route and the UI.

### Decision
~~Defer authentication. All API routes are anonymous.~~

**Superseded:** Authentication was implemented in wishlist items #25–#29
using Auth.js (NextAuth v5) with the Microsoft Entra ID (single-tenant)
OIDC provider. The session strategy is JWT — the signed session cookie is
stateless (no database session store). Auth.js middleware protects all
routes except `/login`, `/api/auth/*`, and static assets.

### Original consequences (pre-auth)
- No auth headers sent or validated
- No per-department access control (AR-02)
- All input validation happens at API route + data layer
- Auth will require a coordinated milestone when added (Entra ID/OIDC is the
  most likely path, consistent with the best-practices doc's recommendation)

### Current state (post-auth)
- `src/auth.ts` — Auth.js config with Entra ID provider, JWT callbacks
- `src/middleware.ts` — route protection (redirects to `/login` when
  unauthenticated)
- `src/app/login/page.tsx` — "Sign in with Microsoft" page
- `src/components/layout/UserMenu.tsx` — user display + sign-out in TopNav
- `src/lib/auth/session.ts` — `getSession()` helper for server components
- `src/lib/utils/fetchJSON.ts` — redirects to `/login` on 401 responses
- `.env.local.example` — documents all required auth env vars
- CSP updated to allow the Entra ID OIDC flow

---

## ADR-005: `output: 'standalone'` for production builds

**Date:** 2026-06-29
**Status:** Accepted (active)

### Context
The best-practices doc describes standalone output as a size optimization for
apps approaching platform limits. The project uses it for all deploys.

### Decision
Keep `output: 'standalone'`. It produces a self-contained Node.js server
bundle (`.next/standalone/`) that runs via `node server.js` on App Service.
This is the most predictable deploy path: zip the standalone output, deploy,
restart.

### Consequences
- Deploy artifact is a zip of `.next/standalone/` + `public/` + `.next/static/`
- Startup command: `node server.js`
- No image optimization server needed (no `next/image` usage currently)
- If image optimization is added later, `sharp` must be installed or
  `images: { unoptimized: true }` set

---

## ADR-006: Node.js version strategy

**Date:** 2026-06-29
**Status:** Accepted — pinning needed (tracked as follow-up)

### Context
The best-practices doc recommends exact Node.js LTS pinning. The project
currently uses `~22` (approximate) in CI and App Service runtime.

### Decision
Pin exact Node.js 22 LTS version across CI (`ci.yml`), deploy workflow, and
App Service `nodeVersion` setting. This prevents surprise breakage from
minor-version drift.

### Consequences
- Drone finding: Node LTS pinning recommended for #5/#9
- Action item: update `package.json` `engines.node` and CI `setup-node` to
  exact version (e.g., `22.x.x`)
- App Service `WEBSITE_NODE_DEFAULT_VERSION` or Flex Consumption `nodeVersion`
  must match

---

## ADR-007: GitHub Actions OIDC (no long-lived secrets in CI)

**Date:** 2026-06-29
**Status:** Accepted (active, #8 done)

### Context
The best-practices doc recommends OIDC federated credentials over long-lived
service principals. The project previously used a 10-year SAS token for
blob Run-From-Package deployment.

### Decision
Use GitHub Actions OIDC federated auth for all Azure interactions. Deploy via
`az webapp deploy` (zip publish). No SAS token generation in CI. Connection
string is set as an App Setting separately, not through CI shell.

### Consequences
- Deploy logs contain no storage account keys
- `az storage blob generate-sas` removed from workflow
- Federated credentials configured in Azure AD for the GitHub repo
- Rollback: revert to prior SHA; `WEBSITE_RUN_FROM_PACKAGE` can be cleared

---

## Summary: Recommendations status

| Best-practices recommendation | Project status | ADR |
|-------------------------------|---------------|-----|
| Use Hybrid or Static Export mode | Not applicable — App Service | ADR-001 |
| Table Storage with HTTPS, TLS 1.2, no public blob | ✅ Enforced in Bicep | ADR-002 |
| Retry/backoff on data-tables calls | ✅ Configured in `db/client.ts` | ADR-002 |
| Key Vault + Managed Identity | Planned (#5) | ADR-003 |
| Azure AD auth | ✅ Implemented (Entra ID + Auth.js) | ADR-004 |
| `output: 'standalone'` | ✅ Active | ADR-005 |
| Exact Node LTS pinning | Follow-up needed | ADR-006 |
| OIDC for CI/CD | ✅ Done (#8) | ADR-007 |
| PascalCase singular table names | Rejected — convention established | ADR-002 |
| Azurite for local parity | ✅ Active | — |
| No direct browser → Table Storage calls | ✅ All through API routes | — |
