// name: confidential-compute | owner agent: A3 | purpose: confidential ACA environment for eligibility PII orchestration

targetScope = 'resourceGroup'

param country string
param env string = 'prod'
param location string
param infrastructureSubnetId string
param logAnalyticsWorkspaceId string
param workloadProfileType string = 'Confidential-Standard-NC8as-T4-v5'
param minimumCount int = 1
param maximumCount int = 3

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
  properties: {
    vnetConfiguration: {
      infrastructureSubnetId: infrastructureSubnetId
      internal: true
    }
    workloadProfiles: [
      {
        name: 'eligibility-tee'
        workloadProfileType: workloadProfileType
        minimumCount: minimumCount
        maximumCount: maximumCount
      }
    ]
    zoneRedundant: true
  }
}

resource diagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
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

