@allowed(['dk','se','no'])
param country string
@allowed(['dev','test','prod'])
param env string
param location string = resourceGroup().location
param containerAppsEnvironmentId string
param rulesImage string

var tags = {
  country: country
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential'
  owner: 'A7'
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'udcsp-${country}-${env}-fn-plan'
  location: location
  tags: tags
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

resource scan 'Microsoft.Web/sites@2023-12-01' = {
  name: 'udcsp-${country}-${env}-virus-scan'
  location: location
  tags: tags
  kind: 'functionapp'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: { appSettings: [{ name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }] }
  }
}

resource enrich 'Microsoft.Web/sites@2023-12-01' = {
  name: 'udcsp-${country}-${env}-correlation-enricher'
  location: location
  tags: tags
  kind: 'functionapp'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: { appSettings: [{ name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }] }
  }
}

resource rules 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'udcsp-${country}-${env}-eligibility-rules'
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      ingress: {
        external: false
        targetPort: 8080
      }
    }
    template: {
      containers: [
        {
          name: 'rules'
          image: rulesImage
          env: [{ name: 'COUNTRY', value: country }]
        }
      ]
    }
  }
}
