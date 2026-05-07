// name: log-analytics | owner agent: A5 | purpose: central country workspace with 90-day retention and archive policy marker

targetScope = 'resourceGroup'

param country string
param env string = 'prod'
param location string
param tags object

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'udcsp-${country}-${env}-law'
  location: location
  tags: tags
  properties: {
    retentionInDays: 90
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
    sku: { name: 'PerGB2018' }
  }
}

output workspaceId string = law.id
output archiveRetentionDays int = 730
