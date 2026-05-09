// name: chaos-studio | owner agent: A3 | purpose: enable Chaos Studio targets on resilience-critical resources

targetScope = 'resourceGroup'

param location string = resourceGroup().location
param targetResources array = [
  {
    name: 'apim'
    resourceId: ''
    targetType: 'Microsoft-AzureResource'
  }
  {
    name: 'Container Apps'
    resourceId: ''
    targetType: 'Microsoft-AzureResource'
  }
  {
    name: 'postgresql'
    resourceId: ''
    targetType: 'Microsoft-AzureResource'
  }
  {
    name: 'redis'
    resourceId: ''
    targetType: 'Microsoft-AzureResource'
  }
  {
    name: 'd365-mock'
    resourceId: ''
    targetType: 'Microsoft-AzureResource'
  }
]

var tags = {
  purpose: 'resilience-validation'
  costCenter: 'UDCSP'
  owner: 'A3'
}

resource experiment 'Microsoft.Chaos/experiments@2023-11-01-preview' = {
  name: 'udcsp-chaos-target-registry'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    selectors: [
      {
        name: 'registered-targets'
        type: 'List'
        targets: [for target in targetResources: {
          type: 'ChaosTarget'
          id: target.resourceId
        }]
      }
    ]
    steps: [
      {
        name: 'registry-only'
        branches: [
          {
            name: 'no-op'
            actions: []
          }
        ]
      }
    ]
  }
}

output experimentId string = experiment.id
output enabledTargetResourceIds array = [for target in targetResources: target.resourceId]
