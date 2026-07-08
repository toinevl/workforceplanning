param name string
param location string
param serverFarmId string
param storageConnectionString string
param appInsightsConnectionString string = ''
param appInsightsInstrumentationKey string = ''

resource webApp 'Microsoft.Web/sites@2025-03-01' = {
  name: name
  location: location
  properties: {
    serverFarmId: serverFarmId
    httpsOnly: true
    siteConfig: {
      nodeVersion: '22.22.2'
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
      alwaysOn: true  // Requires Basic+ plan; ignored on Free tier
    }
  }
  tags: {
    application: 'workforceplanning'
  }
}

output defaultHostname string = webApp.properties.defaultHostName
output id string = webApp.id
output name string = webApp.name
