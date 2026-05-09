// name: ddos-protection-plan | owner agent: A3 | purpose: shared L3/L4 DDoS protection for sovereign VNets

targetScope = 'resourceGroup'

param planName string = 'udcsp-shared-ddos-plan'
param location string = 'westeurope'
param vnetAssociations array = []

var tags = {
  purpose: 'ddos-l3l4'
  costCenter: 'UDCSP'
  owner: 'A3'
}

resource plan 'Microsoft.Network/ddosProtectionPlans@2023-09-01' = {
  name: planName
  location: location
  tags: tags
}

module associations 'vnet-association.bicep' = [for association in vnetAssociations: {
  name: 'ddos-${association.country}-${uniqueString(association.vnetName)}'
  scope: resourceGroup(association.subscriptionId, association.resourceGroupName)
  params: {
    country: association.country
    location: association.location
    vnetName: association.vnetName
    addressPrefixes: association.addressPrefixes
    subnets: contains(association, 'subnets') ? association.subnets : []
    ddosProtectionPlanId: plan.id
    tags: contains(association, 'tags') ? association.tags : tags
  }
}]

output ddosProtectionPlanId string = plan.id

