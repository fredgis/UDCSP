// name: confidential-compute | owner agent: A3 | purpose: confidential ACA environment for eligibility PII orchestration

targetScope = 'resourceGroup'

param country string = 'shared'
param env string = 'prod'
param location string = resourceGroup().location
param infrastructureSubnetId string = ''
param logAnalyticsWorkspaceId string = ''
param workloadProfileType string = 'Consumption'
param minimumCount int = 0
param maximumCount int = 3
param zoneRedundant bool = false

var tags = {
  purpose: 'eligibility-tee'
  costCenter: 'UDCSP'
  owner: 'A3'
  country: toUpper(country)
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'udcsp-${country}-${env}-eligibility-tee-env'
  location: location
  tags: tags
  properties: union({
    workloadProfiles: workloadProfileType == 'Consumption' ? [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ] : [
      {
        name: 'eligibility-tee'
        workloadProfileType: workloadProfileType
        minimumCount: minimumCount
        maximumCount: maximumCount
      }
    ]
    zoneRedundant: zoneRedundant
  }, empty(infrastructureSubnetId) ? {} : {
    vnetConfiguration: {
      infrastructureSubnetId: infrastructureSubnetId
      internal: true
    }
  })
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(logAnalyticsWorkspaceId)) {
  name: 'send-to-log-analytics'
  scope: environment
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'ContainerAppConsoleLogs'
        enabled: true
      }
      {
        category: 'ContainerAppSystemLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output environmentId string = environment.id
output defaultDomain string = environment.properties.defaultDomain
output staticIp string = environment.properties.staticIp

