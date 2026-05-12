@allowed(['dk','se','no'])
param country string
@allowed(['dev','test','prod'])
param env string
param location string = resourceGroup().location
param publisherEmail string
param publisherName string = 'UDCSP Platform'
@allowed(['Developer','Basic','Standard','Premium'])
param skuName string = 'Developer'
param skuCapacity int = 1
param additionalLocations array = []
param virtualNetworkType string = 'None'

var name = 'udcsp-${country}-${env}-apim'
var tags = {
  country: country
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential'
  owner: 'A7'
}

resource apim 'Microsoft.ApiManagement/service@2023-09-01-preview' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: skuName
    capacity: skuCapacity
  }
  identity: { type: 'SystemAssigned' }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
    virtualNetworkType: virtualNetworkType
    publicNetworkAccess: 'Enabled'
    additionalLocations: skuName == 'Premium' ? additionalLocations : []
    customProperties: {
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Protocols.Server.Http2': 'True'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls12': 'True'
    }
  }
}

output apimName string = apim.name
output principalId string = apim.identity.principalId
