// name: site-recovery | owner agent: A3 | purpose: same-country-only Azure Site Recovery policy scaffolding

targetScope = 'resourceGroup'

param vaultName string
param country string
param primaryRegion string
param recoveryRegion string
param replicationFrequencyInSeconds int = 300

resource vault 'Microsoft.RecoveryServices/vaults@2023-02-01' existing = {
  name: vaultName
}

// Sovereignty control: recoveryRegion must be a second region/zone in the same country as primaryRegion.
// Do not pair DK to SE/NO, SE to DK/NO, or NO to DK/SE. Cross-border ASR is intentionally excluded.
resource replicationPolicy 'Microsoft.RecoveryServices/vaults/replicationPolicies@2023-02-01' = {
  parent: vault
  name: 'udcsp-${country}-same-country-asr'
  properties: {
    providerSpecificInput: {
      instanceType: 'A2A'
      appConsistentFrequencyInMinutes: 240
      crashConsistentFrequencyInMinutes: replicationFrequencyInSeconds / 60
      multiVmSyncStatus: 'Enable'
      recoveryPointHistory: 24
    }
  }
}

output replicationPolicyId string = replicationPolicy.id
output sovereigntyConstraint string = '${toUpper(country)} failover only: ${primaryRegion} -> ${recoveryRegion}'
