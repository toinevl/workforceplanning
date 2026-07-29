param name string
param location string
param serverFarmId string
param storageConnectionString string
param keyVaultStorageSecretUri string = ''
param appInsightsConnectionString string = ''
param appInsightsInstrumentationKey string = ''

// ── Settings that exist on the live app and MUST be reproduced here ──────────
//
// siteConfig.appSettings replaces the whole collection. Any setting the live
// app has but this template omits is deleted on deploy. Before wishlist #35
// this module wrote 7 settings while the app had 14, so deploying it would
// have removed every AUTH_* value — breaking sign-in and reopening the
// anonymous access hole — and dropped WEBSITE_RUN_FROM_PACKAGE, leaving the
// app with no code to run.
//
// These are Key Vault *references*, not secrets: the values are URIs, and the
// secrets stay in the vault, read by the app's managed identity.

@description('Key Vault reference URI for the Entra client secret.')
param authEntraClientSecretUri string = ''

@description('Entra application (client) ID. Not a secret.')
param authEntraClientId string = ''

@description('Entra single-tenant issuer URL. Not a secret.')
param authEntraIssuer string = ''

@description('Key Vault reference URI for the Auth.js session signing secret.')
param authSecretUri string = ''

@description('Canonical app URL, no trailing slash. Used by Auth.js for callbacks.')
param authUrl string = ''

@description('Storage account name. Set by create_tableaccess.sh for the managed-identity path.')
param storageAccountName string = ''

@description('''Current WEBSITE_RUN_FROM_PACKAGE value. The deploy pipeline owns this
setting and rewrites it every run. Pass the value the app is serving now, or the
deployment will delete it and the app will have no package to boot from:
  az webapp config appsettings list -g <rg> -n <app> \\
    --query "[?name=='WEBSITE_RUN_FROM_PACKAGE'].value | [0]" -o tsv''')
param runFromPackageUrl string = ''

var optionalSettings = concat(
  empty(authEntraClientId) ? [] : [{ name: 'AUTH_MICROSOFT_ENTRA_ID_ID', value: authEntraClientId }],
  empty(authEntraIssuer) ? [] : [{ name: 'AUTH_MICROSOFT_ENTRA_ID_ISSUER', value: authEntraIssuer }],
  empty(authEntraClientSecretUri) ? [] : [{ name: 'AUTH_MICROSOFT_ENTRA_ID_SECRET', value: '@Microsoft.KeyVault(SecretUri=${authEntraClientSecretUri})' }],
  empty(authSecretUri) ? [] : [{ name: 'AUTH_SECRET', value: '@Microsoft.KeyVault(SecretUri=${authSecretUri})' }],
  empty(authUrl) ? [] : [{ name: 'AUTH_URL', value: authUrl }],
  empty(storageAccountName) ? [] : [{ name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storageAccountName }],
  empty(runFromPackageUrl) ? [] : [{ name: 'WEBSITE_RUN_FROM_PACKAGE', value: runFromPackageUrl }]
)

resource webApp 'Microsoft.Web/sites@2025-03-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: serverFarmId
    httpsOnly: true
    siteConfig: {
      nodeVersion: '22.22.2'
      appCommandLine: 'node server.js'
      // Appended only when supplied. An empty param means "not managed here",
      // so the setting is simply not written by this template. It is NOT safe
      // to omit one the live app depends on — see the note at the top.
      appSettings: concat([
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: empty(keyVaultStorageSecretUri) ? storageConnectionString : '@Microsoft.KeyVault(SecretUri=${keyVaultStorageSecretUri})'
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
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsightsInstrumentationKey
        }
      ], optionalSettings)
      webSocketsEnabled: false
      // F1 Free does not support Always On. Setting it true on a Free plan
      // fails the deployment. Cost of leaving it off: the app idles out after
      // ~20 min, so the first request afterwards pays a cold start.
      alwaysOn: false
    }
  }
  tags: {
    application: 'workforceplanning'
  }
}

output defaultHostname string = webApp.properties.defaultHostName
output id string = webApp.id
output name string = webApp.name
output principalId string = webApp.identity.principalId
