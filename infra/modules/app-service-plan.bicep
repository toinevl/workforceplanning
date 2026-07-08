param name string
param location string

@description('App Service plan SKU. S1 = Standard (supports Always On + deployment slots); B1 = Basic (Always On, no slots); F1 = Free (no Always On).')
@allowed(['F1', 'B1', 'S1'])
param skuName string = 'S1'

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
    reserved: false
  }
}

output id string = appServicePlan.id
output name string = appServicePlan.name
