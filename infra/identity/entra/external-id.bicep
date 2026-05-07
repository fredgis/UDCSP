// name: external-id | owner agent: A2 | purpose: Entra External ID hub placeholders for eIDAS federation

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
