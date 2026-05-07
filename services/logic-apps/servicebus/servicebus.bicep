@allowed(['dk','se','no'])
param country string
@allowed(['dev','test','prod'])
param env string
param location string = resourceGroup().location

var tags = {
  country: country
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential'
  owner: 'A7'
}

resource ns 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: 'udcsp-${country}-${env}-sb'
  location: location
  tags: tags
  sku: {
    name: 'Premium'
    tier: 'Premium'
    capacity: 1
  }
}

resource intake 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: ns
  name: 'applications-intake'
  properties: {
    deadLetteringOnMessageExpiration: true
    requiresDuplicateDetection: true
  }
}

resource poison 'Microsoft.ServiceBus/namespaces/queues@2022-10-01-preview' = {
  parent: ns
  name: 'dlq-poison'
  properties: { deadLetteringOnMessageExpiration: true }
}

resource cross 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  parent: ns
  name: 'cross-border-coordination'
  properties: { requiresDuplicateDetection: true }
}

output namespaceName string = ns.name
