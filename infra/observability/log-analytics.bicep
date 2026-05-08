// name: log-analytics | owner agent: A5 | purpose: central country workspace with 180-day hot retention (EU AI Act Art. 26(6) floor) and archive policy marker

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
    // EU AI Act Art. 26(6) requires deployers of high-risk systems to keep
    // automatically generated logs for at least 6 months from the date each
    // log is created. Hot retention is set to 180 days; cold/archive
    // retention (730 days) is exposed as an output for the lifecycle policy.
    retentionInDays: 180
    features: { enableLogAccessUsingOnlyResourcePermissions: true }
    sku: { name: 'PerGB2018' }
  }
}

output workspaceId string = law.id
output archiveRetentionDays int = 730
