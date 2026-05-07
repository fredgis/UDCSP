// name: se-b2c | owner agent: A2 | purpose: country Azure AD B2C tenant scaffold

targetScope = 'resourceGroup'

param env string = 'prod'
param location string = 'europe'
param displayName string = 'UDCSP SE B2C'

resource tenant 'Microsoft.AzureActiveDirectory/b2cDirectories@2023-01-18-preview' = {
  name: 'udcsp-se-${env}.onmicrosoft.com'
  location: location
  sku: {
    name: 'PremiumP1'
    tier: 'A0'
  }
  properties: {
    createTenantProperties: {
      displayName: displayName
      countryCode: 'SE'
    }
  }
}

output tenantResourceId string = tenant.id
