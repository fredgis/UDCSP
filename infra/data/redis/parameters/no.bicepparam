using '../redis-enterprise.bicep'

// =============================================================================
// Norway - Redis Enterprise parameters
// =============================================================================

param country = 'no'
param env = 'prod'
param location = 'norwayeast'

param keyVaultId = '/subscriptions/{{no-subscription-id}}/resourceGroups/udcsp-no-prod-platform-rg/providers/Microsoft.KeyVault/vaults/udcsp-no-prod-kv'
param logAnalyticsWorkspaceId = '/subscriptions/{{no-subscription-id}}/resourceGroups/udcsp-no-observability-rg/providers/Microsoft.OperationalInsights/workspaces/udcsp-no-prod-law'
param privateEndpointSubnetId = '/subscriptions/{{no-subscription-id}}/resourceGroups/udcsp-no-prod-platform-rg/providers/Microsoft.Network/virtualNetworks/udcsp-no-prod-vnet/subnets/data'
