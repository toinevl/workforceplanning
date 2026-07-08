targetScope = 'resourceGroup'

@description('Base name for all resources')
param appName string = 'workforceplanning'

@description('App Service name')
param appServiceName string = 'alicante'

@description('Azure region')
param location string = resourceGroup().location

@description('Environment suffix')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Existing or desired Storage account name for Azure Tables')
@minLength(3)
@maxLength(24)
param storageAccountName string = 'saworkforceplan'

@description('Key Vault name (globally unique, 3-24 chars, alphanumeric + hyphen)')
@minLength(3)
@maxLength(24)
param keyVaultName string = 'kv-wfp-${environment}'

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: storageAccountName
    location: location
    environmentName: environment
  }
}

module plan 'modules/app-service-plan.bicep' = {
  name: 'appServicePlan'
  params: {
    name: '${appName}-plan-${environment}'
    location: location
  }
}

module insights 'modules/application-insights.bicep' = {
  name: 'appInsights'
  params: {
    name: '${appName}-ai-${environment}'
    location: location
    environment: environment
  }
}

// Phase 1: Deploy app + slot WITHOUT Key Vault reference (plaintext fallback).
// Key Vault module needs the MI principalIds, creating a circular dependency.
// The main-kv.bicep overlay resolves this in a second deployment pass.
module app 'modules/app-service.bicep' = {
  name: 'appService'
  params: {
    name: appServiceName
    location: location
    serverFarmId: plan.outputs.id
    storageConnectionString: storage.outputs.connectionString
    keyVaultStorageSecretUri: ''
    appInsightsConnectionString: insights.outputs.connectionString
    appInsightsInstrumentationKey: insights.outputs.instrumentationKey
  }
}

module stagingSlot 'modules/app-service-slot.bicep' = {
  name: 'stagingSlot'
  params: {
    name: appServiceName
    location: location
    serverFarmId: plan.outputs.id
    storageConnectionString: storage.outputs.connectionString
    keyVaultStorageSecretUri: ''
    appInsightsConnectionString: insights.outputs.connectionString
    appInsightsInstrumentationKey: insights.outputs.instrumentationKey
  }
}

output appUrl string = 'https://${app.outputs.defaultHostname}'
output stagingUrl string = 'https://${stagingSlot.outputs.defaultHostname}'
output storageAccountName string = storage.outputs.name
output appInsightsName string = insights.outputs.name
output appPrincipalId string = app.outputs.principalId
output stagingPrincipalId string = stagingSlot.outputs.principalId
output storageConnectionString string = storage.outputs.connectionString
