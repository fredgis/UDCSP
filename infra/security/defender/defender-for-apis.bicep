// name: defender-for-apis | owner agent: A3 | purpose: enable Defender for APIs and onboard APIM APIs

targetScope = 'subscription'

param apimResourceId string
param apiIds array = []

var apimSegments = split(apimResourceId, '/')
var apimResourceGroupName = apimSegments[4]
var apimServiceName = apimSegments[8]

resource apiPricing 'Microsoft.Security/pricings@2023-01-01' = {
  name: 'Api'
  properties: {
    pricingTier: 'Standard'
  }
}

module onboarding 'defender-for-apis-onboarding.bicep' = {
  name: 'defender-for-apis-onboarding-${uniqueString(apimResourceId)}'
  scope: resourceGroup(apimResourceGroupName)
  params: {
    apimServiceName: apimServiceName
    apiIds: apiIds
  }
  dependsOn: [
    apiPricing
  ]
}

output defenderForApisPlan string = apiPricing.name
output onboardedApiCollectionIds array = onboarding.outputs.onboardedApiCollectionIds
