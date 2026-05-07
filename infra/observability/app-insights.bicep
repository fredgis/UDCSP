// name: app-insights | owner agent: A5 | purpose: workspace-based Application Insights per workload

targetScope = 'resourceGroup'

param country string
param env string = 'prod'
param location string
param workloadName string
param workspaceResourceId string
param tags object

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: 'udcsp-${country}-${env}-${workloadName}-appi'
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspaceResourceId
    IngestionMode: 'LogAnalytics'
  }
}

output instrumentationKey string = appi.properties.InstrumentationKey
output connectionString string = appi.properties.ConnectionString
