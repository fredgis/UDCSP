// name: defender-for-apis-onboarding | owner agent: A3 | purpose: onboard APIM APIs to Defender for APIs

targetScope = 'resourceGroup'

param apimServiceName string
param apiIds array = []

resource apim 'Microsoft.ApiManagement/service@2022-08-01' existing = {
  name: apimServiceName
}

resource apiCollections 'Microsoft.Security/apiCollections@2023-11-15' = [for apiId in apiIds: {
  name: apiId
  scope: apim
}]

output onboardedApiCollectionIds array = [for (apiId, i) in apiIds: apiCollections[i].id]
