@description('Country sovereignty zone code.')
param country string = 'dk'
@description('Deployment environment.')
param env string = 'dev'
@description('Azure region for the country zone.')
param location string
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
