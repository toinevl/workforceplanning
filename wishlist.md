---
project: Workforce Planning
owner: toine
updated: 2026-08-03
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
- [x] (D) E2E test auth flow (login, session expiry, protected routes) +testing @me #28
      Playwright: login flow, 401 redirect, multi-user. Validate on staging slot.
      DONE — 15 auth E2E tests in tests/auth.spec.ts covering:
        - Unauthenticated: protected routes (/, /settings, /departments,
          /scenarios) redirect to /login; /api/* returns 307; /login accessible.
        - Authenticated: protected routes return 200; session API returns user
          info; user name/email/sign-out visible in nav.
        - Session expiry: clearing cookie redirects to /login; tampered cookie
          rejected.
      JWT session cookies minted via @auth/core/jwt.encode without hitting the
      real Entra ID IdP. Separate playwright.auth.config.ts runs a dev server
      with auth enforcement ON (no AUTH_DISABLED). CI runs both suites.
      Also fixed: CSP now allows 'unsafe-eval' in dev mode (React dev mode
      requires it for stack reconstruction); 127.0.0.1 added to allowedDevOrigins.
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
      DONE 2026-07-29 — alicante now runs on F1 Free (sku: Free, alwaysOn: false,
      state: Running). Verified after the move: /login 200 on first request,
      /api/teams and / still 307 to /login, so auth survived the migration.

      Two corrections worth recording:
        1. `az webapp update --plan` does not exist (CLI 2.88.0). Moving a site
           between plans is `--set serverFarmId=<plan resource id>`.
        2. The move then failed with Conflict 59602 "due to hosting constraints".
           Cause: a site can only move between plans in the same *webspace*, and a
           webspace is bound to the resource group owning the plan. alicante's
           webspace is rgWebsite-PolandCentralwebspace-Linux; an F1 plan created in
           rgWorkforcePlan lands in rgWorkforcePlan-PolandCentralwebspace-Linux and
           is unusable by this site. Resolved by creating wfp-plan-free in
           **rgWebsite**; the rgWorkforcePlan copy was deleted.

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

- [x] (C) Reconcile PR #15 with the middleware approach on main +security +testing @me #33
      PR #15 fixed the same bug via callbacks.authorized; main fixed it via a custom
      middleware body. Main's version closes the hole but drops AUTH_DISABLED and
      returns 307 to /api/* instead of 401 — fetchJSON (#27) expects 401, and a 307
      is followed to an HTML 200, so its redirect handling never fires.
      Worth keeping from #15: the auth-enforcement E2E suite that runs with auth ON.
      DONE — reconciled both approaches:
        - Middleware now returns 401 JSON for /api/* routes (from PR #15) so
          fetchJSON's 401 check fires correctly and redirects to /login.
        - Pages still get 307 redirect to /login (from main).
        - Removed dead standalone `authorized` export from auth.ts (PR #15
          identified it as a no-op — must be inside callbacks to work).
        - Removed unused NextResponse import from auth.ts.
        - E2E auth tests expanded: API routes now assert 401 JSON +
          {error: "Unauthorized"} body; POST /api/seed also tested as 401.

- [x] (B) Role profile system + skill radar for team ambition vs current coverage +feature @me #36
      Predefined role profiles with hard/soft skill targets. Teams page shows
      spider/radar diagram comparing current member skills vs ambition. Drives
      discussion in strategic workforce planning sessions. Foundation for AI-assisted
      FTE allocation and skill gap prediction.
      DONE:
        - 10 academic role profiles with skill targets (roles.ts)
        - SVG radar chart: current (green) vs ambition (blue), per-skill normalization,
          axis labels, empty-state handling (SkillRadarChart.tsx)
        - Department detail page: radar + top-skill-gap panel per team row
          (DepartmentTeamRow.tsx)
        - API: GET /api/teams?departmentId=X returns skills coverage per team
          (route.ts → coverageForTeam)
        - Seed data: skills auto-derived from role profiles (deriveSkillsForRole),
          so the radar shows real data after re-seed
      Cleanup: removed dead roleProfiles.ts (duplicate Bayesian-smoothing system,
      never wired), removed dead useTeamSkills hook (endpoint never existed).
      Fixed shape mismatch: API remaps coverageForTeam → {current,ambition,gap}.

- [x] (B) Live session workspace: drag-and-drop org board + decision capture +feature @me #37
      Interactive board where HR/product leads move staff between teams during
      planning sessions. Instant FTE and skill impact updates. Captures decisions
      (right-sizing, hiring, moves, attrition) directly into the plan.
      DONE:
        - TeamSkillBars: compact top-3 skill gap visualization per team column,
          updates live as members are dragged between teams
        - DecisionSummary panel: accumulated session metrics (moves, removes,
          FTE lost), per-team skill impact bars, decision log from audit trail
        - Accessible via "Decisions" button in TopNav on scenario board

- [x] (C) AI-assisted scenario generation and skill-gap predictions +ai +feature @me #38
      Use internet/intranet context and existing plan data to suggest FTE allocation
      scenarios. Predict skill gaps based on role profiles and ambition. Note:
      current data lives in PowerPoint/Excel tribal knowledge; structured data must
      exist first (#36, #37) before predictions are meaningful.
      DONE:
        - Analysis engine (src/lib/skills/analysis.ts): identifies surplus/deficit
          teams, critical skill gaps with severity, generates move suggestions
          matching members with surplus skills to deficit teams
        - API endpoint: GET /api/scenarios/[id]/analysis returns full analysis
        - AISuggestionsPanel: skill gap list with severity badges, suggested moves
          with one-click "Apply Move" button, surplus/deficit team breakdown
        - Auto-refreshes after each move (queryKey invalidation)
        - Accessible via "AI Analysis" button in TopNav on scenario board

- [x] (C) Recreate alicante in the rgWorkforcePlan webspace so Bicep can own it +infra @me #35
      infra/main.bicep creates its plan in rgWorkforcePlan, but the live site's
      webspace was bound to rgWebsite, so that plan could never host it (Conflict
      59602). Deploying the template as-is produced an unusable empty plan.
      DONE 2026-08-02 — site recreated in rgWorkforcePlan:
        - New F1 Linux plan `wfp-plan-free` created in rgWorkforcePlan
        - Old alicante deleted, recreated on the new plan (same name, new RG)
        - New default hostname: alicante.azurewebsites.net (cleaner — no
          random suffix). Old: alicante-eghjf7b0aadefpey.polandcentral-01...
        - Full config migrated: MI, Key Vault references (3 secrets), auth
          env vars, App Insights, all app settings
        - Entra ID redirect URI updated to new hostname
        - Deployed latest package (49fd78d), health check green:
          /login 200, /api/teams 401, / 307 (auth enforced)
        - Old wfp-plan-free in rgWebsite deleted (0 sites)
        - main.bicep warning comment removed, plan name corrected

- [x] (A) Golden Path restructure — org dashboard, department pivot, scoped scenarios +feature +ui @me #39
      The site dumps users onto a flat scenario list with no org context. Settings is
      a junk drawer. Pages are peers with no guided flow.
      Plan: docs/superpowers/plans/2026-08-02-golden-path.md
      Spec: docs/superpowers/specs/2026-08-02-golden-path-design.md
      PARTS:
        #39a — Add departmentId to Scenario entity + filter board state — DONE
        #39b — New Org Dashboard landing page — DONE
        #39c — Nav restructure (Org, Departments, Scenarios) — DONE
        #39d — Department detail: Plan Reorganization, team mgmt, active scenarios — DONE
        #39e — Move department CRUD from Settings to /departments — DONE
        #39f — Strip Settings to admin-only — DONE
      DONE 2026-08-02 — all 6 parts shipped in commits ac54970..05c3b65.

- [x] (B) Department-level skills — admin-owned skill sets replace role-derived ambition +feature +ui @me #40
      Skill radar axes/ambition currently come from ROLE_PROFILES (roles.ts) —
      implicit, unconfigurable, not tied to a department. Move to admin-managed
      skill sets per department, with per-team required-headcount overrides.
      Spec: docs/superpowers/specs/2026-08-03-department-skills-design.md
      PARTS:
        #40a — Data model: DepartmentEntity.skills + TeamEntity.skillOverrides (JSON fields) — DONE
        #40b — Backend: resolveTeamSkills + new coverageForTeam in departmentSkills.ts;
               remove ambitionForTeam usage from the coverage path — DONE
        #40c — API: department skills validation (POST/PATCH /api/departments),
               team skillOverrides validation (PATCH /api/teams/[id]) — DONE
        #40d — Admin UI: "Skills" section in department edit form (/departments) —
               add/remove skill rows, set default required headcount — DONE
               (no reorder UI built; sortOrder is derived from row order on save)
        #40e — Team-level override UI: click-to-edit required headcount inline on
               department detail page (DepartmentTeamRow), reset-to-default action — DONE
        #40f — Seed script: derive per-department skills + default requiredHeadcount
               from existing role-profile/member data (gap starts at 0) — DONE
        #40g — Tests: E2E/API-level coverage of resolveTeamSkills/coverageForTeam via
               tests/skills.spec.ts (override precedence, missing skills, empty
               department — no unit test runner exists in this repo, Playwright only)
               + E2E flow (add skill → radar axis appears → override team value →
               gap updates → reset) — DONE
      DONE 2026-08-03 — all 7 parts shipped across the 6-task department-skills plan
      (docs/superpowers/plans/2026-08-03-department-skills.md); final task (inline
      per-team override UI in DepartmentTeamRow, 25/25 E2E passing) committed 882408c.
      Final whole-branch review found 1 Critical (stale skillOverrides could permanently
      break inline editing with a silent 400 — nothing pruned overrides when a
      department's skill set changed) + 5 Important issues (no error surfaced on failed
      override saves, empty-state text pointed at the wrong page, colliding skill-id
      slugs could silently rebind an override to the wrong skill, spec doc had gone
      stale on 3 points, the two coexisting skill-gap surfaces — department page vs.
      scenario board — were unlabeled). One fix wave (commits 2466d4f..c905e16) resolved
      all 6; scoped re-review confirmed clean, 26/26 E2E passing. One Important finding
      (seed-derived skills unreachable from the Admin seed panel, since it always POSTs
      a custom teams array) was deliberately deferred as a design decision — see #41.

- [ ] (D) Decide whether custom-team seeds should derive real department skills +feature +seed @me #41
      Follow-up from #40's final review. buildDefaultDepartmentSkills() only populates
      skills when the seed uses the full default 27-team dataset (npm run dev:seed or a
      raw API call with no custom teams) — every seed initiated from the Admin page's
      SeedSetupPanel sends a custom teams array, so those departments always get
      skills: []. The empty state now correctly links to /departments so an admin can
      configure skills by hand, but most users seeding via the UI will only ever see
      the empty state first. Decide: derive skills for custom-team seeds too (needs a
      real team→department assignment for custom teams, which today all fall back to
      "Support Services" with no natural skill derivation), or leave the empty state as
      the intended first-run experience and consider this resolved as-is.
