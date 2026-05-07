@allowed(['dk','se','no'])
param country string
@allowed(['dev','test','prod'])
param env string
param location string = resourceGroup().location
param publisherEmail string
param publisherName string = 'UDCSP Platform'
param additionalLocations array = [
  {
    location: 'swedencentral'
    capacity: 1
  }
  {
    location: 'norwayeast'
    capacity: 1
  }
]

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
    name: 'Premium'
    capacity: 1
  }
  identity: { type: 'SystemAssigned' }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
    virtualNetworkType: 'External'
    publicNetworkAccess: 'Enabled'
    additionalLocations: additionalLocations
    customProperties: {
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Protocols.Server.Http2': 'True'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls12': 'True'
    }
  }
}

output apimName string = apim.name
output principalId string = apim.identity.principalId
