// name: ciem-subscription-onboarding | owner agent: SA-3 | purpose: assign CIEM reader permissions at subscription scope

targetScope = 'subscription'

param ciemPrincipalId string
param ciemReaderRoleDefinitionId string
param subscriptionName string

resource ciemReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().subscriptionId, ciemPrincipalId, ciemReaderRoleDefinitionId, 'ciem-reader')
  properties: {
    principalId: ciemPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', ciemReaderRoleDefinitionId)
    description: 'UDCSP CIEM onboarding for ${subscriptionName}; enables continuous permission posture analysis.'
  }
}

output roleAssignmentId string = ciemReader.id
