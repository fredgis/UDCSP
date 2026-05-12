// =============================================================================
// UDCSP - Azure Cache for Redis (Premium tier) per sovereign country zone
//
// Replaces the ephemeral Cosmos DB slice: slot filling, session state and
// in-flight drafts before durable commit to PostgreSQL. Uses key prefixes
// (slot:*, session:*, draft:*) to separate workloads on a single instance.
//
// Note: Azure Managed Redis (new Microsoft.Cache/redisEnterprise SKUs) is
// preferred but requires zone capability that MCAPS sandboxes do not expose.
// Classic Premium tier supports CMK, Private Endpoint, Entra auth, and zones.
// =============================================================================

targetScope = 'resourceGroup'

@description('Country sovereignty zone code.')
@allowed(['dk','se','no'])
param country string

@description('Deployment environment.')
@allowed(['dev','test','preprod','prod'])
param env string = 'dev'

@description('Primary Azure region for this Redis cluster.')
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

@description('Premium SKU capacity (1=6GB, 2=13GB, 3=26GB, 4=53GB, 5=120GB).')
@allowed([1,2,3,4,5])
param capacity int = 1

@description('Enable customer-managed key encryption. Requires a UA identity already permitted on the KV key; default off.')
param enableCmk bool = false

@description('Resource ID of a UA identity granted on the KV key (required when enableCmk=true).')
param cmkUserAssignedIdentityId string = ''

@description('Optional Microsoft Entra object IDs to grant Redis Data Owner via aadObjectIds policy.')
param dataOwnerObjectIds array = []

var purpose = 'redis'
var clusterName = toLower('udcsp-${country}-${env}-${purpose}')
var keyVaultName = last(split(keyVaultId, '/'))
var cmkKeyUri = 'https://${keyVaultName}.${environment().suffixes.keyvaultDns}/keys/${cmkKeyName}'
var tags = {
  country: country
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential-Citizen'
  owner: 'A4'
}

var redisPropsBase = {
  sku: {
    name: 'Premium'
    family: 'P'
    capacity: capacity
  }
  enableNonSslPort: false
  minimumTlsVersion: '1.2'
  publicNetworkAccess: 'Disabled'
  redisConfiguration: {
    'aad-enabled': 'true'
  }
}
var redisPropsCmk = enableCmk ? {
  customerManagedKeyEncryption: {
    keyEncryptionKeyUrl: cmkKeyUri
    keyEncryptionKeyIdentity: {
      identityType: 'userAssignedIdentity'
      userAssignedIdentityResourceId: cmkUserAssignedIdentityId
    }
  }
} : {}

resource cluster 'Microsoft.Cache/redis@2024-11-01' = {
  name: clusterName
  location: location
  identity: enableCmk ? {
    type: 'UserAssigned'
    userAssignedIdentities: { '${cmkUserAssignedIdentityId}': {} }
  } : {
    type: 'SystemAssigned'
  }
  properties: union(redisPropsBase, redisPropsCmk)
  tags: tags
}

resource accessPolicyAssignments 'Microsoft.Cache/redis/accessPolicyAssignments@2024-11-01' = [for objectId in dataOwnerObjectIds: {
  parent: cluster
  name: uniqueString(cluster.id, objectId)
  properties: {
    accessPolicyName: 'Data Owner'
    objectId: objectId
    objectIdAlias: objectId
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
        name: 'redis'
        properties: {
          privateLinkServiceId: cluster.id
          groupIds: ['redisCache']
        }
      }
    ]
  }
  tags: tags
}

output hostName string = cluster.properties.hostName
output primaryEndpoint string = '${cluster.properties.hostName}:${cluster.properties.sslPort}'