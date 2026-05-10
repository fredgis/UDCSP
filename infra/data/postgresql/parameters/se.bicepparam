using '../postgresql-flexible.bicep'

// =============================================================================
// Sweden - PostgreSQL Flexible Server parameters
// =============================================================================

param country = 'se'
param env = 'prod'
param location = 'swedencentral'

param keyVaultId = '/subscriptions/{{se-subscription-id}}/resourceGroups/udcsp-se-prod-platform-rg/providers/Microsoft.KeyVault/vaults/udcsp-se-prod-kv'
param logAnalyticsWorkspaceId = '/subscriptions/{{se-subscription-id}}/resourceGroups/udcsp-se-observability-rg/providers/Microsoft.OperationalInsights/workspaces/udcsp-se-prod-law'
param privateEndpointSubnetId = '/subscriptions/{{se-subscription-id}}/resourceGroups/udcsp-se-prod-platform-rg/providers/Microsoft.Network/virtualNetworks/udcsp-se-prod-vnet/subnets/data'
