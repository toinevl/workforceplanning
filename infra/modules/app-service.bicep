param name string
param location string
param serverFarmId string
param storageConnectionString string

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: name
  location: location
  properties: {
    serverFarmId: serverFarmId
    httpsOnly: true
    siteConfig: {
      nodeVersion: '~20'
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
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
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

output defaultHostname string = webApp.properties.defaultHostName
output id string = webApp.id
output name string = webApp.name
