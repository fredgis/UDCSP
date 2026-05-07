// name: management-groups | owner agent: A1 | purpose: document UDCSP management group hierarchy for tenant bootstrap

targetScope = 'subscription'

param tags object

// Azure management groups are tenant-scoped; this subscription-scoped scaffold keeps the hierarchy contract
// for A16 to apply from the tenant bootstrap step without hardcoded tenant IDs.
var hierarchy = [
  'Tenant Root'
  'UDCSP'
  'UDCSP/Platform'
  'UDCSP/Workloads-DK'
  'UDCSP/Workloads-SE'
  'UDCSP/Workloads-NO'
]

output managementGroupHierarchy array = hierarchy
output owner string = tags.owner
