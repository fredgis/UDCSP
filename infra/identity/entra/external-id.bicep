// name: external-id-federation | owner agent: A2 | purpose: workforce Entra ID hub → Microsoft Entra External ID federation placeholders for eIDAS

targetScope = 'subscription'

param country string
param env string = 'prod'
param externalIdTenantDomain string // TODO: case-study scaffold — replace with real values when deploying
param eidasMetadataUrl string // TODO: case-study scaffold — replace with real values when deploying

// Native Bicep coverage for External ID federation is partial; apply this Graph/ARM REST payload from deployment automation.
output graphPatch object = {
  tenantDomain: externalIdTenantDomain
  federation: {
    protocol: 'SAML2'
    metadataUrl: eidasMetadataUrl
    mappedClaims: ['country', 'eidasLoA', 'nationalIdHash', 'purpose']
  }
  tokenAudience: 'udcsp-${country}-${env}-apim'
}
