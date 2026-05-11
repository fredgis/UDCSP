// name: se-external-id | owner agent: A2 | purpose: country Microsoft Entra External ID (CIAM) tenant scaffold
// Replaces the legacy Azure AD B2C tenant. Azure AD B2C is no longer available for new customers as of 1 May 2025.
// See docs/tech/architecture.md "Identity deviation from the case study's B2C mandate" for rationale.

targetScope = 'resourceGroup'

param env string = 'prod'
param location string = 'Europe'
param displayName string = 'UDCSP SE External ID'

// CIAM (Customer Identity & Access Management) tenant — the Microsoft Entra External ID successor to a (legacy) Azure AD B2C tenant.
// NOTE: tenant resourceName (the part before .onmicrosoft.com) must be
// alphanumeric only, 1-27 chars, starting with a letter. NO dashes.
resource externalIdTenant 'Microsoft.AzureActiveDirectory/ciamDirectories@2023-05-17-preview' = {
  name: 'udcspse${env}.onmicrosoft.com'
  location: location
  sku: {
    name: 'Base'
    tier: 'A0'
  }
  properties: {
    createTenantProperties: {
      displayName: displayName
      countryCode: 'SE'
    }
  }
}

output tenantResourceId string = externalIdTenant.id
