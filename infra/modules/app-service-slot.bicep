param name string
param location string
param serverFarmId string
param storageConnectionString string
param keyVaultStorageSecretUri string = ''
param appInsightsConnectionString string = ''
param appInsightsInstrumentationKey string = ''

resource stagingSlot 'Microsoft.Web/sites/slots@2025-03-01' = {
  name: '${name}/staging'
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
      appSettings: [
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
      ]
      webSocketsEnabled: false
      alwaysOn: true
    }
  }
  tags: {
    application: 'workforceplanning'
    environment: 'staging'
  }
}

output defaultHostname string = stagingSlot.properties.defaultHostName
output id string = stagingSlot.id
output name string = stagingSlot.name
output principalId string = stagingSlot.identity.principalId
