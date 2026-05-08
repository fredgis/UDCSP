@description('Country sovereignty zone code. Pinned to dk; do not deploy SE/NO data into this capacity.')
@allowed(['dk'])
param country string = 'dk'
@description('Deployment environment.')
@allowed(['dev','test','preprod','prod'])
param env string = 'dev'
@description('Azure region. DK pins to North Europe (Dublin) - the closest EU public-cloud region with Fabric F-SKU GA. Sovereignty: data never leaves EU.')
@allowed(['northeurope'])
param location string = 'northeurope'
@description('Fabric F-SKU capacity size.')
param capacitySku string = 'F64'
@description('Fabric capacity administrator object IDs or UPNs.')
param adminMembers array = []

var purpose = 'fabric-capacity'
var capacityName = 'udcsp-${country}-${env}-${purpose}'

resource capacity 'Microsoft.Fabric/capacities@2023-11-01' = {
  name: capacityName
  location: location
  sku: { name: capacitySku, tier: 'Fabric' }
  properties: { administration: { members: adminMembers } }
  tags: {
    country: country
    costCenter: 'UDCSP'
    dataResidency: 'EU'
    dataClassification: 'Confidential-Citizen'
    owner: 'A4'
  }
}

output capacityName string = capacity.name
output capacityId string = capacity.id
