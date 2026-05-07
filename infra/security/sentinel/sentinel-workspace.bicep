// name: sentinel-workspace | owner agent: A3 | purpose: Log Analytics workspace with Sentinel enabled

targetScope = 'resourceGroup'

param country string
param env string = 'prod'
param location string
param tags object

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'udcsp-${country}-${env}-sentinel-law'
  location: location
  tags: tags
  properties: {
    retentionInDays: 90
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
