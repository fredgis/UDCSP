// name: defender-for-cloud | owner agent: A3 | purpose: enable Defender plans on subscription

targetScope = 'subscription'

@description('Defender plans to enable. Each entry: { name, subPlan? }. The "Api" plan requires a subPlan (P1..P5).')
param plans array = [
  { name: 'VirtualMachines' }
  { name: 'StorageAccounts' }
  { name: 'KeyVaults' }
  { name: 'Containers' }
  { name: 'AppServices' }
  { name: 'Api', subPlan: 'P1' }
]

// Microsoft.Security/pricings resources are subscription-wide singletons.
// Parallel apply across plans triggers "Another update operation is in
// progress. Please retry in a few minutes" — serialize with batchSize=1.
@batchSize(1)
resource pricing 'Microsoft.Security/pricings@2024-01-01' = [for plan in plans: {
  name: plan.name
  properties: union(
    { pricingTier: 'Standard' },
    contains(plan, 'subPlan') ? { subPlan: plan.subPlan } : {}
  )
}]

output enabledPlans array = [for p in plans: p.name]

