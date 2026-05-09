// name: recovery-services-vault | owner agent: A3 | purpose: sovereign country Recovery Services vaults with CMK

targetScope = 'subscription'

@allowed(['dev', 'test', 'preprod', 'prod'])
param env string = 'prod'

param countryVaults array = [
  {
    country: 'dk'
    resourceGroupName: 'udcsp-dk-prod-platform-rg'
    location: 'denmarkeast'
    keyUri: ''
  }
  {
    country: 'se'
    resourceGroupName: 'udcsp-se-prod-platform-rg'
    location: 'swedencentral'
    keyUri: ''
  }
  {
    country: 'no'
    resourceGroupName: 'udcsp-no-prod-platform-rg'
    location: 'norwayeast'
    keyUri: ''
  }
]

var backupStorageRedundancy = env == 'prod' ? 'GeoRedundant' : 'ZoneRedundant'

module vaults 'recovery-services-vault-country.bicep' = [for vault in countryVaults: {
  name: 'rsv-${vault.country}-${env}'
  scope: resourceGroup(vault.resourceGroupName)
  params: {
    country: vault.country
    env: env
    location: vault.location
    keyUri: vault.keyUri
    backupStorageRedundancy: backupStorageRedundancy
  }
}]

output vaultIds array = [for (vault, i) in countryVaults: vaults[i].outputs.vaultId]

