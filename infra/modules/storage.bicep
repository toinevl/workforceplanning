@description('Storage account name (3-24 lowercase alphanumeric)')
param name string

param location string
param environmentName string

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: take(replace(name, '-', ''), 24)
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
  tags: {
    environment: environmentName
    application: 'workforceplanning'
  }
}

var connectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${az.environment().suffixes.storage}'

output connectionString string = connectionString
output name string = storageAccount.name
output id string = storageAccount.id
