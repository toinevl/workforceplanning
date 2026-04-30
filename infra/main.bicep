targetScope = 'resourceGroup'

@description('Base name for all resources')
param appName string = 'workforceplanning'

@description('Azure region')
param location string = resourceGroup().location

@description('Environment suffix')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

var uniqueSuffix = uniqueString(resourceGroup().id)

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: '${appName}${uniqueSuffix}'
    location: location
    environment: environment
  }
}

module plan 'modules/app-service-plan.bicep' = {
  name: 'appServicePlan'
  params: {
    name: '${appName}-plan-${environment}'
    location: location
  }
}

module app 'modules/app-service.bicep' = {
  name: 'appService'
  params: {
    name: '${appName}-${environment}'
    location: location
    serverFarmId: plan.outputs.id
    storageConnectionString: storage.outputs.connectionString
  }
}

output appUrl string = 'https://${app.outputs.defaultHostname}'
output storageAccountName string = storage.outputs.name
