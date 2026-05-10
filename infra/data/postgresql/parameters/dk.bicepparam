using '../postgresql-flexible.bicep'

// =============================================================================
// Denmark - PostgreSQL Flexible Server parameters
// =============================================================================

param country = 'dk'
param env = 'prod'
param location = 'northeurope'

// Filled in by the installer from the bootstrap Key Vault. The values here
// follow the resource-naming conventions of the upstream phases:
// - Key Vault and VNet/subnet are created by Install-LandingZone in
//   `udcsp-<country>-prod-platform-rg` (cf. infra/landing-zone/main.bicep
//   and parameters/<country>.bicepparam).
// - Log Analytics is created by Install-Observability in
//   `udcsp-<country>-observability-rg`.
// {{<country>-subscription-id}} is substituted at deploy time by
// Resolve-BicepParamSubscriptionTokens (scripts/install/lib/InstallHelpers.psm1).
param keyVaultId = '/subscriptions/{{dk-subscription-id}}/resourceGroups/udcsp-dk-prod-platform-rg/providers/Microsoft.KeyVault/vaults/udcsp-dk-prod-kv'
param logAnalyticsWorkspaceId = '/subscriptions/{{dk-subscription-id}}/resourceGroups/udcsp-dk-observability-rg/providers/Microsoft.OperationalInsights/workspaces/udcsp-dk-prod-law'
param privateEndpointSubnetId = '/subscriptions/{{dk-subscription-id}}/resourceGroups/udcsp-dk-prod-platform-rg/providers/Microsoft.Network/virtualNetworks/udcsp-dk-prod-vnet/subnets/data'
