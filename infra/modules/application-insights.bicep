@description('Application Insights name')
param name string

@description('Azure region')
param location string = resourceGroup().location

@description('Environment suffix')
param environment string

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: name
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
  tags: {
    environment: environment
    application: 'workforceplanning'
  }
}

output id string = insights.id
output name string = insights.name
output connectionString string = insights.properties.ConnectionString
