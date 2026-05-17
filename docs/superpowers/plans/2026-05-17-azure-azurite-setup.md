# Azure Backend & Azurite Dev Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Azure App Service deployment pipeline and establish a working local Azurite development workflow.

**Architecture:** Next.js 16 (`output: 'standalone'`) builds a self-contained server bundle at `.next/standalone/`. The CI workflow packages that bundle (not the full project) and deploys it to Azure App Service. Locally, Azurite emulates Azure Table Storage so no cloud connection is needed during development.

**Tech Stack:** Next.js 16.2.4, Azure App Service (F1), Azure Table Storage, Azurite 3.35.0, GitHub Actions with OIDC, Azure Bicep

---

## Diagnosis: What Is Currently Broken

Three structural bugs prevent deployment:

1. **Bicep conflict** — `WEBSITE_RUN_FROM_PACKAGE=1` (read-only ZIP mount) and `SCM_DO_BUILD_DURING_DEPLOYMENT=true` (Kudu tries to `npm install` on server) are mutually exclusive. SCM_DO_BUILD_DURING_DEPLOYMENT must be removed since we build in CI.

2. **Wrong deployment package** — `deploy.yml` ships `package: .` (the whole project including `node_modules`). With `output: 'standalone'`, the correct artifact is `.next/standalone/` with `public/` and `.next/static/` copied in. The current approach ships hundreds of MB of node_modules that Azure App Service discards or misuses, and there is no startup command telling App Service how to run the server.

3. **Missing `.env.local`** — Local dev has no `AZURE_STORAGE_CONNECTION_STRING` set, so `npm run dev` fails to connect to Azurite.

---

## File Structure

| File | Action | What Changes |
|------|--------|-------------|
| `.env.local` | **Create** | `AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true` |
| `.gitignore` | **Verify** | `.env.local` already excluded, `.next/` already excluded |
| `infra/modules/app-service.bicep` | **Modify** | Remove `SCM_DO_BUILD_DURING_DEPLOYMENT`, add `appCommandLine: 'node server.js'` |
| `.github/workflows/deploy.yml` | **Modify** | Add package-preparation step, change `package:` to `.next/standalone` |
| `package.json` | **Modify** | Add `"azurite:clean"` and `"dev:full"` convenience scripts |

---

## Task 1: Create `.env.local` for Local Azurite Development

**Files:**
- Create: `.env.local`

- [x] **Step 1: Create `.env.local`**

```bash
cp .env.local.example .env.local
```

Verify the resulting file content:
```
AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true
```

- [x] **Step 2: Verify `.gitignore` already excludes it**

```bash
grep '\.env\.local' .gitignore
```

Expected output: `.env.local` (confirming it won't be committed).

- [x] **Step 3: Commit nothing** — `.env.local` is gitignored, no commit needed. Only the developer's local file was created.

---

## Task 2: Verify the Full Local Dev Workflow

This confirms Azurite + Next.js + seed all work together before touching CI.

**Files:** No changes — this is a smoke-test task.

- [x] **Step 1: Start Azurite in a terminal**

```bash
npm run azurite
```

Expected: Azurite server listening on ports 10000 (blob), 10001 (queue), 10002 (table). Output includes:
```
Azurite Table service is starting at http://127.0.0.1:10002
Azurite Table service is successfully listening at http://127.0.0.1:10002
```

Leave this running. Open a new terminal for the next steps.

- [x] **Step 2: Start the Next.js dev server**

```bash
npm run dev
```

Expected: Server starts on `http://localhost:3000`. Next.js 16 dev output goes to `.next/dev/` (separate from the production `.next/` directory — this is a Next.js 16 change that allows concurrent dev and build).

- [x] **Step 3: Seed the database**

```bash
npm run dev:seed
```

This runs `scripts/seed-dev.ts` which POSTs to `http://localhost:3000/api/seed`. Expected output:
```
Seeded successfully
```

- [x] **Step 4: Verify the app**

Open `http://localhost:3000` in a browser. You should see the scenarios list with seeded data. If you see an empty state or a connection error, confirm Azurite is running (Step 1) and `.env.local` exists (Task 1).

- [x] **Step 5: No commit** — nothing changed.

---

## Task 3: Add Convenience Dev Scripts to `package.json`

**Files:**
- Modify: `package.json`

- [x] **Step 1: Add `dev:full` and `azurite:clean` scripts**

Edit `package.json` scripts section:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "dev:seed": "npx tsx scripts/seed-dev.ts",
  "type-check": "tsc --noEmit",
  "azurite": "npx azurite --silent --location ./azurite-data",
  "azurite:clean": "rm -rf ./azurite-data && mkdir ./azurite-data && npm run azurite",
  "dev:full": "npm run azurite & sleep 2 && npm run dev"
}
```

`azurite:clean` wipes and restarts Azurite with a fresh empty database (useful when the local state is corrupted). `dev:full` starts Azurite and the dev server together (Azurite in background).

- [x] **Step 2: Run type-check to confirm no breakage**

```bash
npm run type-check
```

Expected: No errors.

- [x] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add azurite:clean and dev:full convenience scripts"
```

---

## Task 4: Fix Bicep — Remove Conflicting Setting, Add Startup Command

The App Service must know how to start the standalone server, and the conflicting SCM setting must be removed.

**Files:**
- Modify: `infra/modules/app-service.bicep`

- [x] **Step 1: Edit `infra/modules/app-service.bicep`**

Replace the current `siteConfig` block. The full updated resource definition:

```bicep
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: name
  location: location
  properties: {
    serverFarmId: serverFarmId
    httpsOnly: true
    siteConfig: {
      nodeVersion: '~22'
      appCommandLine: 'node server.js'
      appSettings: [
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: storageConnectionString
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'NEXT_TELEMETRY_DISABLED'
          value: '1'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22'
        }
        {
          name: 'PORT'
          value: '8080'
        }
      ]
      webSocketsEnabled: false
      alwaysOn: false
    }
  }
  tags: {
    application: 'workforceplanning'
  }
}
```

Changes made:
- Removed `SCM_DO_BUILD_DURING_DEPLOYMENT` — we build in CI, not on the server
- Added `appCommandLine: 'node server.js'` — tells App Service how to start the standalone Next.js server
- Added `PORT: '8080'` — Next.js standalone `server.js` reads `process.env.PORT`; App Service uses 8080 by default

- [x] **Step 2: Verify the file looks correct**

```bash
cat infra/modules/app-service.bicep
```

Confirm `SCM_DO_BUILD_DURING_DEPLOYMENT` is absent and `appCommandLine` is present.

- [x] **Step 3: Commit**

```bash
git add infra/modules/app-service.bicep
git commit -m "fix: remove conflicting SCM_DO_BUILD_DURING_DEPLOYMENT, add startup command for standalone Next.js"
```

---

## Task 5: Fix GitHub Actions Deploy Workflow — Package Standalone Output

**Files:**
- Modify: `.github/workflows/deploy.yml`

The problem: `package: .` ships the full project. For `output: 'standalone'`, the correct artifact is `.next/standalone/` with public/ and .next/static/ copied in. This is smaller, faster to deploy, and correctly structured.

- [x] **Step 1: Update `.github/workflows/deploy.yml`**

Replace the entire file content:

```yaml
name: Build and Deploy to Azure App Service

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  NODE_VERSION: '22'

jobs:
  configure-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Azure login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Set App Service application settings
        env:
          APP_NAME: ${{ secrets.AZURE_APP_NAME }}
          RESOURCE_GROUP: ${{ secrets.AZURE_RESOURCE_GROUP }}
          CONN_STR: ${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}
        run: |
          az webapp config appsettings set \
            --name "$APP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --settings \
              "AZURE_STORAGE_CONNECTION_STRING=$CONN_STR" \
              NODE_ENV=production \
              NEXT_TELEMETRY_DISABLED=1 \
              WEBSITE_RUN_FROM_PACKAGE=1 \
              PORT=8080

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build
        env:
          NODE_ENV: production
          AZURE_STORAGE_CONNECTION_STRING: ${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}
          NEXT_TELEMETRY_DISABLED: '1'

      - name: Prepare standalone deployment package
        run: |
          cp -r public .next/standalone/
          cp -r .next/static .next/standalone/.next/

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ secrets.AZURE_APP_NAME }}
          publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
          package: .next/standalone
```

Changes:
- Added `Prepare standalone deployment package` step — copies `public/` and `.next/static/` into `.next/standalone/` as required by Next.js standalone docs
- Changed `package:` from `.` to `.next/standalone` — deploys only the minimal server bundle (~20-50 MB instead of hundreds of MB)
- Added `PORT=8080` to appsettings — App Service expects port 8080

- [x] **Step 2: Verify the file is correct**

```bash
cat .github/workflows/deploy.yml
```

Confirm `package: .next/standalone` is present and the copy step precedes it.

- [x] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "fix: deploy Next.js standalone output to Azure App Service, not entire project"
```

---

## Task 6: One-Time Azure Infrastructure Provisioning

This task only runs once (or after wiping the resource group). If the Azure resources already exist and are healthy, skip to Task 7.

**Prerequisites:** Azure CLI installed and authenticated (`az login`). Correct subscription selected (`az account set --subscription <id>`).

- [x] **Step 1: Create the resource group** *(Infrastructure already existed in `rgWorkforcePlan` — see note below)*

> **Note:** Resources were already provisioned in `rgWorkforcePlan` (App Service `alicante` in polandcentral, Storage Account `saworkforceplan` in northeurope). The plan's `workforceplanning-rg` was not used; existing infra was reused instead. App settings were corrected (connection string pointed to wrong account `satvvworkforceplan`; fixed to `saworkforceplan`). Startup command `node server.js` added to App Service config.

- [x] **Step 2: Deploy the Bicep template** *(Skipped — infrastructure already exists)*

- [x] **Step 3: Get the Storage Account connection string** *(Retrieved from `saworkforceplan` / `rgWorkforcePlan`)*

- [x] **Step 4: Get the App Service publish profile** *(Retrieved from `alicante` / `rgWorkforcePlan`)*

- [x] **Step 5: Set up GitHub repository secrets**

All 7 secrets set via `gh secret set` on `toinevl/workforceplanning`:

- `AZURE_CLIENT_ID` = `67ff286b-795c-4e07-8442-c0da1de9dc05`
- `AZURE_TENANT_ID` = `3aa156f9-14fb-4ca1-913d-06f6534f327f`
- `AZURE_SUBSCRIPTION_ID` = `2dbeb3f1-e45d-4207-a7e9-185330aad74b`
- `AZURE_APP_NAME` = `alicante`
- `AZURE_RESOURCE_GROUP` = `rgWorkforcePlan`
- `AZURE_STORAGE_CONNECTION_STRING` = saworkforceplan connection string
- `AZURE_PUBLISH_PROFILE` = alicante XML publish profile

- [x] **Step 6: Set up OIDC federated credential**

Created service principal `workforceplanning-github` (appId: `67ff286b-795c-4e07-8442-c0da1de9dc05`), assigned Contributor to `rgWorkforcePlan`, added federated credential for `repo:toinevl/workforceplanning:ref:refs/heads/main`.

- [x] **Step 7: No commit** — infrastructure state is outside the repo.

---

## Task 7: End-to-End Verification

- [x] **Step 1: Verify local Azurite dev still works**

```bash
npm run azurite &
npm run dev
```

Open `http://localhost:3000`. Stop with Ctrl+C when confirmed.

- [x] **Step 2: Verify production build**

```bash
npm run build
```

Expected: Clean build output with all routes listed. Check `.next/standalone/server.js` exists:

```bash
ls .next/standalone/server.js
```

- [x] **Step 3: Test standalone server locally**

```bash
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
PORT=3001 node .next/standalone/server.js
```

Open `http://localhost:3001`. If pages load (they'll show errors connecting to Azurite since `AZURE_STORAGE_CONNECTION_STRING` isn't set in this test), the server itself is working. Stop with Ctrl+C.

- [ ] **Step 4: Trigger CI/CD deploy**

> **BLOCKER (2026-05-17):** The App Service (`alicante`) has a persistent Kudu deployment lock from previous failed deployment attempts. Every push triggers a 409 Conflict from OneDeploy. The workflow, secrets, and OIDC are all correctly configured — the problem is solely a Kudu lock state.
>
> **Fix before next push:** Run one of these to clear the lock:
> ```bash
> az webapp restart --name alicante --resource-group rgWorkforcePlan
> # or: az webapp stop ... then az webapp start ...
> ```
> Then push to main or trigger the workflow manually.
>
> **What was tried:** (1) `azure/webapps-deploy@v3` → 409, (2) `az webapp deploy --type zip` → 400, (3) Kudu `/api/zipdeploy` curl → 400. Root cause: all OneDeploy variants conflict with an active Run-From-Zip deployment lock.
>
> **Note:** Resource group in secrets is `rgWorkforcePlan` (not `workforceplanning-rg` as the plan originally stated — infra was already in `rgWorkforcePlan`).

```bash
git push origin main
```

Watch the workflow in GitHub Actions. All steps should be green.

- [ ] **Step 5: Verify Azure App Service**

```bash
az webapp browse --name alicante --resource-group rgWorkforcePlan
```

Or open `https://alicante-eghjf7b0aadefpey.polandcentral-01.azurewebsites.net` in a browser. The app should load.

- [ ] **Step 6: Verify storage tables are created**

On first request, `src/lib/db/client.ts` auto-creates all Azure Table Storage tables. Verify:

```bash
az storage table list \
  --connection-string "<AZURE_STORAGE_CONNECTION_STRING>" \
  --output table
```

Expected: `teams`, `staffMembers`, `scenarios`, `scenarioMemberStates`, `scenarioTeamDrivers`, `scenarioSnapshots`, `scenarioAuditEvents` tables listed.

---

## Azurite Dev Cheat Sheet

Once this plan is implemented, the daily local dev workflow is:

```bash
# Terminal 1: start Azure Storage emulator
npm run azurite

# Terminal 2: start Next.js dev server
npm run dev

# Terminal 2 (once): seed the database with sample data
npm run dev:seed

# If local data is corrupted:
npm run azurite:clean  # wipes azurite-data/ and restarts Azurite
npm run dev:seed       # re-seed
```

Next.js 16 dev server outputs to `.next/dev/` (separate from the production `.next/` directory), so you can run `npm run build` in a third terminal concurrently without interrupting the dev server.
