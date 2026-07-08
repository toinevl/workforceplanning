---
project: Workforce Planning
owner: toine
updated: 2026-07-08
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

- [ ] (D) Create Key Vault Bicep module + provision vault with storage connection string secret +infra @me #19
      infra/modules/key-vault.bicep (RBAC auth, soft delete, purge protection).
      Secret: storage-connection-string from storage.bicep output.
- [ ] (D) Enable System Assigned Managed Identity on App Service (prod + staging slot) +infra @me #20
      identity: { type: 'SystemAssigned' } in app-service.bicep + app-service-slot.bicep.
      Output principalId for role assignment.
- [ ] (D) Grant App Service MI the Key Vault Secrets User role +security +infra @me #21
      roleAssignments in Bicep, scoped to the vault. Look up built-in role def ID at deploy time.
- [ ] (D) Swap AZURE_STORAGE_CONNECTION_STRING app setting → Key Vault reference +security @me #22
      @Microsoft.KeyVault(SecretUri=...) in app-service.bicep + slot. Zero code change (Approach A).
      Verify process.env still resolves. Test on staging first.
- [ ] (D) Rotate storage account key post-migration +security @me #23
      Single source of truth is now Key Vault. Rotate key → update secret → restart.

  ── Authentication milestone (ADR-004, plan: .planning/auth-milestone-plan.md) ──

- [ ] (D) Register Entra ID app (single-tenant) + redirect URIs + client secret +security @me #24
      Portal setup. Redirect URIs for prod + staging. Store secret in Key Vault (post-#22).
      Optionally define app roles (Admin/Planner/Viewer) for future RBAC.
- [ ] (D) Integrate Auth.js (NextAuth v5) with Entra ID provider +feature @me #25
      Install next-auth/@auth/core + @auth/microsoft-entra-id. Configure src/auth.ts.
      JWT cookie session strategy (stateless). Add src/middleware.ts gating /api/* + pages.
- [ ] (D) Add login page + logout + user display in nav +ui +feature @me #26
      src/app/login/page.tsx. Logout button in TopNav. Show user name/email from session.
- [ ] (D) Handle 401 in fetchJSON → redirect to login +code-quality @me #27
      Centralized in src/lib/utils/fetchJSON.ts. Cookies same-origin, no header changes needed.
- [ ] (D) E2E test auth flow (login, session expiry, protected routes) +testing @me #28
      Playwright: login flow, 401 redirect, multi-user. Validate on staging slot.
- [ ] (D) Update ADR-004 + security-identity.md + README auth section post-milestone +docs @me #29
