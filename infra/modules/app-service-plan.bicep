param name string
param location string

@description('App Service plan SKU. B1 = Basic (supports Always On); F1 = Free (no Always On).')
@allowed(['F1', 'B1'])
param skuName string = 'B1'

var tier = skuName == 'B1' ? 'Basic' : 'Free'
var family = skuName == 'B1' ? 'B' : 'F'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
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
