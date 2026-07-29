---
project: Workforce Planning
owner: toine
updated: 2026-07-29
tags: [wishlist]
---

# Wishlist

- [x] (A) Complete enterprise-departments feature work and merge +feature @me #0
- [x] (A) Hardening/validation for department detail page +feature +ui @me #0
- [x] (B) Revisit load/error/empty states across department surfaces +feature @me #1
- [x] (B) Capture remaining phase learnings and convert to actionable follow-ups +docs @me #2
- [x] (C) Add small quantitative preview for reorg impact before apply +feature @me #3
- [x] (C) Audit and tighten Azure Table Storage query paths +perf +security @me #4
- [x] (A) Validate Azure remote app failure and rebuild Azure services using learned best practices +infra +azure @me #5
- [x] (B) Add Application Insights / observability to App Service +infra @me #6
- [x] (B) Add staging slot and promote pipeline for deployments +infra @me #7
- [x] (B) Remove long-lived SAS / secret leakage risk from deploy pipeline +security +infra @me #8
- [x] (C) Migrate to App Service Basic tier for production runtime +infra @me #9
- [x] (D) Review and incorporate Azure best-practices doc into architecture decisions +docs +infra @me #10
- [x] (D) Add mapper exhaustiveness type check (entity→domain boundary) +code-quality @me #11
- [x] (D) Add Content-Security-Policy header (restrict style-src) +security @me #12
- [x] (D) Document seed/scripting standardization +docs @me #13
- [x] (D) Create Architecture Decision Records (ADR) +docs @me #14
- [x] (C) Bump Bicep API versions (2023-01-01 → 2025-03-01) for Web/sites, serverFarms, Storage +infra @me #15
- [x] (D) Run npm audit fix to resolve advisories (fast-xml-builder high; @babel/core already clean) +security @me #16
- [x] (D) Run npm update to pull patch-level dependency updates +maintenance @me #17
- [x] (D) Integrate Playwright E2E testing into CI +testing @me #18

  ── Key Vault + Managed Identity migration (ADR-003, plan: .planning/keyvault-migration-plan.md) ──

- [x] (D) Create Key Vault Bicep module + provision vault with storage connection string secret +infra @me #19
      infra/modules/key-vault.bicep (RBAC auth, soft delete, purge protection).
      Secret: storage-connection-string from storage.bicep output.
      DONE — module created, vault kv-wfp-prod provisioned in rgWorkforcePlan.
- [x] (D) Enable System Assigned Managed Identity on App Service (prod + staging slot) +infra @me #20
      identity: { type: 'SystemAssigned' } in app-service.bicep + app-service-slot.bicep.
      Output principalId for role assignment.
      DONE — MI enabled via CLI on alicante + slot. Bicep updated with identity + principalId output.
- [x] (D) Grant App Service MI the Key Vault Secrets User role +security +infra @me #21
      roleAssignments in Bicep, scoped to the vault. Look up built-in role def ID at deploy time.
      DONE — role granted via CLI (def ID 4633458b-17de-408a-b874-0445c86b69e6). Bicep module has it.
- [x] (D) Swap AZURE_STORAGE_CONNECTION_STRING app setting → Key Vault reference +security @me #22
      @Microsoft.KeyVault(SecretUri=...) in app-service.bicep + slot. Zero code change (Approach A).
      Verify process.env still resolves. Test on staging first.
      DONE — prod + staging swapped to KV reference. Prod verified healthy (200). GitHub secret also updated.
- [x] (D) Rotate storage account key post-migration +security @me #23
      Single source of truth is now Key Vault. Rotate key → update secret → restart.
      DONE — key1 rotated, KV secret updated, GitHub secret updated, prod verified healthy.

  ── Authentication milestone (ADR-004, plan: .planning/auth-milestone-plan.md) ──

- [x] (D) Register Entra ID app (single-tenant) + redirect URIs + client secret +security @me #24
     DONE — app "WorkforcePlanning" (appId: e1342f44-f371-4e46-b203-bca098fd9e77)
     already existed. Added prod + staging redirect URIs,
     created client secret (expires 2028-07-29) stored in Key Vault
     as `auth-entra-client-secret` (kv-wfp-prod).
     Env vars set on prod + staging via Key Vault references:
       AUTH_MICROSOFT_ENTRA_ID_ID, _SECRET, _ISSUER, AUTH_SECRET, AUTH_URL.
     Auth.ts and middleware.ts patched to enforce auth. App runs live
     on https://alicante-eghjf7b0aadefpey.polandcentral-01.azurewebsites.net
- [x] (D) Integrate Auth.js (NextAuth v5) with Entra ID provider +feature @me #25
      Install next-auth/@auth/core + @auth/microsoft-entra-id. Configure src/auth.ts.
      JWT cookie session strategy (stateless). Add src/middleware.ts gating /api/* + pages.
      DONE — src/auth.ts, src/middleware.ts, src/app/api/auth/[...nextauth]/route.ts.
      Auth gracefully disabled when AUTH_SECRET not set (open access until #24 is done).
- [x] (D) Add login page + logout + user display in nav +ui +feature @me #26
      src/app/login/page.tsx. Logout button in TopNav. Show user name/email from session.
      DONE — login page, UserMenu component (src/components/layout/UserMenu.tsx).
- [x] (D) Handle 401 in fetchJSON → redirect to login +code-quality @me #27
      Centralized in src/lib/utils/fetchJSON.ts. Cookies same-origin, no header changes needed.
      DONE — 401 redirect added to fetchJSON.ts.
- [ ] (D) E2E test auth flow (login, session expiry, protected routes) +testing @me #28
      Playwright: login flow, 401 redirect, multi-user. Validate on staging slot.
      BLOCKED — needs #24 (Entra ID app registration) to test real auth flow.
- [x] (D) Update ADR-004 + security-identity.md + README auth section post-milestone +docs @me #29
      DONE — ADR-004 superseded, security-identity.md updated.

  ── Azure cost elimination (analysis: 2026-07-29, two S1 plans found for one app) ──

  Finding: EUR 52.98/month across two Standard plans for a single running app.
    workforceplanning-plan-prod  S1  EUR 24.66/mo  0 sites (empty, created by Bicep)
    ASP-rgWebsite-9e1a           S1  EUR 28.32/mo  alicante + invoicesnap (Stopped)
  Standard tier is required only by deployment slots. Nothing else needs it.

- [x] (A) BLOCKER: restore AUTH_DISABLED so CI passes and deploys unblock +infra +ci @me #30
      Auth enforcement moved into a custom middleware body (a6153f8) that does not
      check AUTH_DISABLED — only the now-unused `authorized` export in auth.ts does.
      CI E2E therefore 307s on every request, CI fails, and deploy.yml (workflow_run
      on CI success) is SKIPPED. Production is still serving /api/* to anonymous
      callers because the fix cannot reach it. Must land before #31/#32.
      DONE — AUTH_DISABLED check moved into src/middleware.ts where enforcement
      actually runs. Verified locally both ways: with the flag /api/* returns 200
      (CI can run), without it /api/* and pages 307 to /login while /login stays
      200 (security fix intact).
      SHIPPED 2026-07-29 — PR #16 merged, CI + E2E green, deploy succeeded.
      Production verified anonymous: /api/{teams,members,scenarios,assignments,seed}
      all 307 -> /login; /login 200. The exposure is closed.

- [x] (A) Level 0: delete empty S1 plan workforceplanning-plan-prod +infra +cost @me #31
      0 sites, EUR 24.66/mo, entire spend of rgWorkforcePlan. alicante does not run
      on it — it runs on ASP-rgWebsite-9e1a in rgWebsite. Deleting is zero-impact.
      infra/main.bicep recreates it on next deployment, so the Bicep must change too.
      DONE — plan deleted 2026-07-29 after confirming 0 hosted sites. alicante
      verified Running and /login 200 immediately after. Bicep changed in the same
      branch (F1 default + reserved:true + no slot) so it cannot be recreated as S1.
      rgWorkforcePlan now holds only toine_asp_1775 (F1, 0 sites, Canada Central —
      wrong region to reuse) and ASP-rgWorkforcePlan-846d (FC1, the dead Function App).

- [~] (B) Level 1: move alicante to F1 Free and retire both S1 plans +infra +cost @me #32
      F1 Linux confirmed available in Poland Central; app is app,linux NODE|22-lts.
      Costs: loses deployment slots (Free/Basic support none), loses Always On
      (cold start after ~20 min idle), 60 CPU-min/day quota.
      Requires deploy.yml rework: staging-deploy -> health-check -> swap becomes
      deploy-direct + health-check + rollback-on-failure.
      Ends at EUR 0/mo for hosting.

      DONE:
        - deploy.yml reworked: versioned packages + capture/restore rollback (387644e)
        - Bicep targets F1 + reserved:true, slot module no longer instantiated (9bd1103)
        - F1 Linux plan `wfp-plan-free` created in rgWorkforcePlan / Poland Central
      REMAINING (3 live commands, blocked here by tool permissions):
        az webapp deployment slot delete -g rgWorkforcePlan -n alicante --slot staging
        az webapp config set -g rgWorkforcePlan -n alicante --always-on false
        az webapp update -g rgWorkforcePlan -n alicante --plan wfp-plan-free
      Order matters: Free rejects a site that still has slots or Always On.
      Rollback: `az webapp update -g rgWorkforcePlan -n alicante --plan ASP-rgWebsite-9e1a`
      (pre-change state captured: plan ASP-rgWebsite-9e1a, alwaysOn true, Running).

- [x] (C) Decide fate of ASP-rgWebsite-9e1a after alicante moves off +infra +cost @me #34
      EUR 28.32/mo. Once alicante leaves, its only remaining site is `invoicesnap`
      (rgWebsite, currently Stopped) — a different project, so this is not mine to
      delete. Options: downgrade the plan to F1 (keeps invoicesnap, most of the
      saving), move invoicesnap to wfp-plan-free, or delete if invoicesnap is dead.
      DONE 2026-07-29 — owner confirmed invoicesnap was disposable. Pre-delete check
      found it Stopped since 2026-07-21, no deployment source, no app settings, no
      slots, default hostname only, so nothing recoverable was lost. Deleting the
      last app on a plan deletes the plan too, so ASP-rgWebsite-9e1a went with it.
      alicante verified afterwards: Free sku, Running, /login 200, /api/teams 307.

- [ ] (C) Reconcile PR #15 with the middleware approach on main +security +testing @me #33
      PR #15 fixed the same bug via callbacks.authorized; main fixed it via a custom
      middleware body. Main's version closes the hole but drops AUTH_DISABLED and
      returns 307 to /api/* instead of 401 — fetchJSON (#27) expects 401, and a 307
      is followed to an HTML 200, so its redirect handling never fires.
      Worth keeping from #15: the auth-enforcement E2E suite that runs with auth ON.
