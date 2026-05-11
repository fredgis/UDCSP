// name: verified-id-issuer | owner agent: SA-3 | purpose: shared Microsoft Entra Verified ID issuer for UDCSP EUDI Wallet interoperability

targetScope = 'resourceGroup'

@description('Federation hub region. Verified ID authority is shared because credentials are multi-tenant by design. Microsoft.VerifiedId/authorities is available in: northeurope, westus2, australiaeast, australiasoutheast, japaneast, japanwest.')
param location string = 'northeurope'

@description('Deployment environment name.')
param env string = 'prod'

@allowed([
  'ion'
  'web'
])
@description('Use ion for production anchoring; use web for development and test authorities.')
param didMethod string = 'ion'

@description('Linked domain used by wallets and verifiers to bind the DID to UDCSP.')
param linkedDomain string = 'identity.udcsp.example'

@description('Existing DID when importing a pre-anchored ION DID. Leave empty for platform-generated Web DID in development.')
param did string = ''

@description('Common governance and sovereignty tags.')
param tags object = {
  workload: 'identity'
  capability: 'verified-id'
  dataClassification: 'citizen-identity'
  sovereigntyScope: 'federation-hub'
}

// Microsoft.VerifiedId/authorities requires the resource name to be a
// GUID (regex ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$).
// We use a deterministic guid() so re-deploys hit the same authority.
// Human-readable name lives in the displayName tag.
var humanName = 'udcsp-${env}-verified-id-issuer'
var issuerName = guid(resourceGroup().id, humanName)
var effectiveDid = empty(did) ? 'did:${didMethod}:${linkedDomain}' : did

// Microsoft Entra Verified ID is configured once in the federation hub and trusted by the
// country External ID tenants through OpenID4VCI/OpenID4VP metadata.
resource issuer 'Microsoft.VerifiedId/authorities@2024-01-26-preview' = {
  name: issuerName
  location: location
  tags: union(tags, {
    displayName: humanName
    eidas2: 'active-issuer'
    didMethod: didMethod
    linkedDomain: linkedDomain
    issuerDid: effectiveDid
  })
}

output issuerName string = issuer.name
output issuerDisplayName string = humanName
output issuerDid string = effectiveDid
output linkedDomain string = linkedDomain
output credentialManifestRoot string = 'https://${linkedDomain}/.well-known/udcsp/verified-id'
output credentialContracts array = [
  'udcsp-residency-credential'
  'udcsp-eligibility-receipt'
  'udcsp-eudi-wallet-bridge'
]
