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

// Note: the Key Vault is not created here. It is provisioned by main-kv.bicep
// as a second pass, because the vault's role assignments need the App Service
// managed-identity principalIds that this template outputs.

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: storageAccountName
    location: location
    environmentName: environment
  }
}

// App Service plan — Linux F1 Free in rgWorkforcePlan.
// The site and its plan now live in the same resource group / webspace,
// so Bicep can own the full infrastructure. (Previously the plan lived
// in rgWebsite due to webspace binding constraints — resolved by #35.)
module plan 'modules/app-service-plan.bicep' = {
  name: 'appServicePlan'
  params: {
    name: 'wfp-plan-free'
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

// No staging slot: deployment slots require Standard tier or higher, and this
// app runs on F1 Free (wishlist #32). modules/app-service-slot.bicep is kept
// for reference but is intentionally not instantiated — reinstating it means
// moving back to S1 and paying for it.

output appUrl string = 'https://${app.outputs.defaultHostname}'
output storageAccountName string = storage.outputs.name
output appInsightsName string = insights.outputs.name
output appPrincipalId string = app.outputs.principalId
output storageConnectionString string = storage.outputs.connectionString
