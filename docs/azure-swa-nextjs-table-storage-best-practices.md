# Azure Static Web Apps + Storage Best Practices
## Next.js Apps with API Routes and Azure Table Storage — 2026

---

## 1. Deployment Model Selection

Azure Static Web Apps supports **two** distinct Next.js deployment modes. Choosing the correct one is the first and most consequential decision.

| Model | API Routes | SSR / RSC | Linked External Backend | Size Limit | Use When |
|-------|-----------|-----------|------------------------|------------|----------|
| **Hybrid (Preview)** | ✅ Yes (transformed to managed Functions) | ✅ Yes | ❌ No | 250 MB | You need SSR, App Router, RSC |
| **Static Export** | ❌ No (use linked backend) | ❌ No | ✅ Yes | No strict limit | Fully static or external API backend |

### Recommendation
For Next.js apps with API routes that read/write Azure Table Storage:
- Use **Hybrid mode** if the API routes are Next.js-based (App Router route handlers or Pages Router API routes).
- Use **Static Export + Linked Backend** if you want a separate, larger API surface area (e.g., standard Azure Functions / App Service), more control, or predictable API behavior.

> **Note**: Hybrid mode remains in Preview as of Aug 2024. Pin to exact Next.js versions known to work (e.g., Next.js 13.5.6+, Next.js 14) and avoid the bleeding edge.

---

## 2. Resource Naming Conventions

### Naming Rules
- Azure Static Web App names must be globally unique and DNS-compatible (lowercase alphanumerics and hyphens; no underscores).
- Valid length: 2–60 characters.
- Storage account names: 3–24 characters, lowercase alphanumerics only.
- All resource names should be **descriptive and consistent** across environments.

### Recommended Naming Pattern
```
<project>-<environment>-<region>-<service>
```

#### Examples
| Resource | Production | Staging / PR Preview |
|----------|-----------|----------------------|
| Static Web App | `workforceplanning-swa-prod-westeu` | `workforceplanning-swa-pr-123-westeu` |
| Storage Account | `wpstorprodwesteu` | `wpstorstagingwesteu` |
| Storage Table | `EmployeeData` | `EmployeeData` (reuse across environments for PR previews if safe; otherwise `EmployeeDataStaging`) |
| App Insights | `wpai-prod-westeu` | (auto-created by SWA) |

### Table Naming Tips
- Use **PascalCase** or **camelCase** table names (both accepted by the Storage SDK, but PascalCase is recommended by Microsoft for .NET parity).
- Avoid special characters and spaces.
- Use singular noun forms: `Employee`, `Shift`, `TimeOffRequest`.

---

## 3. Build Configuration

### GitHub Actions Workflow (Hybrid Mode)
```yaml
# .github/workflows/azure-static-web-apps-<name>.yml
app_location: "/"           # App source root
api_location: ""            # Leave EMPTY for Hybrid; SWA manages the backend functions
output_location: ""         # Leave EMPTY for Hybrid mode
```

> **Critical**: For Hybrid Next.js deployments, set `api_location: ""`. Do NOT point it to an `api/` folder containing Next.js API routes or standard Azure Functions — the build will fail or behave incorrectly.

### Build Preset
- Choose **Next.js** from the Build Preset dropdown during initial SWA creation in the Azure Portal.
- The preset automatically sets the correct `app_location`, `api_location`, and `output_location` values.

### next.config.js for Hybrid Mode
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // No special output mode needed for hybrid
  // 'output: "export"' is ONLY for static export mode
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
```

### Standalone Mode for Size Optimization
If your deployment package approaches the 250 MB hybrid limit:
```javascript
const nextConfig = {
  output: 'standalone',
};
```
- SWA expects the standalone output in `.next/standalone`.
- `skip_api_build=true` does **not** automatically remove `devDependencies` or add `sharp`; do this in a custom build step before the SWA deploy action if needed.

### Static Export + Linked Backend (Alternative)
```javascript
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};
```
- `output_location: "out"` in build config (unless you changed `distDir`).
- Set `IS_STATIC_EXPORT=true` in the SWA deploy task's `env:` block.
- You may then link a separate App Service / Functions API as the backend.

---

## 4. App Settings and Secrets Management

### Environment Variable Strategy in Next.js on SWA

| Variable Type | Where Defined | When Effective | Baked Into Build? |
|--------------|--------------|----------------|-------------------|
| Server-side only (no `NEXT_PUBLIC_` prefix) | Azure Portal → SWA → Configuration → Application settings | **Immediately** — no redeploy | No |
| Client-side (`NEXT_PUBLIC_*`) | GitHub Secrets + CI workflow `Generate Env File` step | At next CI build | Yes |
| `.env.local` | Local only (git-ignored) | Local dev only | N/A |

### Azure Portal Application Settings (for Server-Side)
Set these under **SWA → Settings → Configuration → Application settings** (not under linked backend unless shared):

```
AzureWebJobsStorage=<storage-connection-string>
TableStorageConnectionString=<storage-connection-string-for-table-access>
NODE_ENV=production
```

> **Important**: Environment variables from pipeline YAML `env:` blocks are **NOT** passed to the SWA runtime. Always use the Portal Configuration blade for runtime-swappable values.

### CI/CD Secret Injection for NEXT_PUBLIC_*
```yaml
- name: Generate Env File
  run: echo 'NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}' >> .env
```
Place this **before** the `Build And Deploy` step.

### Recommended Secret Architecture
```
.azure/
  swa/
    bicep/          # IaC for SWA + Storage + Table
    parameters/
      prod.json
      staging.json

GitHub Secrets (CI/CD):
  AZURE_STATIC_WEB_APPS_API_TOKEN  # SWA deploy token
  TABLE_STORAGE_CONNECTION_STRING  # (if you prefer CI-level sets, but Portal is preferred for runtime)

Azure Key Vault (recommended for production):
  - Store connection strings here
  - Grant SWA Managed Identity Key Vault access
  - Reference in Bicep/ARM templates via `@Microsoft.KeyVault(SecretUri=...)`
```

### Table Storage Connection String in Code
```typescript
// app/api/employees/route.ts (App Router example)
import { NextResponse } from 'next/server';
import { TableServiceClient, AzureNamedKeyCredential } from '@azure/data-tables';

const connectionString = process.env.TableStorageConnectionString;
if (!connectionString) {
  throw new Error('TABLE_STORAGE_CONNECTION_STRING is not configured');
}

const tableServiceClient = new TableServiceClient(connectionString);
const tableClient = tableServiceClient.getTableClient('Employee');

export async function GET() {
  const entities = [];
  for await (const entity of tableClient.listEntities()) {
    entities.push(entity);
  }
  return NextResponse.json(entities);
}

export async function POST(request: Request) {
  const body = await request.json();
  await tableClient.createEntity(body);
  return NextResponse.json({ ok: true }, { status: 201 });
}
```

---

## 5. API Merge Behavior: Internal Next.js Routes vs. Linked Backend

This is one of the most misunderstood aspects of SWA + Next.js.

### Hybrid Mode — Internal API Routes Only
- Next.js API routes (App Router route handlers in `app/api/` or Pages Router in `pages/api/`) are **transformed internally** by SWA into managed Azure Functions.
- They are **not** in a separate `api/` folder.
- They live alongside your Next.js app code and share the same Next.js runtime.
- `staticwebapp.config.json` **navigation fallback is NOT supported** for Next.js hybrid apps.
- Rewrites for internal Next.js routes must be in `next.config.js`.

### Linked Backend (Standard/Dedicated Plan Required)
- You can link an **external** App Service, Functions app, or Container App as a backend.
- The linked API is proxied at `/api/` by SWA.
- **Linked backends are NOT compatible with Hybrid Next.js mode.** They work with Static Export or non-Next.js frontends.

#### Known Bug (May 2025 — Microsoft Confirmed)
Setting `api_location: ""` in your pipeline YAML **overwrites manual portal backend links** on subsequent CI runs. Fix:
- Remove the `api_location` line entirely, OR
- Point it to a placeholder folder, OR
- Automate backend linking via Azure CLI in your pipeline:
  ```bash
  az staticwebapp appsettings set \
    --name <swa-name> \
    --resource-group <rg> \
    --setting-names backendResourceId=/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Web/sites/<backend-name>
  ```

### API Merge Path Summary
| Scenario | Behavior |
|---------|---------|
| Hybrid Next.js with `app/api/` routes | Routes served by internal SWA-managed Functions |
| Hybrid Next.js + Linked Backend | ❌ Not supported; use Static Export + linked backend instead |
| Static Export + Linked Backend | Frontend static + external API at `/api/*` |

---

## 6. Local/Emulator Parity

### SWA CLI Limitations for Next.js
The `swa-cli` **does NOT support Next.js Hybrid mode**. Using `swa start` or `swa login` with a Hybrid app will fail or produce incorrect results.

### Recommended Local Development Setup
| Need | Tool |
|------|------|
| Next.js app + API routes locally | `npm run dev` (Next.js built-in dev server) |
| Table Storage locally | **Azurite** emulator |
| Azure Functions (if using Static Export + linked API) | `func start` (Azure Functions Core Tools) |

### Azurite Setup with Table Storage
```bash
# Install Azurite globally
npm install -g azurite

# Run with all services (Blob, Queue, Table)
azurite --silent --location ~/.azurite

# Or Docker
docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  mcr.microsoft.com/azure-storage/azurite azurite --table
```

### Local `.env` Example
```env
# .env.local (git-ignored)
TableStorageConnectionString=UseDevelopmentStorage=true
# or Azurite explicit:
TableStorageConnectionString=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=...;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1
```

### Parity Checklist
- [ ] Same Node.js version locally as SWA (use `.nvmrc` or `.node-version`)
- [ ] Same `@azure/data-tables` SDK version locally and in production
- [ ] Azurite table names match production table names exactly
- [ ] CORS headers tested locally if calling the SWA API proxy
- [ ] No filesystem path assumptions (SWA Linux vs macOS/Windows)

---

## 7. Common Failure Modes for Remote (Deployed) Apps

### 7.1 404 on Valid Next.js Routes
- **Cause**: Client-side routing on refresh; SWA needs a fallback rule. For hybrid mode, configure in `next.config.js`: `trailingSlash: true` or use `rewrites`.
- **Alternative**: Add this to `staticwebapp.config.json` **only for static export apps**: `"navigationFallback": { "rewrite": "/index.html" }`.

### 7.2 "Backend call failure" (Intermittent 500) 
- **Cause**: SWA's managed backend hitting cold start or memory limits. Next.js SSR cold starts can be 1–3 seconds on Free/Standard tier. Move to Standard plan or add App Service linked backend for warm instances.

### 7.3 Environment Variables Not Resolving
- **Cause**: Using variable substitution syntax (`${VAR}`) inside connection strings or `.env` files. SWA does **not** perform variable substitution.
- **Fix**: Use plaintext values in the Azure Portal Configuration blade.

### 7.4 API Routes Crashing After Deployment
- **Cause 1**: `"type": "module"` in `package.json` causes CJS/ESM conflict with SWA's internal `next_function.js`. Remove the `"type": "module"` field or use `.cjs` extension.
- **Cause 2**: Missing `sharp` package (used by Next.js Image Optimization). For builds > 250 MB or standalone mode, add `sharp` explicitly or disable image optimization: `images: { unoptimized: true }`.
- **Cause 3**: Global Web APIs (e.g., `Request`, `Response`) not available in SWA's Functions runtime. Ensure you're using a supported Next.js version (13.5.6+) and the correct output mode.

### 7.5 Linked Backend Reverting / Breaking
- **Cause**: `api_location: ""` in workflow YAML overwrites portal-linked backends on each CI run.
- **Fix**: Use Azure CLI or ARM/Bicep to set `backendResourceId` programmatically.

### 7.6 CORS Errors When Calling Table Storage Directly from Client
- **Cause**: Browser blocks cross-origin calls to `*.table.core.windows.net`.
- **Fix**: **Never** call Table Storage directly from the browser. Use Next.js API route as a proxy. SWA's managed API routes share origin with the frontend, so no CORS is needed from the browser → Next.js API boundary.

### 7.7 Build Timeouts
- **Cause**: Large `node_modules`, `next build` taking >15 minutes (default SWA build timeout).
- **Fix**: 
  - Use `npm ci` or cache `node_modules`.
  - Enable Next.js standalone mode.
  - Increase `build_timeout_in_minutes` in workflow config (max 60).

### 7.8 Node.js Version Mismatch
- At the time of this writing (early 2026), SWA supports Node.js 18 and 20+. Node.js 22+ may not be supported in hybrid mode. Pin your version in `package.json`:
  ```json
  { "engines": { "node": "18.20.0" } }
  ```

---

## 8. Checklist-Style Validation

### Pre-Deployment
- [ ] **Node version pinned**: `engines.node` set in `package.json` (18.x LTS recommended)
- [ ] **Next.js version pinned**: Exact version in `package.json` (avoid `^` or `~` for CI reproducibility)
- [ ] **No `"type": "module"`** unless all related entry points are ESM-compatible
- [ ] **`next.config.js` is SWA-compatible**: no `output: "export"` for hybrid; no conflicting rewrites
- [ ] **All env vars documented**: Each env var has a source (Portal, GitHub Secret, Key Vault)
- [ ] **No raw connection strings committed**: `.env*` files are in `.gitignore`
- [ ] **Table Storage container/table names** match Azure naming rules

### Build Configuration
- [ ] **`api_location: ""`** in GitHub Actions workflow for hybrid mode (or remove the field)
- [ ] **Build preset is `Next.js`** in the Azure Portal workflow config
- [ ] **`output_location` is empty** for hybrid mode (or `"out"` for static export)
- [ ] **Build timeout** set appropriately (`build_timeout_in_minutes` ≥ 15 for larger apps)
- [ ] **`IS_STATIC_EXPORT=true`** set if using static export mode

### Secrets and App Settings
- [ ] **`TableStorageConnectionString`** set in Azure Portal → Configuration (not just locally)
- [ ] **`NEXT_PUBLIC_*` vars** injected via CI step or set in Portal for client-side use
- [ ] **No variable substitution** in Portal values (e.g., `${DATABASE_URL}` won't work)
- [ ] **Secrets in GitHub Secrets**, not in YAML directly
- [ ] **Key Vault references** used for production secrets where possible

### Table Storage Specifics
- [ ] **Table name follows PascalCase convention** (e.g., `Employee`, not `employees`)
- [ ] **Connection string uses HTTPS** in production (`DefaultEndpointsProtocol=https`)
- [ ] **Storage account is not publicly accessible** (set `allowBlobPublicAccess: false`)
- [ ] **Azure AD auth** preferred over shared keys if applicable; use Managed Identity for linked backends
- [ ] **Retry/backoff** configured in `@azure/data-tables` calls for transient failures

### Local Development Parity
- [ ] **Azurite running** for local Table Storage emulation
- [ ] **`.env.local`** uses `UseDevelopmentStorage=true` or Azurite explicit connection string
- [ ] **Same SDK version** installed locally and in `package.json`
- [ ] **Tested API routes locally** before pushing to CI
- [ ] **`swa-cli` not used** for Next.js Hybrid (known incompatibility)

### Post-Deployment Validation
- [ ] **App loads** at `https://<app-name>.azurestaticapps.net`
- [ ] **API route responds**: `GET /api/employees` returns 200 with expected data
- [ ] **Server Components render** without 500 errors (check browser console and SWA logs)
- [ ] **No "Backend call failure" errors** in production (wait a few minutes after deploy for cold start to settle)
- [ ] **Env vars effective**: Set a test var in Portal → Config; refresh app; confirm it resolves (no rebuild needed)
- [ ] **Table reads/writes work end-to-end**: Create a record via API, read it back
- [ ] **CORS is not the issue**: Calls from frontend to `/api/*` work without CORS errors (SWA proxy removes CORS requirement)

### Monitoring
- [ ] **App Insights enabled** (auto-created by SWA; verify it's capturing server-side logs)
- [ ] **Storage account diagnostic logs** enabled for Table operations
- [ ] **Alerting configured** on SWA availability and Function errors

---

## 9. Bicep / IaC Snippet (Optional)

```bicep
param swaName string
param location string = resourceGroup().location
param storageAccountName string

resource swa 'Microsoft.Web/staticSites@2024-01-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Standard' // Required for linked backends; Free for hybrid without external APIs
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/<org>/<repo>'
    branch: 'main'
    buildProperties: {
      appLocation: '/'
      apiLocation: '' // Empty for hybrid Next.js
      outputLocation: ''
      skipApiBuild: true
    }
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

// Create Table storage table via nested/child or use Azure CLI/PS in a deploymentScript
```

---

## Sources and References

- [Next.js support on Azure Static Web Apps — Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/nextjs)
- [Deploy hybrid Next.js websites — Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/deploy-nextjs-hybrid)
- [Build configuration for Azure Static Web Apps — Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration)
- [Configure Azure Static Web Apps — Microsoft Learn](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration)
- [Azure/static-web-apps Discussion #1428 — Improved Next.js support](https://github.com/Azure/static-web-apps/discussions/1428)
- [Azure/static-web-apps Issue #1204 — API endpoint crash (ESM/CJS, env vars)](https://github.com/Azure/static-web-apps/issues/1204)
- [Microsoft Q&A — Linked Backend API fails for Next.js app](https://learn.microsoft.com/en-us/answers/questions/2263157/azure-static-web-app-adding-a-linked-backend-api-f)
- [Managing environment variables in Next.js on SWA — speaktosteve](https://speaktosteve.github.io/managing-environment-variables-in-nextjs-azure-static-web-apps)
- [Extending Next.js support in Azure Static Web Apps — DEV Community](https://dev.to/azure/extending-nextjs-support-in-azure-static-web-apps-3kp0)
