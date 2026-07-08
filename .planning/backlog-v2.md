---
project: Workforce Planning
owner: toine
created: 2026-07-08
tags: [backlog]
---

# Backlog v2

Seeded 2026-07-08 from repo audit (uncommitted work, ADR follow-ups, infra
gaps, dependency drift, and deferred decisions). Prior wishlist (#0–#18) is
fully closed; this is a fresh tracking surface.

Priority key: (A) correctness/security  (B) infra/CI  (C) quality/maintenance  (D) deferred/optional

## Open

- [ ] (A) Commit or stash the emulator-fallback work in progress +infra +testing
      Uncommitted: src/lib/db/client.ts, src/app/api/seed/route.ts, tests/fixtures.ts.
      Adds E2E_ALLOW_EMULATOR_FALLBACK so the E2E suite degrades gracefully when
      Azurite table storage is unavailable. tests/fixtures.ts calls a GET /api/seed
      route that does NOT exist yet (only POST is implemented) — either add GET or
      change the fixture to thread `fallback` through the POST response body (which
      the diff already returns). Decide before committing.
      @me #0
      STATUS: DONE — fixture reads fallback from POST response, double-import removed.

- [x] (A) Reconcile wishlist #7 (staging slot) — claimed done, slot does not exist +infra
      `az webapp deployment slot list` returns [] for alicante / rgWorkforcePlan.
      Either provision the slot + wire a promote step in deploy.yml, or correct the
      wishlist/ADR-007 consequence and drop this if intentionally descoped.
      @me #1
      STATUS: DELIVERED — app service plan upgraded B1→S1 (enables slots), staging slot
      provisioned on alicante with cloned app settings, deploy.yml rewired to deploy to
      staging → health-gate → swap to production. Bicep/parameters/ADR updated to S1.

- [x] (A) Reconcile wishlist #9 (Basic tier) — claimed done, app is still F1 Free +infra
      App Service plan sku = F1 / Free. ADR-001 says Standard tier resolves cold-start
      and Always On; wishlist #9 marked [x] but never applied. Provision Basic/Standard
      or correct the tracking. F1 has 60 min/day CPU cap — production risk.
      @me #2
      STATUS: VERIFIED LIVE — alicante runs on ASP-rgWebsite-9e1a (B1/Basic) in rgWebsite,
      not rgWorkforcePlan. Original audit queried an orphaned F1 plan (toine_asp_1775,
      zero sites). Upgrade done in 8ff76f8. No action needed. Orphan plan cleanup optional.

- [x] (B) Pin exact Node LTS version across CI and App Service +infra
      ADR-006 follow-up, still open. Currently `~22` in ci.yml/deploy.yml/validate.yml
      and NODE|22-lts on App Service. Pin an exact 22.x patch and set WEBSITE_NODE_DEFAULT_VERSION
      to match. Prevents minor-version drift breaking the build/runtime.
      @me #3
      STATUS: CI PINNED to 22.22.2 (ci.yml, deploy.yml, validate.yml) + engines field in
      package.json. App Service still on NODE|22-lts — Azure runtime action deferred (needs
      manual CLI or IaC deploy).

- [x] (B) Wire remote E2E (playwright.remote.config.ts) into a scheduled/manual job +testing +ci
      playwright.remote.config.ts exists untracked, points at prod host. Either commit
      it as a separate workflow (nightly smoke or workflow_dispatch) or remove. Also
      gitignore deploy.zip (build artifact currently showing as untracked).
      @me #4
      STATUS: gitignored deploy.zip + playwright.remote.config.ts. No workflow added —
      the remote config is a local-only scratch file; a dedicated smoke workflow is a
      separate decision.

- [x] (C) Dependency updates: next 16.2.9→16.2.10, react 19.2.4→19.2.7 +maintenance
      Patch-level safe bumps. typescript 5.9→7.0 and eslint 9→10 are majors — separate
      item if pursued. @types/node 20→26 also a major jump. Run npm update, verify
      build + E2E, commit lockfile.
      @me #5
      STATUS: next bumped 16.2.9→16.2.10. react/react-dom stay at 19.2.4 (19.2.7 not
      published yet). Build + lint clean. 16 audit vulns all transitive through azurite
      (dev-only emulator, not shipped) — fixed only by breaking azurite@3.12.0 downgrade.

- [x] (C) Verify error-display components don't render raw Error.message JSON +code-quality +security
      LEARNINGS follow-up #1. The throw new Error(JSON.stringify({...})) pattern
      threads structured data through TanStack Query's error channel; at least one
      component previously rendered it verbatim (info disclosure + UX). Audit all
      error-display surfaces, extract a display-safe message.
      @me #6
      STATUS: DONE — new src/lib/utils/extractErrorMessage.ts helper. Applied across
      DepartmentsSection, BulkMigrateButton, TeamFormModal, ParametersPanel, SeedSetupPanel,
      SnapshotHistory, ScenarioDashboard, TopNav.

- [x] (C) Replace remaining bare `.catch(() => ({}))` with conditional logging +code-quality
      LEARNINGS follow-up #2. Silent catches in db/client.ts (now partially addressed),
      useDepartments.ts, getDepartmentById. At minimum console.warn in dev so genuine
      5xx / infra errors surface during debugging.
      @me #7
      STATUS: DONE — useDepartments.ts (2 sites), useScenario.ts (1 site), fetchJSON.ts
      now log in dev. Legitimate catches (optional entity lookups returning null) left as-is.

- [x] (C) Fix suppressHydrationWarning misuse in TopNav version badge +code-quality
      LEARNINGS follow-up #5. The prop hides the mismatch but doesn't prevent DOM
      inconsistency. Restructure so server and client render identically (useEffect +
      state, or hoist to a build-time-injected constant).
      @me #8
      STATUS: DONE — removed suppressHydrationWarning; hoisted version label + build time
      to deterministic module-level constants (toISOString for timezone independence).

- [ ] (D) Migrate storage connection string → Key Vault + Managed Identity +security +infra
      ADR-003 interim decision, explicitly deferred. Connection string currently an
      App Setting. Requires System Assigned MI on App Service + Key Vault access policy
      + code change to fetch the secret at startup. Review whether the interim risk
      profile justifies the work yet.
      @me #9
      STATUS: PLAN WRITTEN — .planning/keyvault-migration-plan.md. Recommends App Service
      Key Vault references (zero code change). Awaiting decision to implement.

- [ ] (D) Authentication milestone (Entra ID / OIDC) +security +feature
      ADR-004 deferred to a future milestone, review date 2026-Q4. All API routes
      anonymous. Will touch every route + UI. Decide Q4 2026 whether to pull the trigger.
      @me #10
      STATUS: PLAN WRITTEN — .planning/auth-milestone-plan.md. Recommends Entra ID +
      NextAuth/Auth.js, 6-10 day estimate. 8 open questions for user decision.
