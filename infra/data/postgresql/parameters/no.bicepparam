using '../postgresql-flexible.bicep'

// =============================================================================
// Norway - PostgreSQL Flexible Server parameters
// =============================================================================

param country = 'no'
param env = 'dev'
param location = 'norwayeast'

param keyVaultId = '/subscriptions/{{no-subscription-id}}/resourceGroups/udcsp-no-platform/providers/Microsoft.KeyVault/vaults/udcsp-no-dev-kv'
param logAnalyticsWorkspaceId = '/subscriptions/{{no-subscription-id}}/resourceGroups/udcsp-no-observability/providers/Microsoft.OperationalInsights/workspaces/udcsp-no-dev-law'
param privateEndpointSubnetId = '/subscriptions/{{no-subscription-id}}/resourceGroups/udcsp-no-network/providers/Microsoft.Network/virtualNetworks/udcsp-no-vnet/subnets/data-pe-subnet'
