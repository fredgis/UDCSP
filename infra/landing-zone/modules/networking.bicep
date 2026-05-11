// name: networking | owner agent: A1 | purpose: hub-spoke VNet, subnets, NSGs, optional hub peering

targetScope = 'resourceGroup'

param country string
param env string
param location string
param addressPrefix string
param hubVnetId string = ''
param tags object

var name = 'udcsp-${country}-${env}'
var subnetSpecs = [
  { name: 'web', prefix: cidrSubnet(addressPrefix, 24, 1) }
  { name: 'app', prefix: cidrSubnet(addressPrefix, 24, 2) }
  { name: 'data', prefix: cidrSubnet(addressPrefix, 24, 3) }
  { name: 'integration', prefix: cidrSubnet(addressPrefix, 24, 4) }
  { name: 'ai', prefix: cidrSubnet(addressPrefix, 24, 5) }
]

resource nsgs 'Microsoft.Network/networkSecurityGroups@2023-09-01' = [for s in subnetSpecs: {
  name: '${name}-${s.name}-nsg'
  location: location
  tags: tags
}]

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: '${name}-vnet'
  location: location
  tags: tags
  properties: {
    addressSpace: { addressPrefixes: [addressPrefix] }
    subnets: [for (s, i) in subnetSpecs: {
      name: s.name
      properties: {
        addressPrefix: s.prefix
        networkSecurityGroup: { id: nsgs[i].id }
        privateEndpointNetworkPolicies: 'Disabled'
      }
    }]
  }
}

resource toHub 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-09-01' = if (!empty(hubVnetId)) {
  parent: vnet
  name: 'to-federation-hub'
  properties: {
    remoteVirtualNetwork: { id: hubVnetId }
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
  }
}

output dataSubnetId string = vnet.properties.subnets[2].id
output integrationSubnetId string = vnet.properties.subnets[3].id

