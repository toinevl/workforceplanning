# Workforce Planning

A web application for modeling team reorganizations across 6 teams and 56 staff members. Built for exploring three reorganization scenarios with drag-and-drop, parameter tuning, and snapshot history.

## What it does

- Visualizes the current org as a drag-and-drop board (6 team columns).
- Lets planners reassign staff between teams to model proposed reorganizations.
- Supports three preconfigured scenarios:
  - **SQUAD removal** — model the impact of dissolving the SQUAD team and redistributing its members.
  - **Retirement wave** — project staffing impact when members reaching retirement age depart over a horizon.
  - **Business drivers** — re-balance teams against per-team business driver weights / target FTEs.
- Saves named snapshots and lets you compare or restore them.

## Quick start

Prerequisites: Node.js 20+, npm.

```bash
git clone <this-repo>
cd workforceplanning
npm install

# In one terminal, start the local Azure Storage emulator (Azurite)
npm run azurite

# In another terminal, start the Next.js dev server
npm run dev

# After the dev server is up, seed the database with initial data
npm run dev:seed
```

Open http://localhost:3000 — you'll be redirected to `/scenarios`.

Copy `.env.local.example` to `.env.local` if you need to override defaults. The default uses `UseDevelopmentStorage=true` which targets Azurite.

## Tech stack

- **Next.js 14+ App Router** with TypeScript
- **Tailwind CSS** + **shadcn/ui** primitives
- **Azure Table Storage** (`@azure/data-tables`) — single dependency for persistence
- **dnd-kit** for accessible drag-and-drop
- **Zustand** for client state, **TanStack Query** for server-state caching
- **Bicep** for Azure infrastructure as code
- **GitHub Actions** for CI / CD

## Tables

Six Azure tables back the app: `teams`, `staffMembers`, `scenarios`, `scenarioMemberStates`, `scenarioTeamDrivers`, `scenarioSnapshots`.

## Azure deployment

Infrastructure is defined in `infra/` as Bicep modules. The default plan is **App Service F1 (Free)** + **StorageV2 Standard_LRS**.

```bash
# Login + select subscription
az login
az account set --subscription <subscription-id>

# Create the resource group
az group create --name workforceplanning-rg --location westeurope

# Deploy the Bicep templates
az deployment group create \
  --resource-group workforceplanning-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters.json
```

Outputs include the App Service URL and Storage account name.

### CI / CD

Set the following GitHub Actions secrets in the repo:

- `AZURE_APP_NAME` — the App Service name (e.g. `workforceplanning-prod`).
- `AZURE_PUBLISH_PROFILE` — download from the App Service in the Azure portal (Get publish profile) and paste the full XML.
- `AZURE_STORAGE_CONNECTION_STRING` — the production storage connection string (used at build time).

On push to `main`, `.github/workflows/deploy.yml` builds and deploys.
On pull requests, `.github/workflows/validate.yml` runs lint, type-check, and a build.

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run start` — start production build
- `npm run lint` — ESLint
- `npm run type-check` — `tsc --noEmit`
- `npm run azurite` — start the local Azure Storage emulator
- `npm run dev:seed` — POST `/api/seed` to populate sample data
