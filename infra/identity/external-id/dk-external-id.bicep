// name: dk-external-id | owner agent: A2 | purpose: country Microsoft Entra External ID (CIAM) tenant scaffold
// Replaces the legacy Azure AD B2C tenant. Azure AD B2C is no longer available for new customers as of 1 May 2025.
// See docs/architecture.md "Identity deviation from the case study's B2C mandate" for rationale.

targetScope = 'resourceGroup'

param env string = 'prod'
param location string = 'europe'
param displayName string = 'UDCSP DK External ID'

// CIAM (Customer Identity & Access Management) tenant — the Microsoft Entra External ID successor to a (legacy) Azure AD B2C tenant.
resource externalIdTenant 'Microsoft.AzureActiveDirectory/ciamDirectories@2023-05-17-preview' = {
  name: 'udcsp-dk-${env}.onmicrosoft.com'
  location: location
  sku: {
    name: 'Standard'
    tier: 'A0'
  }
  properties: {
    createTenantProperties: {
      displayName: displayName
      countryCode: 'DK'
    }
  }
}

output tenantResourceId string = externalIdTenant.id
