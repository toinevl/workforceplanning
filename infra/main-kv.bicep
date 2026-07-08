targetScope = 'resourceGroup'

#disable-next-line no-loc-expr-outside-params
@description('Azure region')
param location string = resourceGroup().location

@description('Environment suffix')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Key Vault name')
@minLength(3)
@maxLength(24)
param keyVaultName string = 'kv-workforceplanning-${environment}'

@description('Storage account name')
param storageAccountName string = 'saworkforceplan'

@description('App Service name')
param appServiceName string = 'alicante'

@description('Storage connection string (plaintext, used to seed the Key Vault secret)')
param storageConnectionString string

@description('App Service principal ID (from main.bicep output)')
param appPrincipalId string

@description('Staging slot principal ID (from main.bicep output)')
param stagingPrincipalId string

// Resolve the storage connection string from the existing storage account if not provided
module storage 'modules/storage.bicep' = {
  name: 'storage-kv'
  params: {
    name: storageAccountName
    location: location
    environmentName: environment
  }
}

module keyVault 'modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    name: keyVaultName
    location: location
    environmentName: environment
    storageConnectionString: storageConnectionString != '' ? storageConnectionString : storage.outputs.connectionString
    appServicePrincipalId: appPrincipalId
    stagingSlotPrincipalId: stagingPrincipalId
  }
}

output keyVaultName string = keyVault.outputs.name
output keyVaultUri string = keyVault.outputs.vaultUri
output storageSecretUri string = keyVault.outputs.storageSecretUri
