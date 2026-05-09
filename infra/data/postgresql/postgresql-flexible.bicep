// =============================================================================
// UDCSP - PostgreSQL Flexible Server per sovereign country zone
//
// Replaces Azure SQL reference/glossary stores and the >24h draft slice that
// previously lived in Cosmos DB.
// =============================================================================

targetScope = 'resourceGroup'

@description('Country sovereignty zone code.')
@allowed(['dk','se','no'])
param country string

@description('Deployment environment.')
@allowed(['dev','test','preprod','prod'])
param env string = 'dev'

@description('Primary Azure region for this PostgreSQL server. MUST be the country EU region.')
@allowed(['northeurope','swedencentral','norwayeast'])
param location string

@description('Resource ID of the per-country Key Vault hosting the PostgreSQL CMK key.')
param keyVaultId string

@description('Name of the wrap key inside the country Key Vault.')
param cmkKeyName string = 'udcsp-postgres-cmk'

@description('Resource ID of the country Log Analytics workspace.')
param logAnalyticsWorkspaceId string

@description('Resource ID of the subnet to deploy the private endpoint into.')
param privateEndpointSubnetId string

@description('PostgreSQL compute SKU. Use Standard_B2s/Burstable-like values for dev only if explicitly overridden; production default is Standard_D2ds_v5.')
param skuName string = 'Standard_D2ds_v5'

@description('PostgreSQL SKU tier. Defaults to GeneralPurpose in prod, Burstable otherwise.')
@allowed(['Burstable','GeneralPurpose'])
param skuTier string = env == 'prod' ? 'GeneralPurpose' : 'Burstable'

@description('Optional user-assigned identity resource ID for CMK access. Empty uses system-assigned identity.')
param userAssignedIdentityId string = ''

@description('Optional Microsoft Entra admin object ID for the server.')
param entraAdminObjectId string = ''

@description('Optional Microsoft Entra admin login name for the server.')
param entraAdminPrincipalName string = ''

var purpose = 'postgres'
var serverName = toLower('udcsp-${country}-${env}-${purpose}')
var keyVaultName = last(split(keyVaultId, '/'))
var cmkKeyUri = 'https://${keyVaultName}.${environment().suffixes.keyvaultDns}/keys/${cmkKeyName}'
var databaseNames = [
  'udcsp_reference'
  'udcsp_drafts'
  'udcsp_glossaries'
]
var tags = {
  country: country
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential-Citizen'
  owner: 'A4'
}

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2026-01-01-preview' = {
  name: serverName
  location: location
  identity: empty(userAssignedIdentityId) ? {
    type: 'SystemAssigned'
  } : {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: '16'
    network: {
      publicNetworkAccess: 'Disabled'
    }
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Disabled'
      tenantId: tenant().tenantId
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: env == 'prod' ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: env == 'prod' ? 'ZoneRedundant' : 'Disabled'
    }
    dataEncryption: empty(userAssignedIdentityId) ? {
      type: 'AzureKeyVault'
      primaryKeyURI: cmkKeyUri
    } : {
      type: 'AzureKeyVault'
      primaryKeyURI: cmkKeyUri
      primaryUserAssignedIdentityId: userAssignedIdentityId
    }
  }
  tags: tags
}

resource databases 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2025-08-01' = [for databaseName in databaseNames: {
  parent: server
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}]

resource pgExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2025-08-01' = {
  parent: server
  name: 'azure.extensions'
  properties: {
    value: 'pg_partman'
    source: 'user-override'
  }
}

resource aadAdmin 'Microsoft.DBforPostgreSQL/flexibleServers/administrators@2025-08-01' = if (!empty(entraAdminObjectId) && !empty(entraAdminPrincipalName)) {
  parent: server
  name: entraAdminObjectId
  properties: {
    principalName: entraAdminPrincipalName
    principalType: 'User'
    tenantId: tenant().tenantId
  }
}

resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: server
  name: 'postgres-to-loganalytics'
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      { category: 'PostgreSQLLogs', enabled: true }
      { category: 'PostgreSQLFlexSessions', enabled: true }
      { category: 'PostgreSQLFlexQueryStoreRuntime', enabled: true }
      { category: 'PostgreSQLFlexQueryStoreWaitStats', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

resource pe 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: '${serverName}-pe'
  location: location
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'postgresql-flexible'
        properties: {
          privateLinkServiceId: server.id
          groupIds: ['postgresqlServer']
        }
      }
    ]
  }
  tags: tags
}

output serverName string = server.name
output serverId string = server.id
output fqdn string = server.properties.fullyQualifiedDomainName
output databaseNames array = databaseNames
