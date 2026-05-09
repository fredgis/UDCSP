// name: vnet-association | owner agent: A3 | purpose: attach an existing VNet shape to a DDoS protection plan

targetScope = 'resourceGroup'

param country string
param location string
param vnetName string
param addressPrefixes array
param subnets array = []
param ddosProtectionPlanId string
param tags object = {
  purpose: 'ddos-l3l4'
  costCenter: 'UDCSP'
  owner: 'A3'
}

// Same VNet name/address/subnet shape must be supplied from the landing-zone deployment.
// This keeps the PUT idempotent while adding the DDoS association.
resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: vnetName
  location: location
  tags: union(tags, {
    country: toUpper(country)
  })
  properties: {
    addressSpace: {
      addressPrefixes: addressPrefixes
    }
    enableDdosProtection: true
    ddosProtectionPlan: {
      id: ddosProtectionPlanId
    }
    subnets: subnets
  }
}

output associatedVnetId string = vnet.id

