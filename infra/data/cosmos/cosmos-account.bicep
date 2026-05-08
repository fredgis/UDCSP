// =============================================================================
// UDCSP - Cosmos DB account per sovereign country zone
//
// Realisation of:
//   - docs/tech/data.md Zone 1 (operational draft / cache / session)
//   - docs/tech/architecture.md sec.8 (Data & Analytics)
//
// Sovereignty:
//   - Single write region pinned per country (no replication outside the
//     country's primary EU region).
//   - Customer-managed key (CMK) wrapped by the country Key Vault.
//   - Microsoft Entra ID only (local-auth disabled). No connection strings.
//   - Private endpoint into the country VNet; public network access denied.
//
// Compliance anchors:
//   - GDPR Art. 5(1)(c) data minimisation: 30-day TTL on drafts, 24h on cache.
//   - GDPR Art. 32(1)(a) encryption: CMK + TLS 1.2+ + AAD-only.
//   - EU AI Act Art. 26(6): operational store; AI traces live in App Insights
//     and OneLake, NOT here.
// =============================================================================

@description('Country sovereignty zone code.')
@allowed(['dk','se','no'])
param country string

@description('Deployment environment.')
@allowed(['dev','test','preprod','prod'])
param env string = 'dev'

@description('Primary Azure region for this Cosmos account. MUST be the country EU region.')
@allowed(['northeurope','swedencentral','norwayeast'])
param location string

@description('Resource ID of the per-country Key Vault hosting the CMK key.')
param keyVaultId string

@description('Name of the wrap key inside the country Key Vault.')
param cmkKeyName string = 'udcsp-cosmos-cmk'

@description('Resource ID of the country Log Analytics workspace.')
param logAnalyticsWorkspaceId string

@description('Resource ID of the subnet to deploy the private endpoint into.')
param privateEndpointSubnetId string

@description('Microsoft Entra ID object IDs that should hold the Cosmos DB Built-in Data Reader role on this account (caseworkers, eligibility agent MI, etc).')
param dataReaderObjectIds array = []

@description('Microsoft Entra ID object IDs that should hold the Cosmos DB Built-in Data Contributor role on this account (citizen-assistant agent MI, draft-save endpoint MI).')
param dataContributorObjectIds array = []

// ----------------------------------------------------------------------------
// Naming
// ----------------------------------------------------------------------------
var purpose      = 'cosmos'
var accountName  = toLower('udcsp-${country}-${env}-${purpose}')
var databaseName = 'udcsp-citizen-state'

// ----------------------------------------------------------------------------
// Account
// ----------------------------------------------------------------------------
resource account 'Microsoft.DocumentDB/databaseAccounts@2024-08-15' = {
  name: accountName
  location: location
  kind: 'GlobalDocumentDB'
  identity: { type: 'SystemAssigned' }
  properties: {
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    disableLocalAuth: true
    publicNetworkAccess: 'Disabled'
    minimalTlsVersion: 'Tls12'
    capabilities: [
      { name: 'EnableServerless' }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: true
      }
    ]
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: { tier: 'Continuous30Days' }
    }
    keyVaultKeyUri: 'https://${last(split(keyVaultId, '/'))}.vault.azure.net/keys/${cmkKeyName}'
    networkAclBypass: 'AzureServices'
    networkAclBypassResourceIds: []
  }
  tags: {
    country: country
    costCenter: 'UDCSP'
    dataResidency: 'EU'
    dataClassification: 'Confidential-Citizen'
    owner: 'A4'
  }
}

// ----------------------------------------------------------------------------
// Database + containers
// ----------------------------------------------------------------------------
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-08-15' = {
  parent: account
  name: databaseName
  properties: {
    resource: { id: databaseName }
  }
}

resource cApplicationDrafts 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  parent: database
  name: 'application-drafts'
  properties: {
    resource: {
      id: 'application-drafts'
      partitionKey: { paths: ['/citizenId'], kind: 'Hash' }
      defaultTtl: 2592000
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/_etag/?' }]
      }
    }
  }
}

resource cSlotFillingCache 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  parent: database
  name: 'slot-filling-cache'
  properties: {
    resource: {
      id: 'slot-filling-cache'
      partitionKey: { paths: ['/sessionId'], kind: 'Hash' }
      defaultTtl: 86400
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/_etag/?' }]
      }
    }
  }
}

resource cSessionState 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-08-15' = {
  parent: database
  name: 'session-state'
  properties: {
    resource: {
      id: 'session-state'
      partitionKey: { paths: ['/sessionId'], kind: 'Hash' }
      defaultTtl: 28800
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [{ path: '/*' }]
        excludedPaths: [{ path: '/_etag/?' }]
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Diagnostic settings -> per-country Log Analytics
// ----------------------------------------------------------------------------
resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: account
  name: 'cosmos-to-loganalytics'
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      { category: 'DataPlaneRequests',         enabled: true }
      { category: 'ControlPlaneRequests',      enabled: true }
      { category: 'QueryRuntimeStatistics',    enabled: true }
      { category: 'PartitionKeyStatistics',    enabled: true }
      { category: 'PartitionKeyRUConsumption', enabled: true }
    ]
    metrics: [
      { category: 'Requests', enabled: true }
    ]
  }
}

// ----------------------------------------------------------------------------
// Private endpoint into the country VNet
// ----------------------------------------------------------------------------
resource pe 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: '${accountName}-pe'
  location: location
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'cosmos-sql'
        properties: {
          privateLinkServiceId: account.id
          groupIds: ['Sql']
        }
      }
    ]
  }
  tags: {
    country: country
    costCenter: 'UDCSP'
    owner: 'A4'
  }
}

// ----------------------------------------------------------------------------
// AAD data-plane RBAC (no master keys ever leave the account)
// ----------------------------------------------------------------------------
var cosmosDataReaderRoleId      = '00000000-0000-0000-0000-000000000001'
var cosmosDataContributorRoleId = '00000000-0000-0000-0000-000000000002'

resource readerAssignments 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-08-15' = [for oid in dataReaderObjectIds: {
  parent: account
  name: guid(account.id, oid, 'reader')
  properties: {
    roleDefinitionId: '${account.id}/sqlRoleDefinitions/${cosmosDataReaderRoleId}'
    principalId: oid
    scope: account.id
  }
}]

resource contributorAssignments 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-08-15' = [for oid in dataContributorObjectIds: {
  parent: account
  name: guid(account.id, oid, 'contributor')
  properties: {
    roleDefinitionId: '${account.id}/sqlRoleDefinitions/${cosmosDataContributorRoleId}'
    principalId: oid
    scope: account.id
  }
}]

// ----------------------------------------------------------------------------
// Outputs
// ----------------------------------------------------------------------------
output accountName string = account.name
output accountId string = account.id
output databaseName string = database.name
output endpoint string = account.properties.documentEndpoint
output privateEndpointId string = pe.id
