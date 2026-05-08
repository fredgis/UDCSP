@description('Country sovereignty zone code. Pinned to no; do not deploy DK/SE data into this capacity.')
@allowed(['no'])
param country string = 'no'
@description('Deployment environment.')
@allowed(['dev','test','preprod','prod'])
param env string = 'dev'
@description('Azure region. NO pins to Norway East (Oslo) - sovereign Norwegian region required by Personopplysningsloven for public-sector data.')
@allowed(['norwayeast'])
param location string = 'norwayeast'
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
