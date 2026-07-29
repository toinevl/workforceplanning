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

// The storage account is in North Europe while the app is in Poland Central.
// This is deliberate only in the sense that it is the existing state: the
// account predates the app's move to Poland Central, and a storage account
// cannot change region without copying the data to a new one. Passing
// `location` here would try to recreate it in Poland Central and fail with
// InvalidResourceLocation, which is one of two reasons this template could
// not be deployed at all before wishlist #35.
//
// Cost of the mismatch: every table query crosses regions. Worth revisiting
// if latency matters, but that is a data migration, not a template change.
@description('Region of the storage account. Intentionally differs from `location` — see note above.')
param storageLocation string = 'northeurope'

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    name: storageAccountName
    location: storageLocation
    environmentName: environment
  }
}

// The App Service plan is referenced, not created (wishlist #35).
//
// A site can only belong to a plan in the same *webspace*, and a webspace is
// bound to the resource group that owns the plan. `alicante` sits in webspace
// `rgWebsite-PolandCentralwebspace-Linux` because its plan has always lived in
// rgWebsite. A plan created here would land in
// `rgWorkforcePlan-PolandCentralwebspace-Linux` and assigning the site to it
// fails with Conflict 59602, "due to hosting constraints".
//
// So a `module` here could only ever produce an empty, unusable plan — which is
// exactly the EUR 24.66/month waste removed in #31, and almost certainly how
// that waste was created. Referencing the real plan keeps this template
// deployable and truthful.
//
// modules/app-service-plan.bicep is retained: it is the definition of record
// for the plan's shape (F1, Linux) and is what a future consolidation would
// use if the site is ever recreated in this resource group's webspace.
@description('Resource group holding the App Service plan. Not this one — see above.')
param planResourceGroup string = 'rgWebsite'

@description('Existing App Service plan that hosts the site.')
param planName string = 'wfp-plan-free'

resource plan 'Microsoft.Web/serverfarms@2025-03-01' existing = {
  name: planName
  scope: resourceGroup(planResourceGroup)
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
// Settings the live app depends on but this template did not previously model.
// Omitting any of them deletes it on deploy — see the note in app-service.bicep.
// These are Key Vault reference URIs and IDs, not secret values.
@description('Key Vault reference URI for the Entra client secret.')
param authEntraClientSecretUri string = ''

@description('Entra application (client) ID.')
param authEntraClientId string = ''

@description('Entra single-tenant issuer URL.')
param authEntraIssuer string = ''

@description('Key Vault reference URI for the Auth.js signing secret.')
param authSecretUri string = ''

@description('Canonical app URL, no trailing slash. Must match the site\'s own hostname — a slot swap once left this pointing at the staging slot, which broke sign-in.')
param authUrl string = ''

@description('Current WEBSITE_RUN_FROM_PACKAGE value. Pass the value the app is serving now, or the deployment removes it and the app has no package to boot. The deploy pipeline owns this setting.')
param runFromPackageUrl string = ''

module app 'modules/app-service.bicep' = {
  name: 'appService'
  params: {
    name: appServiceName
    location: location
    serverFarmId: plan.id
    storageConnectionString: storage.outputs.connectionString
    keyVaultStorageSecretUri: ''
    appInsightsConnectionString: insights.outputs.connectionString
    appInsightsInstrumentationKey: insights.outputs.instrumentationKey
    authEntraClientSecretUri: authEntraClientSecretUri
    authEntraClientId: authEntraClientId
    authEntraIssuer: authEntraIssuer
    authSecretUri: authSecretUri
    authUrl: authUrl
    storageAccountName: storageAccountName
    runFromPackageUrl: runFromPackageUrl
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
