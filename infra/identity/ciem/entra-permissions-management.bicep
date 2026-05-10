// name: entra-permissions-management | owner agent: SA-3 | purpose: CIEM subscription onboarding for sovereign and workforce tenants

targetScope = 'tenant'

@description('Service principal object ID used by Entra Permissions Management / CIEM collectors.')
param ciemPrincipalId string

@description('Azure subscriptions to onboard: three sovereign country subscriptions and one shared workforce/federation subscription. Replace placeholder GUIDs with the real IDs at deployment time (Install-Ciem builds these from udcsp.config.psd1).')
param azureSubscriptions array = [
  {
    name: 'udcsp-dk-sovereign'
    tenantType: 'sovereign-country'
    country: 'dk'
    subscriptionId: '00000000-0000-0000-0000-000000000001'
  }
  {
    name: 'udcsp-se-sovereign'
    tenantType: 'sovereign-country'
    country: 'se'
    subscriptionId: '00000000-0000-0000-0000-000000000002'
  }
  {
    name: 'udcsp-no-sovereign'
    tenantType: 'sovereign-country'
    country: 'no'
    subscriptionId: '00000000-0000-0000-0000-000000000003'
  }
  {
    name: 'udcsp-workforce-shared'
    tenantType: 'workforce'
    country: 'shared'
    subscriptionId: '00000000-0000-0000-0000-000000000099'
  }
]

@description('Least-privilege reader role used for posture discovery. Defaults to Reader.')
param ciemReaderRoleDefinitionId string = 'acdd72a7-3385-48ef-bd42-f606fba81ae7'

@description('Optional tags emitted in onboarding metadata outputs.')
param tags object = {
  workload: 'identity'
  capability: 'ciem'
  posture: 'continuous-permission-analysis'
}

module azureSubscriptionReaders 'subscription-onboarding.bicep' = [for sub in azureSubscriptions: {
  name: 'ciem-${sub.country}-${uniqueString(sub.subscriptionId)}'
  scope: subscription(sub.subscriptionId)
  params: {
    ciemPrincipalId: ciemPrincipalId
    ciemReaderRoleDefinitionId: ciemReaderRoleDefinitionId
    subscriptionName: sub.name
  }
}]

// Future multi-cloud onboarding placeholders. Enable when AWS/GCP sovereign landing zones are in scope.
// param awsAccounts array = [
//   {
//     name: 'udcsp-aws-dk'
//     accountId: '111111111111'
//     externalId: 'replace-with-entra-permissions-management-external-id'
//     roleArn: 'arn:aws:iam::111111111111:role/UdcspCiemReadOnly'
//   }
// ]
//
// param gcpProjects array = [
//   {
//     name: 'udcsp-gcp-dk'
//     projectId: 'udcsp-gcp-dk'
//     workloadIdentityProvider: 'projects/000000000/locations/global/workloadIdentityPools/udcsp/providers/ciem'
//     serviceAccount: 'udcsp-ciem@udcsp-gcp-dk.iam.gserviceaccount.com'
//   }
// ]

output onboardedAzureSubscriptions array = [for sub in azureSubscriptions: {
  name: sub.name
  tenantType: sub.tenantType
  country: sub.country
  subscriptionId: sub.subscriptionId
  tags: tags
}]
