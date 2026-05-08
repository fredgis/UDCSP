using './cosmos-account.bicep'

// =============================================================================
// Sweden - Cosmos DB parameters
// =============================================================================

param country = 'se'
param env = 'dev'
param location = 'swedencentral'

param keyVaultId = '/subscriptions/{{se-subscription-id}}/resourceGroups/udcsp-se-platform/providers/Microsoft.KeyVault/vaults/udcsp-se-dev-kv'
param logAnalyticsWorkspaceId = '/subscriptions/{{se-subscription-id}}/resourceGroups/udcsp-se-observability/providers/Microsoft.OperationalInsights/workspaces/udcsp-se-dev-law'
param privateEndpointSubnetId = '/subscriptions/{{se-subscription-id}}/resourceGroups/udcsp-se-network/providers/Microsoft.Network/virtualNetworks/udcsp-se-vnet/subnets/data-pe-subnet'
