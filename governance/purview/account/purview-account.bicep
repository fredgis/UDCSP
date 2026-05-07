@description('Country or federated governance scope.')
param country string = 'eu'
@description('Deployment environment.')
param env string = 'dev'
@description('Azure region for Purview account.')
param location string
@description('Resource name suffix purpose.')
param purpose string = 'purview'

var accountName = 'udcsp-${country}-${env}-${purpose}'

resource account 'Microsoft.Purview/accounts@2021-12-01' = {
  name: accountName
  location: location
  sku: { name: 'Standard', capacity: 1 }
  properties: {
    publicNetworkAccess: 'Disabled'
    managedResourceGroupName: 'udcsp-${country}-${env}-purview-managed-rg'
  }
  tags: {
    country: country
    costCenter: 'UDCSP'
    dataResidency: 'EU'
    dataClassification: 'Restricted-Cross-Border'
    owner: 'A13'
  }
}

output purviewAccountName string = account.name
