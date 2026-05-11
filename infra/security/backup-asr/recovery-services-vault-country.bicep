// name: recovery-services-vault-country | owner agent: A3 | purpose: per-country Recovery Services vault implementation

targetScope = 'resourceGroup'

param country string
param env string
param location string
param keyUri string
@allowed(['GeoRedundant', 'ZoneRedundant', 'LocallyRedundant'])
param backupStorageRedundancy string
@description('Enable Cross-Region Restore. Requires GRS. Disable for sovereign regions where the paired region is restricted (e.g. norwaywest in MCAPS sandbox).')
param enableCrossRegionRestore bool = true

var tags = {
  purpose: 'bcdr'
  costCenter: 'UDCSP'
  owner: 'A3'
  country: toUpper(country)
}

resource vault 'Microsoft.RecoveryServices/vaults@2023-02-01' = {
  name: 'udcsp-${country}-${env}-rsv'
  location: location
  tags: tags
  sku: {
    name: 'RS0'
    tier: 'Standard'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    publicNetworkAccess: 'Disabled'
    securitySettings: {
      immutabilitySettings: {
        state: 'Unlocked'
      }
      softDeleteSettings: {
        softDeleteState: 'Enabled'
      }
    }
    encryption: empty(keyUri) ? null : {
      infrastructureEncryption: 'Enabled'
      kekIdentity: {
        useSystemAssignedIdentity: true
      }
      keyVaultProperties: {
        keyUri: keyUri
      }
    }
  }
}

resource storageConfig 'Microsoft.RecoveryServices/vaults/backupstorageconfig@2023-02-01' = {
  parent: vault
  name: 'vaultstorageconfig'
  properties: {
    storageModelType: backupStorageRedundancy
    storageType: backupStorageRedundancy
    storageTypeState: 'Unlocked'
    crossRegionRestoreFlag: backupStorageRedundancy == 'GeoRedundant' && enableCrossRegionRestore
  }
}

output vaultId string = vault.id
output vaultName string = vault.name
output principalId string = vault.identity.principalId

