@description('Key Vault name (globally unique, 3-24 chars, alphanumeric + hyphen)')
@minLength(3)
@maxLength(24)
param name string

param location string

param environmentName string

@description('Storage connection string to store as a secret')
param storageConnectionString string

@description('Principal ID of the App Service System Assigned MI')
param appServicePrincipalId string

@description('Principal ID of the staging slot System Assigned MI')
param stagingSlotPrincipalId string = ''

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: 'standard'
      family: 'A'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
  tags: {
    environment: environmentName
    application: 'workforceplanning'
  }
}

resource storageConnStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVault.name}/storage-connection-string'
  properties: {
    value: storageConnectionString
  }
}

resource appServiceSecretsRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, appServicePrincipalId, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/4633458b-17de-408a-b874-0445c86b69e6'
    principalId: appServicePrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource stagingSlotSecretsRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(stagingSlotPrincipalId)) {
  scope: keyVault
  name: guid(keyVault.id, stagingSlotPrincipalId, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: '/providers/Microsoft.Authorization/roleDefinitions/4633458b-17de-408a-b874-0445c86b69e6'
    principalId: stagingSlotPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output id string = keyVault.id
output name string = keyVault.name
output vaultUri string = keyVault.properties.vaultUri
output storageSecretUri string = storageConnStringSecret.properties.id
