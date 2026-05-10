// name: defender-for-cloud | owner agent: A3 | purpose: enable Defender plans on subscription

targetScope = 'subscription'

param plans array = ['VirtualMachines', 'StorageAccounts', 'KeyVaults', 'Containers', 'AppServices']

resource pricing 'Microsoft.Security/pricings@2023-01-01' = [for plan in plans: {
  name: plan
  properties: { pricingTier: 'Standard' }
}]

output enabledPlans array = plans
