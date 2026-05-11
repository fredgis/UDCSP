// name: sentinel-workspace | owner agent: A3 | purpose: Log Analytics workspace with Sentinel enabled (180-day retention to align with EU AI Act Art. 26(6) and NIS2 incident-forensic needs)

targetScope = 'resourceGroup'

param country string
param env string = 'prod'
param location string = resourceGroup().location
param tags object = {}

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'udcsp-${country}-${env}-sentinel-law'
  location: location
  tags: tags
  properties: {
    // Aligned with the platform-wide Log Analytics floor (180 days) so that
    // Sentinel can correlate AI-trace incidents with the same retention
    // window mandated by EU AI Act Art. 26(6). NIS2 (Dir. EU 2022/2555)
    // incident forensics also benefit from the longer hot window.
    retentionInDays: 180
    sku: { name: 'PerGB2018' }
  }
}

resource sentinel 'Microsoft.OperationsManagement/solutions@2015-11-01-preview' = {
  name: 'SecurityInsights(${workspace.name})'
  location: location
  tags: tags
  properties: { workspaceResourceId: workspace.id }
  plan: {
    name: 'SecurityInsights(${workspace.name})'
    product: 'OMSGallery/SecurityInsights'
    publisher: 'Microsoft'
  }
}

output workspaceId string = workspace.id
