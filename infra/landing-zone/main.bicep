// name: landing-zone-main | owner agent: A1 | purpose: subscription entry point for one sovereign zone

targetScope = 'subscription'

@allowed(['dk','se','no'])
param country string
@allowed(['dev','test','prod'])
param env string = 'prod'
param location string
param addressPrefix string
param hubVnetId string = ''
@description('Optional Azure DDoS Protection Standard plan resource ID. Threaded into the networking module to attach the spoke VNet to the shared DDoS plan.')
param ddosProtectionPlanId string = ''

var tags = {
  costCenter: 'UDCSP'
  country: toUpper(country)
  dataResidency: 'EU'
  dataClassification: 'Restricted'
  owner: 'A1'
}
var rgName = 'udcsp-${country}-${env}-platform-rg'

resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: rgName
  location: location
  tags: tags
}

module network 'modules/networking.bicep' = {
  name: 'network-${country}-${env}'
  scope: rg
  params: {
    country: country
    env: env
    location: location
    addressPrefix: addressPrefix
    hubVnetId: hubVnetId
    ddosProtectionPlanId: ddosProtectionPlanId
    tags: tags
  }
}

module kv 'modules/keyvault.bicep' = {
  name: 'kv-${country}-${env}'
  scope: rg
  params: {
    country: country
    env: env
    location: location
    subnetId: network.outputs.dataSubnetId
    tags: tags
  }
}

module lake 'modules/storage.bicep' = {
  name: 'lake-${country}-${env}'
  scope: rg
  params: {
    country: country
    env: env
    location: location
    subnetId: network.outputs.dataSubnetId
    tags: tags
  }
}

module acr 'modules/acr.bicep' = {
  name: 'acr-${country}-${env}'
  scope: rg
  params: {
    country: country
    env: env
    location: location
    subnetId: network.outputs.integrationSubnetId
    tags: tags
  }
}

module mg 'modules/management-groups.bicep' = {
  name: 'mg-hierarchy-${country}-${env}'
  params: {
    tags: tags
  }
}
