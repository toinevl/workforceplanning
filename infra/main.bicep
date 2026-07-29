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

// WARNING — this module cannot currently host `alicante`.
//
// A site can only be moved between App Service plans in the same *webspace*,
// and a webspace is bound to the resource group that owns the plan. The live
// site sits in webspace `rgWebsite-PolandCentralwebspace-Linux` because its
// plan has always lived in rgWebsite. A plan created here lands in
// `rgWorkforcePlan-PolandCentralwebspace-Linux`, and assigning the site to it
// fails with Conflict 59602 "due to hosting constraints".
//
// The live F1 plan is therefore `wfp-plan-free` in rgWebsite, not this one.
// Deploying this template as-is produces an unusable empty plan — exactly the
// waste wishlist #31 removed. Reconciling it means recreating the site in this
// resource group's webspace (wishlist #35), not editing this file.
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

// No staging slot: deployment slots require Standard tier or higher, and this
// app runs on F1 Free (wishlist #32). modules/app-service-slot.bicep is kept
// for reference but is intentionally not instantiated — reinstating it means
// moving back to S1 and paying for it.

output appUrl string = 'https://${app.outputs.defaultHostname}'
output storageAccountName string = storage.outputs.name
output appInsightsName string = insights.outputs.name
output appPrincipalId string = app.outputs.principalId
output storageConnectionString string = storage.outputs.connectionString
