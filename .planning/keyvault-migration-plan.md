# Key Vault + Managed Identity Migration Plan

Objective: replace the storage connection string App Setting (ADR-003 interim
decision) with a Key Vault-backed secret fetched at runtime via System Assigned
Managed Identity. This closes ADR-003 and backlog item #9. Planning doc only —
no live changes. Execution requires explicit approval.

**Status:** Planned (not started)
**Backlog:** #9 — (D) Migrate storage connection string → Key Vault + MI
**ADR:** ADR-003 (Accepted, interim — upgrade planned)

## Current State

- `AZURE_STORAGE_CONNECTION_STRING` is stored as an App Service application
  setting, set via Bicep (`infra/modules/app-service.bicep:19-21`) and the
  staging slot (`infra/modules/app-service-slot.bicep:18-20`).
- The value is the full connection string including the storage account key,
  constructed in `infra/modules/storage.bicep:28`.
- `src/lib/db/client.ts:10-12` reads it via
  `process.env.AZURE_STORAGE_CONNECTION_STRING`, falling back to Azurite
  (`UseDevelopmentStorage=true`) for local dev.
- No Managed Identity is enabled on the App Service.
- No Key Vault resource exists in the subscription (ADR-003 consequence: "Key
  Vault Bicep module is planned but not yet deployed").
- App Service Plan is B1 Basic (`infra/modules/app-service-plan.bicep`).
  System Assigned MI is supported on all tiers including Free/Basic.

## Prerequisites

1. **Permission:** contributor + User Access Administrator (or Role-Based Access
   Control Administrator) on the resource group — needed to create the Key
   Vault, enable MI, and grant the MI a data-plane role on the vault.
2. **RBAC vs Access Policy decision:** This plan recommends **Azure RBAC** (not
   vault access policies). RBAC is the current Azure recommendation; access
   policies are the legacy model. Key Vault RBAC requires the vault's
   `enableRbacAuthorization` property set to `true`.
3. **Bicep deployment target confirmed:** Validate that `az deployment group
   validate` passes against `infra/main.bicep` before adding the new resources.
4. **No existing Key Vault** named `kv-workforceplanning-prod` in the RG (name
   must be globally unique, 3-24 chars, alphanumeric + hyphen).
5. **App Service must be created before** the role assignment — the MI
   principal ID is needed for the Key Vault role grant.

## Bicep Changes

### New module: `infra/modules/key-vault.bicep`

Create a new Bicep module following existing conventions (matching API
versions, tag style, param-driven naming).

```
@description('Key Vault name (globally unique, 3-24 chars)')
@minLength(3)
@maxLength(24)
param name string

param location string = resourceGroup().location
param environmentName string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: 'standard'
      family: 'A'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
  tags: {
    environment: environmentName
    application: 'workforceplanning'
  }
}

output id string = keyVault.id
output name string = keyVault.name
output vaultUri string = keyVault.properties.vaultUri
```

### New secret in `infra/modules/key-vault.bicep`

Store the storage connection string as a Key Vault secret. Use a **reference**
to the storage module output rather than hardcoding — the connection string is
already assembled in `storage.bicep:28`.

```
@description('Storage connection string to store as a secret')
param storageConnectionString string

resource storageConnStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVault.name}/storage-connection-string'
  properties: {
    value: storageConnectionString
  }
}
```

### New role assignment for App Service MI

Two options depending on RBAC model chosen:

**Option A (recommended — Azure RBAC on vault):**
```
@description('Principal ID of the App Service System Assigned MI')
param appServicePrincipalId string

resource appServiceSecretsRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, appServicePrincipalId, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/\
e1234-cdef-4a0b-8f6c-1234567890ab'  // Key Vault Secrets User (built-in)
    principalId: appServicePrincipalId
    principalType: 'ServicePrincipal'
  }
}
```

Note: The role definition GUID above is a placeholder — the actual built-in
Role Definition ID for **Key Vault Secrets User** must be looked up at deploy
time via `az role definition list --name "Key Vault Secrets User" --query [].id`.

### Modifications to `infra/modules/app-service.bicep`

1. **Enable System Assigned Managed Identity** on the web app resource:
   ```
   resource webApp 'Microsoft.Web/sites@2025-03-01' = {
     identity: {
       type: 'SystemAssigned'
     }
     // ... existing properties ...
   }
   ```
2. **Remove** the `AZURE_STORAGE_CONNECTION_STRING` app setting from the
   `appSettings` array.
3. **Add** a new app setting pointing to the Key Vault secret URI (as a
   reference):
   ```
   {
     name: 'AZURE_STORAGE_CONNECTION_STRING',
     value: '@Microsoft.KeyVault(SecretUri=${keyVaultSecretUri})'
   }
   ```
   ...or use `@Microsoft.KeyVault(VaultName=...;SecretName=...)` syntax.
   App Service will automatically resolve this via the MI at runtime. **No
   code change is required** if using Key Vault references, since
   `process.env.AZURE_STORAGE_CONNECTION_STRING` will still resolve to the
   actual connection string value.

### Modifications to `infra/modules/app-service-slot.bicep`

Same changes as `app-service.bicep`: enable System Assigned MI, swap the
plaintext app setting for a Key Vault reference.

### Modifications to `infra/main.bicep`

Wire in the new Key Vault module:

```
module keyVault 'modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    name: 'kv-workforceplanning-${environment}'
    location: location
    environmentName: environment
    storageConnectionString: storage.outputs.connectionString
    appServicePrincipalId: app.outputs.principalId  // new output from app-service.bicep
  }
}
```

**Important ordering:** The Key Vault module must be deployed after the storage
module (needs connection string) and after the App Service module (needs the MI
principal ID). Bicep handles implicit dependency ordering via `params`
references, so no explicit `dependsOn` is needed if outputs are threaded
through.

### New output from `app-service.bicep` and `app-service-slot.bicep`

```
output principalId string = webApp.identity.principalId
```

### Modifications to `app-service.bicep` / `app-service-slot.bicep`

- The `storageConnectionString` **param** becomes unused (the value now comes
  from the vault, not an app setting). Either remove it or keep it for the
  slot/legacy path during the transition window.
- Pass `keyVault.outputs.vaultUri` into the app module so it can construct the
  `@Microsoft.KeyVault(...)` reference string. Alternatively, construct the
  reference string in `main.bicep` and pass it in.

## Code Changes

### Approach A: Key Vault References (no code change)

If using App Service Key Vault references (`@Microsoft.KeyVault(...)` in the app
setting value), **no code change is needed**. `process.env.AZURE_STORAGE_CONNECTION_STRING`
will continue to resolve transparently — App Service injects the resolved
secret value at runtime via the MI.

**`src/lib/db/client.ts` stays unchanged.** This is the lowest-risk path.

### Approach B: `@azure/identity` DefaultAzureCredential (code change)

If the team prefers the SDK to fetch the secret directly (e.g., for portability
off App Service or finer control), the client must be modified:

1. **Install dependency:**
   ```
   npm install @azure/identity @azure/keyvault-secrets
   ```

2. **Modify `src/lib/db/client.ts`** to fetch the secret at startup:
   ```typescript
   import { SecretClient } from '@azure/keyvault-secrets';
   import { DefaultAzureCredential } from '@azure/identity';

   let _cachedConnectionString: string | null = null;

   async function loadConnectionStringFromKeyVault(): Promise<string> {
     const vaultUrl = process.env.KEY_VAULT_URI;
     if (!vaultUrl) {
       // Local dev fallback — no vault configured
       return process.env.AZURE_STORAGE_CONNECTION_STRING
         ?? 'UseDevelopmentStorage=true';
     }
     const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
     const secret = await client.getSecret('storage-connection-string');
     return secret.value!;
   }

   export async function getConnectionStringAsync(): Promise<string> {
     if (!_cachedConnectionString) {
       _cachedConnectionString = await loadConnectionStringFromKeyVault();
     }
     return _cachedConnectionString;
   }
   ```

3. **All callers of `getConnectionString()` must become async.** The existing
   `getServiceClient()` and `getTableClient()` are synchronous and construct
   clients from the connection string lazily. Changing them to async touches:
   - `src/lib/db/client.ts` — `getServiceClient()`, `getTableClient()`,
     `ensureTablesExist()`
   - Every call site that uses these helpers (all API routes indirectly via
     data-layer functions in `src/lib/api/`)

4. **Startup initialization:** Add an init step (e.g., in instrumentation or a
   module-level warmup) to pre-fetch the secret at boot rather than on first
   request — avoids cold-latency on the first API call.

**Recommendation: Use Approach A (Key Vault References).** It requires zero
code changes, is the Azure-native pattern, and keeps the secret resolution
transparent. Approach B is documented for completeness and as a fallback if
App Service Key Vault references prove insufficient.

## Migration Steps (zero-downtime ordering)

The migration is designed so the app never loses access to the connection
string during the transition.

### Step 1: Provision Key Vault + secret (no app impact)
1. Add `infra/modules/key-vault.bicep`.
2. Deploy via `az deployment group create -f infra/main.bicep`.
3. Verify the vault exists and the secret is stored:
   ```
   az keyvault secret show --vault-name kv-workforceplanning-prod \
     --name storage-connection-string
   ```
4. **App is unaffected** — still using the plaintext app setting.

### Step 2: Enable System Assigned MI on App Service
1. Add `identity: { type: 'SystemAssigned' }` to `app-service.bicep`.
2. Add the `principalId` output.
3. Deploy.
4. Verify MI is enabled:
   ```
   az webapp identity show --name alicante --resource-group rgWorkforcePlan
   ```
5. **App is unaffected** — MI exists but is unused.

### Step 3: Grant MI access to the Key Vault secret
1. Add the `roleAssignments` resource to `key-vault.bicep` (or
   `main.bicep`).
2. Deploy.
3. Verify the role assignment:
   ```
   az role assignment list --assignee <principalId> --scope <vaultId>
   ```
4. **App is unaffected.**

### Step 4: Swap the app setting to a Key Vault reference
1. Replace the plaintext `AZURE_STORAGE_CONNECTION_STRING` app setting with
   the `@Microsoft.KeyVault(...)` reference in `app-service.bicep`.
2. Deploy.
3. App Service resolves the reference via the MI and injects the actual value.
   `process.env.AZURE_STORAGE_CONNECTION_STRING` continues to work.
4. **Verify:** Check App Service logs / Application Insights for storage
   operations succeeding. Hit any API endpoint (e.g., `GET /api/departments`)
   to confirm data is returned.

### Step 5: Verify and clean up
1. Confirm the app setting no longer shows the plaintext connection string in
   the Portal (it should show "Key vault reference" as the source).
2. Remove the `storageConnectionString` param from `app-service.bicep` if no
   longer needed.
3. Rotate the storage account key once — since the Key Vault secret is now the
   single source, rotating the key and updating the secret is a single
   operation.

### Staging slot
Repeat Steps 2-5 for the staging slot (`app-service-slot.bicep`) if slots are
in use. Note: backlog #1 notes the staging slot does not currently exist in
Azure (only in IaC). This migration can proceed on production without slots,
or be gated behind slot resolution.

## Rollback Plan

At each step, rollback is reverting the Bicep deployment:

| Step | Rollback action |
|------|-----------------|
| 1 (Vault created) | Delete the vault, or leave it unused. No app impact. |
| 2 (MI enabled) | Set `identity: { type: 'None' }` and redeploy. No app impact. |
| 3 (Role granted) | Remove the role assignment resource, redeploy. No app impact. |
| 4 (App setting swapped) | **Revert** `app-service.bicep` to plaintext app setting, redeploy. App Service re-reads the plaintext value. Brief restart required. |

**Key rollback safety:** Because Step 4 is the only step that changes app
behavior, and the connection string value is identical (just sourced
differently), rollback is a config swap + restart. Keep the plaintext app
setting value in a secure location (e.g., a separate Key Vault secret or Azure
CLI retrieval) until Step 5 confirms stability.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MI lacks permission to read secret → app fails to start | Medium | High | Verify role assignment (Step 3) before swapping app setting (Step 4). Test on staging slot first if available. |
| Key Vault reference syntax error → app setting resolves to empty | Low | High | Use exact `@Microsoft.KeyVault(SecretUri=...)` syntax. Verify in Portal that the reference resolves (shows green checkmark). |
| Key Vault network ACL blocks App Service | Low | High | Set `networkAcls.bypass: 'AzureServices'` (trusted services bypass). Default is Allow. |
| Soft-deleted vault blocks redeployment | Low | Medium | `enablePurgeProtection: true` is set — once enabled, cannot be disabled for the vault's lifetime. Use a different vault name if a clean re-deploy is needed. |
| Storage key rotation breaks app | Low | Medium | Secret is the only consumer. Rotate key → update secret → app picks up new value on restart. |
| Local dev breakage | Low | Low | Local dev uses Azurite (`UseDevelopmentStorage=true`) — no vault needed. Code path unchanged for local. |
| Cost of Key Vault | Low | Low | Standard SKU (~$0.03/10k operations). Minimal for a single secret. |
| Secret caching adds latency on cold start | Low | Low | App Service Key Vault references are resolved at app start, cached by the platform. `@azure/identity` path (Approach B) would add ~200ms on first fetch. |

## Dependency Map

```
storage.bicep (connection string output)
    └→ key-vault.bicep (secret stored)
            └→ app-service.bicep (MI enabled, role granted, app setting swapped)
```

Bicep resolves this ordering automatically via parameter threading.

## Decisions Required Before Execution

1. **Approach A (Key Vault references, no code change) vs Approach B
   (`@azure/identity` SDK):** Confirm A.
2. **Key Vault name:** `kv-workforceplanning-prod` — confirm or adjust.
3. **RBAC vs Access Policies:** Confirm Azure RBAC (recommended).
4. **Include staging slot in this migration** or defer until backlog #1 (slot
   reconciliation) is resolved?
5. **Rotate storage key after migration?** Recommended as a clean break.
