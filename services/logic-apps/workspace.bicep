@allowed(['dk','se','no'])
param country string
@allowed(['dev','test','prod'])
param env string
param location string = resourceGroup().location
param storageAccountName string = toLower('udcsp${country}${env}lawork')
param appInsightsConnectionString string
param dataSubnetId string = resourceId(subscription().subscriptionId, 'udcsp-${country}-${env}-platform-rg', 'Microsoft.Network/virtualNetworks/subnets', 'udcsp-${country}-${env}-vnet', 'data')

var tags = {
  country: country
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential'
  owner: 'A7'
}

var storageDataRoleDefinitionIds = [
  'b7e6dc6d-f1e8-4753-8033-0f276bb0955b' // Storage Blob Data Owner
  '0c867c2a-1d8c-454a-a3db-ab2ea1bdc8bb' // Storage File Data SMB Share Contributor
]

var storagePrivateEndpointSubresources = [
  'blob'
  'file'
]

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      bypass: 'None'
      defaultAction: 'Deny'
    }
  }
}

resource storagePrivateEndpoints 'Microsoft.Network/privateEndpoints@2023-09-01' = [for subresource in storagePrivateEndpointSubresources: {
  name: '${storage.name}-${subresource}-pe'
  location: location
  tags: tags
  properties: {
    subnet: { id: dataSubnetId }
    privateLinkServiceConnections: [{
      name: subresource
      properties: {
        privateLinkServiceId: storage.id
        groupIds: [subresource]
      }
    }]
  }
}]

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'udcsp-${country}-${env}-logic-plan'
  location: location
  tags: tags
  sku: {
    name: 'WS1'
    tier: 'WorkflowStandard'
  }
  kind: 'elastic'
}

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: 'udcsp-${country}-${env}-logic'
  location: location
  tags: tags
  kind: 'functionapp,workflowapp'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'APPINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
        { name: 'AzureWebJobsStorage__accountName', value: storage.name }
        { name: 'AzureWebJobsStorage__credential', value: 'managedidentity' }
      ]
    }
  }
}

resource storageDataRoleAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for roleDefinitionId in storageDataRoleDefinitionIds: {
  name: guid(storage.id, app.id, roleDefinitionId)
  scope: storage
  properties: {
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitionId)
  }
}]

output logicAppName string = app.name
output principalId string = app.identity.principalId
