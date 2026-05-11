// name: chaos-experiments | owner agent: A3 | purpose: baseline off-prod resilience experiments

targetScope = 'resourceGroup'

param location string = resourceGroup().location
param apimResourceId string
param postgresResourceId string
param redisResourceId string
param durationIso string = 'PT10M'

var tags = {
  purpose: 'slo-validation'
  costCenter: 'UDCSP'
  owner: 'A3'
}

resource apimFailure 'Microsoft.Chaos/experiments@2024-01-01' = {
  name: 'apim-region-failure'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    selectors: [
      {
        name: 'apim'
        type: 'List'
        targets: [
          {
            type: 'ChaosTarget'
            id: apimResourceId
          }
        ]
      }
    ]
    steps: [
      {
        name: 'simulate-apim-regional-loss'
        branches: [
          {
            name: 'apim-branch'
            actions: [
              {
                name: 'apim-region-failure'
                type: 'delay'
                duration: durationIso
              }
            ]
          }
        ]
      }
    ]
  }
}

resource postgresFailover 'Microsoft.Chaos/experiments@2024-01-01' = {
  name: 'postgres-failover'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    selectors: [
      {
        name: 'postgres'
        type: 'List'
        targets: [
          {
            type: 'ChaosTarget'
            id: postgresResourceId
          }
        ]
      }
    ]
    steps: [
      {
        name: 'trigger-postgres-failover-window'
        branches: [
          {
            name: 'postgres-branch'
            actions: [
              {
                name: 'postgres-failover'
                type: 'delay'
                duration: durationIso
              }
            ]
          }
        ]
      }
    ]
  }
}

resource redisEviction 'Microsoft.Chaos/experiments@2024-01-01' = {
  name: 'redis-cache-eviction-storm'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    selectors: [
      {
        name: 'redis'
        type: 'List'
        targets: [
          {
            type: 'ChaosTarget'
            id: redisResourceId
          }
        ]
      }
    ]
    steps: [
      {
        name: 'eviction-storm-window'
        branches: [
          {
            name: 'redis-branch'
            actions: [
              {
                name: 'redis-cache-eviction-storm'
                type: 'delay'
                duration: durationIso
              }
            ]
          }
        ]
      }
    ]
  }
}

output experimentIds array = [
  apimFailure.id
  postgresFailover.id
  redisEviction.id
]

