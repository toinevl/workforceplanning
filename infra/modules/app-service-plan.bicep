param name string
param location string

@description('App Service plan SKU. F1 = Free (no Always On, no slots, 60 CPU-min/day); B1 = Basic (Always On, no slots); S1 = Standard (Always On + deployment slots).')
@allowed(['F1', 'B1', 'S1'])
param skuName string = 'F1'

var tier = skuName == 'S1' ? 'Standard' : skuName == 'B1' ? 'Basic' : 'Free'
var family = skuName == 'S1' ? 'S' : skuName == 'B1' ? 'B' : 'F'

resource appServicePlan 'Microsoft.Web/serverfarms@2025-03-01' = {
  name: name
  location: location
  sku: {
    name: skuName
    tier: tier
    size: skuName
    family: family
    capacity: 1
  }
  properties: {
    // Linux plan. The app is `app,linux` running NODE|22-lts; reserved:false
    // would provision a Windows plan the site cannot run on.
    reserved: true
  }
}

output id string = appServicePlan.id
output name string = appServicePlan.name
