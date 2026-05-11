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

var validTargets = filter(targetResources, t => !empty(t.resourceId))

resource experiment 'Microsoft.Chaos/experiments@2024-01-01' = if (!empty(validTargets)) {
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
        targets: [for target in validTargets: {
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

output experimentId string = empty(validTargets) ? '' : experiment.id
output enabledTargetResourceIds array = [for target in validTargets: target.resourceId]
