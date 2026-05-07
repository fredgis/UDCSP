// name: acr | owner agent: A1 | purpose: Premium ACR with private endpoint for signed container supply chain

targetScope = 'resourceGroup'

param country string
param env string
param location string
param subnetId string
param tags object

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'udcsp${country}${env}acr'
  location: location
  tags: tags
  sku: { name: 'Premium' }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Disabled'
    policies: {
      trustPolicy: { type: 'Notary', status: 'enabled' }
      retentionPolicy: { days: 30, status: 'enabled' }
    }
  }
}

resource pe 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: 'udcsp-${country}-${env}-acr-pe'
  location: location
  tags: tags
  properties: {
    subnet: { id: subnetId }
    privateLinkServiceConnections: [{
      name: 'registry'
      properties: {
        privateLinkServiceId: acr.id
        groupIds: ['registry']
      }
    }]
  }
}

output acrLoginServer string = acr.properties.loginServer
