// name: keyvault | owner agent: A1 | purpose: private RBAC Key Vault with soft-delete and purge protection

targetScope = 'resourceGroup'

param country string
param env string
param location string
param subnetId string
param tags object

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'udcsp-${country}-${env}-kv'
  location: location
  tags: tags
  properties: {
    tenantId: tenant().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Disabled'
  }
}

resource pe 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: '${vault.name}-pe'
  location: location
  tags: tags
  properties: {
    subnet: { id: subnetId }
    privateLinkServiceConnections: [{
      name: 'kv'
      properties: {
        privateLinkServiceId: vault.id
        groupIds: ['vault']
      }
    }]
  }
}

output keyVaultId string = vault.id
