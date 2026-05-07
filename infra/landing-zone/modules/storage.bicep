// name: storage | owner agent: A1 | purpose: ADLS Gen2 private data lake storage

targetScope = 'resourceGroup'

param country string
param env string
param location string
param subnetId string
param tags object

resource st 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'udcsp${country}${env}lake'
  location: location
  tags: tags
  sku: { name: 'Standard_GRS' }
  kind: 'StorageV2'
  properties: {
    isHnsEnabled: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Disabled'
    encryption: {
      services: {
        blob: { enabled: true }
        file: { enabled: true }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

resource pe 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: 'udcsp-${country}-${env}-lake-pe'
  location: location
  tags: tags
  properties: {
    subnet: { id: subnetId }
    privateLinkServiceConnections: [{
      name: 'dfs'
      properties: {
        privateLinkServiceId: st.id
        groupIds: ['dfs']
      }
    }]
  }
}

output storageAccountId string = st.id
