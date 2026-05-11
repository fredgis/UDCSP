// name: networking | owner agent: A1 | purpose: hub-spoke VNet, subnets, NSGs, optional hub peering

targetScope = 'resourceGroup'

param country string
param env string
param location string
param addressPrefix string
param hubVnetId string = ''
@description('Optional Azure DDoS Protection Standard plan resource ID. When set, the spoke VNet is attached to this plan. Set by the Install-Ddos phase after the plan is created.')
param ddosProtectionPlanId string = ''
param tags object

var name = 'udcsp-${country}-${env}'
var subnetSpecs = [
  { name: 'web', prefix: cidrSubnet(addressPrefix, 24, 1) }
  { name: 'app', prefix: cidrSubnet(addressPrefix, 24, 2) }
  { name: 'data', prefix: cidrSubnet(addressPrefix, 24, 3) }
  { name: 'integration', prefix: cidrSubnet(addressPrefix, 24, 4) }
  { name: 'ai', prefix: cidrSubnet(addressPrefix, 24, 5) }
]

// AzureBastionSubnet must be a /26 minimum and is owned by the LandingZone
// (not by the Bastion module) so that re-deploying the LandingZone is fully
// idempotent. The Bastion module references this subnet via `existing`.
// Index 1000 places the subnet at .250.0/26 (1000 * 64 IPs = third octet 250),
// matching the historical layout the Bastion module originally used.
var bastionSubnetPrefix = cidrSubnet(addressPrefix, 26, 1000)

resource nsgs 'Microsoft.Network/networkSecurityGroups@2023-09-01' = [for s in subnetSpecs: {
  name: '${name}-${s.name}-nsg'
  location: location
  tags: tags
}]

// LandingZone owns ALL subnets (named workload subnets + AzureBastionSubnet).
// Inline declaration is the canonical ARM pattern and keeps the LZ
// authoritative — other modules (Bastion, Postgres delegated, Apim, etc.)
// must reference subnets via `existing` instead of creating their own.
var workloadSubnets = [for (s, i) in subnetSpecs: {
  name: s.name
  properties: {
    addressPrefix: s.prefix
    networkSecurityGroup: { id: nsgs[i].id }
    privateEndpointNetworkPolicies: 'Disabled'
  }
}]
var bastionSubnet = {
  name: 'AzureBastionSubnet'
  properties: {
    addressPrefix: bastionSubnetPrefix
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: '${name}-vnet'
  location: location
  tags: tags
  properties: union({
    addressSpace: { addressPrefixes: [addressPrefix] }
    subnets: concat(workloadSubnets, [bastionSubnet])
  }, empty(ddosProtectionPlanId) ? {} : {
    enableDdosProtection: true
    ddosProtectionPlan: { id: ddosProtectionPlanId }
  })
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

