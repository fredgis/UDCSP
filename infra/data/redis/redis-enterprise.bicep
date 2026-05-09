// =============================================================================
// UDCSP - Azure Cache for Redis Enterprise per sovereign country zone
//
// Replaces the ephemeral Cosmos DB slice: slot filling, session state and
// in-flight drafts before durable commit to PostgreSQL.
// =============================================================================

targetScope = 'resourceGroup'

@description('Country sovereignty zone code.')
@allowed(['dk','se','no'])
param country string

@description('Deployment environment.')
@allowed(['dev','test','preprod','prod'])
param env string = 'dev'

@description('Primary Azure region for this Redis Enterprise cluster. MUST be the country EU region.')
@allowed(['northeurope','swedencentral','norwayeast'])
param location string

@description('Resource ID of the per-country Key Vault hosting the Redis CMK key.')
param keyVaultId string

@description('Name of the wrap key inside the country Key Vault.')
param cmkKeyName string = 'udcsp-redis-cmk'

@description('Resource ID of the country Log Analytics workspace.')
param logAnalyticsWorkspaceId string

@description('Resource ID of the subnet to deploy the private endpoint into.')
param privateEndpointSubnetId string

@description('Redis SKU. Enterprise_E10 is required for CMK, Private Endpoint and Entra-enabled production; Basic_C0 is a dev override only.')
@allowed(['Enterprise_E10','Basic_C0'])
param skuName string = 'Enterprise_E10'

@description('Redis Enterprise capacity.')
param capacity int = 2

@description('Optional Microsoft Entra object IDs that receive Redis Data Owner access-policy assignments.')
param dataOwnerObjectIds array = []

var purpose = 'redis'
var clusterName = toLower('udcsp-${country}-${env}-${purpose}')
var keyVaultName = last(split(keyVaultId, '/'))
var cmkKeyUri = 'https://${keyVaultName}.${environment().suffixes.keyvaultDns}/keys/${cmkKeyName}'
var databaseNames = [
  'slot-filling-cache'
  'session-state'
  'application-drafts-ephemeral'
]
var tags = {
  country: country
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential-Citizen'
  owner: 'A4'
}

resource cluster 'Microsoft.Cache/redisEnterprise@2026-02-01-preview' = {
  name: clusterName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: skuName
    capacity: capacity
  }
  properties: {
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    encryption: {
      customerManagedKeyEncryption: {
        keyEncryptionKeyUrl: cmkKeyUri
        keyEncryptionKeyIdentity: {
          identityType: 'systemAssignedIdentity'
        }
      }
    }
    highAvailability: env == 'prod' ? 'Enabled' : 'Disabled'
  }
  tags: tags
}

resource databases 'Microsoft.Cache/redisEnterprise/databases@2026-02-01-preview' = [for databaseName in databaseNames: {
  parent: cluster
  name: databaseName
  properties: {
    accessKeysAuthentication: 'Disabled'
    clientProtocol: 'Encrypted'
    clusteringPolicy: 'EnterpriseCluster'
    evictionPolicy: 'NoEviction'
    persistence: {
      aofEnabled: false
      rdbEnabled: false
    }
  }
}]

resource slotAccessPolicyAssignments 'Microsoft.Cache/redisEnterprise/databases/accessPolicyAssignments@2026-02-01-preview' = [for objectId in dataOwnerObjectIds: {
  parent: databases[0]
  name: uniqueString(cluster.id, databaseNames[0], objectId)
  properties: {
    accessPolicyName: 'default'
    user: {
      objectId: objectId
    }
  }
}]

resource sessionAccessPolicyAssignments 'Microsoft.Cache/redisEnterprise/databases/accessPolicyAssignments@2026-02-01-preview' = [for objectId in dataOwnerObjectIds: {
  parent: databases[1]
  name: uniqueString(cluster.id, databaseNames[1], objectId)
  properties: {
    accessPolicyName: 'default'
    user: {
      objectId: objectId
    }
  }
}]

resource draftsAccessPolicyAssignments 'Microsoft.Cache/redisEnterprise/databases/accessPolicyAssignments@2026-02-01-preview' = [for objectId in dataOwnerObjectIds: {
  parent: databases[2]
  name: uniqueString(cluster.id, databaseNames[2], objectId)
  properties: {
    accessPolicyName: 'default'
    user: {
      objectId: objectId
    }
  }
}]

resource diag 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: cluster
  name: 'redis-to-loganalytics'
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      { categoryGroup: 'allLogs', enabled: true }
    ]
    metrics: [
      { category: 'AllMetrics', enabled: true }
    ]
  }
}

resource pe 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: '${clusterName}-pe'
  location: location
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'redis-enterprise'
        properties: {
          privateLinkServiceId: cluster.id
          groupIds: ['redisEnterprise']
        }
      }
    ]
  }
  tags: tags
}

output hostName string = cluster.properties.hostName
output primaryEndpoint string = '${cluster.properties.hostName}:10000'
output redisVersion string = cluster.properties.redisVersion
