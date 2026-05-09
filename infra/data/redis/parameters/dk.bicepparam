using '../redis-enterprise.bicep'

// =============================================================================
// Denmark - Redis Enterprise parameters
// =============================================================================

param country = 'dk'
param env = 'dev'
param location = 'northeurope'

// Filled in by the installer from the bootstrap Key Vault. The values here
// are the resource-naming convention so that operators can dry-run with a
// real config later.
param keyVaultId = '/subscriptions/{{dk-subscription-id}}/resourceGroups/udcsp-dk-platform/providers/Microsoft.KeyVault/vaults/udcsp-dk-dev-kv'
param logAnalyticsWorkspaceId = '/subscriptions/{{dk-subscription-id}}/resourceGroups/udcsp-dk-observability/providers/Microsoft.OperationalInsights/workspaces/udcsp-dk-dev-law'
param privateEndpointSubnetId = '/subscriptions/{{dk-subscription-id}}/resourceGroups/udcsp-dk-network/providers/Microsoft.Network/virtualNetworks/udcsp-dk-vnet/subnets/data-pe-subnet'
