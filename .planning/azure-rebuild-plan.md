# Workforce Planning — Azure Rebuild Plan

Objective: restore reliable remote operation by rebuilding the Azure deployment to production-ready standards, with the project `wishlist.md` as the single source of truth for progress, complexity, and dependencies. No live changes are made by this document; it is an execution-ready plan only.

## Current State (file-backed)
- Hosting: App Service F1 (Free), `alicante`, no slot, no Always On, no insights
  - `infra/modules/app-service-plan.bicep:4-14`
  - `infra/modules/app-service.bicep:6-43`
- Deployment: GitHub Actions uploads a standalone zip to blob, switches app via 10-year SAS Run-From-Package
  - `.github/workflows/deploy.yml:55-122`
- Runtime: `node server.js`, single env, no health endpoint, no warm-up
  - `infra/modules/app-service.bicep:14`
  - `next.config.js:11`
- Secrets: storage connection string + account key passed through workflow shell, plus long-lived SAS
  - `.github/workflows/deploy.yml:47-59, 87-96, 112`
- Observability: none
  - `infra/modules/app-service.bicep:20-23`
- Data: Table Storage Standard_LRS, local dev via Azurite
  - `infra/modules/storage.bicep:9-26`
- Known risks: OData filter injection surface noted in `SECURITY.md`, exported storage key in pipeline shells

## Target State
- Predictable deploy with built-in rollback and slot promotion
- Production runtime on Standard tier
- Observability + alerting enabled
- Secrets managed safely; no long-lived SAS exposure
- Separate staging/prod behavior in IaC and workflow
- Local dev parity unchanged

## Wishlist Control Surface
Wishlist is the durable tracker. Each workstream points to a specific wishlist row so status stays truthful.

Relevant items:
- `wishlist.md:11` — `[~]` Azure validation + rebuild
- `wishlist.md:16` — Application Insights/observability
- `wishlist.md:17` — staging slot + promote pipeline
- `wishlist.md:18` — remove long-lived SAS/secret leakage
- `wishlist.md:19` — Standard tier migration

Recommended sequence for wishlist tracking:
1. Mark `#18` active once SAS/secret work starts
2. Mark `#19` active once tier work starts
3. Mark `#17` active once staging work starts
4. Mark `#16` last or parallel to `#19`

## Rename Proposal (WFP reference + uniqueness)
Wishlist: `#11`
Complexity: low-medium
Dependencies: before or parallel to Phase 1

### Names to rename
- App Service: `alicante` -> `wfp-app-alicante` (globally unique, alphanumeric + hyphens)
- Storage Account: `saworkforceplan` -> `wfpsaplanning` (globally unique, lowercase alphanumeric only, 3-24 chars)
- Resource Group: `rgWorkforcePlan` -> `wfp-rg-workforceplan`
- App Service param `appName` in `infra/main.bicep`: keep or align with `wfp`

### Unicity rules impacting naming
- Storage account: global uniqueness; lowercase letters + numbers only, no hyphens; max 24 chars. Proposed `wfpsaplanning` (12 chars)
- App Service: global uniqueness; alphanumeric + hyphens, max 60 chars, cannot end with hyphen. Proposed `wfp-app-alicante`
- Resource group: unique within subscription; hyphens ok. Proposed `wfp-rg-workforceplan`

### Tasks
- Update `infra/main.bicep` defaults and `infra/parameters.json` values
- Update `infra/create_tableaccess.sh`
- Update `.github/workflows/deploy.yml` references if any hardcoded names remain
- Update `README.md` env secret names/values example
- Update `.planning/azure-rebuild-plan.md` current/target section notes
- After rename, existing live resources must be renamed in Portal/Azure CLI; IaC rename alone is not enough if live resources already exist

### Acceptance
- `az deployment group validate` succeeds with new names
- No undocumented hardcoded legacy names remain outside docs/history
- Azure resource name length/format rules satisfied in code

### Rollback
- Bicep/parameters can re-pin former names if resources were recreated instead of renamed

## Phase 1: Foundation Fixes (low risk, no slot required)
Wishlist: `#5`, `#18`
Complexity: low
Dependencies: secrets must be set before rebuild; otherwise none

### Tasks
- Replace blob Run-From-Package deploy with direct zip deploy to App Service or move to a container-based deploy
- Remove 10-year SAS generation workflow path
- Keep `AZURE_STORAGE_CONNECTION_STRING` as an App Setting, not a shell-exported secret
- Reduce `CONN_STR` logging exposure; never echo it or parse it in shell

### Acceptance
- Deploy succeeds without SAS token logic or `az storage blob generate-sas`
- Deploy logs do not contain storage account key
- Local `npm run dev` still seeds and reads from Azurite

### Rollback
- Revert workflow to prior SHA; App Service `WEBSITE_RUN_FROM_PACKAGE` can be cleared in Portal

## Phase 2: Runtime Hardening (App Service Standard)
Wishlist: `#19`
Complexity: low-medium
Dependencies: Phase 1 complete; resource group/core infra unchanged

### Tasks
- Change plan SKU/tier from F1 Free to Standard (S1 or higher)
- Enable Always On
- Set startup command to `node server.js` explicitly
- Confirm Node 22 runtime matches local
- Add `applicationInsights` resource via IaC

### Acceptance
- App stays warm after idle; cold-start complaints gone
- CPU/memory perf counters readable
- No quota/request-limit errors under normal use

### Rollback
- Downgrade app service plan SKU if cost/constraint issue arises

## Phase 3: Observability (Application Insights + alerts)
Wishlist: `#16`
Complexity: medium
Dependencies: Phase 2; new App Service app settings must reference Instrumentation Key or connection string securely

### Tasks
- Add Application Insights Bicep module + outputs
- Wire App Service app settings:
  - `APPINSIGHTS_INSTRUMENTATIONKEY`
  - or `APPLICATIONINSIGHTS_CONNECTION_STRING`
- Enable failed-request tracing + diagnostic logs
- Add minimal health/log-based alert

### Acceptance
- Telemetry visible in portal within minutes of request
- Health log paths readable; at least one test alert fires from synthetic request
- Logs do not expose secrets

### Rollback
- Remove App Insights app settings; fall back to platform-only logging

## Phase 4: Deployment Safety + Promotion
Wishlist: `#17`
Complexity: medium-high
Dependencies: Phases 1-3; environment names and slots must exist before slot-swap logic

### Tasks
- Add staging slot in IaC
- Add promote workflow (stage -> prod via swap, not redeploy)
- Split secrets by slot lifecycle where needed
- Add deploy health gate: wait-for-healthy after swap

### Acceptance
- Deploy to staging first, validate, then swap
- Rollback via slot swap reverse or redeploy prior artifact
- Promotion workflow does not re-run full build

### Rollback
- Manual portal swap back; prior artifact re-upload if needed

## Dependency Map
```
Phase 1 (Secret + deploy fix)
    -> Phase 2 (Standard tier + Always On)
        -> Phase 3 (App Insights)
            -> Phase 4 (Slot + promote pipeline)
```

Complexity legend:
- low: mostly workflow/IaC edits, low blast radius
- medium: infra additions plus secret/env coordination
- medium-high: automation + slot lifecycle + promotion risk

## Deployment Change Log (wishlist staging)
Proposed changes staged in plan only:
- `infra/modules/app-service-plan.bicep`: SKU `F1` -> `Standard`, Add `Always On` behavior
- `infra/modules/app-service.bicep`: Add Application Insights app settings
- `infra/main.bicep`: Add `appInsights` module; add `stagingSlot` resource or separate `slot` module
- `.github/workflows/deploy.yml`: Replace blob+SAS logic with zip deploy or slot-based promotion
- `README.md`: Add deploy rollback and PSA around slot promotion

No file is modified yet. Execution requires explicit user approval per phase.

## Review Gates
Before execution, ask for approval on:
1. Phase 1 approach (zip deploy vs container vs SWA Hybrid)
2. Standard tier SKU/cost choice
3. Whether `alicante` app name is kept or renamed
4. Logging/alerting destination and access policy

## Deputy/Cross-Team Notes
- Any change to App Service plan or slots can briefly warm the app. Coordinate if remote users depend on uptime.
- Secrets migration (`AZURE_STORAGE_CONNECTION_STRING` + App Insights keys) must touch both Portal app settings and workflow inputs.
- Build/runtime Node version bump should be coordinated across `next.config.js`, `app-service.bicep`, and `deploy.yml`.
