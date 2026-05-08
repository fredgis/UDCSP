@description('Country sovereignty zone code. Pinned to se; do not deploy DK/NO data into this capacity.')
@allowed(['se'])
param country string = 'se'
@description('Deployment environment.')
@allowed(['dev','test','preprod','prod'])
param env string = 'dev'
@description('Azure region. SE pins to Sweden Central - the only Microsoft cloud region with full Fabric F-SKU and OneLake GA inside Sweden.')
@allowed(['swedencentral'])
param location string = 'swedencentral'
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
