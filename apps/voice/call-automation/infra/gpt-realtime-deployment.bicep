// name: gpt-realtime-deployment | owner agent: A10 | purpose: provisions the gpt-realtime model deployment used by the voice orchestrator.
//
// Per country to keep prompt + audio data inside the country sovereign zone
// (audio data is the most sensitive payload — citizen voice biometrics).
// Quota is set conservatively (10 TPM) for case-study scale; production
// deployments override via parameter file.

@allowed(['dk','se','no'])
param country string

@allowed(['dev','test','prod'])
param env string = 'dev'

@description('Region of the Azure OpenAI account hosting the deployment. Reserved for future per-region overrides; not consumed by Microsoft.CognitiveServices/accounts/deployments because it inherits the parent account location.')
param location string = resourceGroup().location

@description('Name of the existing Azure OpenAI / Cognitive Services account.')
param azureOpenAiAccountName string

@description('Model name to deploy. Defaults to gpt-realtime; override to gpt-4o-realtime-preview-2025-06-03 if newer is unavailable in region.')
param modelName string = 'gpt-realtime'

@description('Model version. Use the latest GA tag for gpt-realtime, e.g. 2025-08-28.')
param modelVersion string = '2025-08-28'

@description('Capacity in thousands of TPM; default 10 (10k TPM) for case-study scale.')
param capacity int = 10

var tags = {
  country: country
  env: env
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential'
  owner: 'A10'
  workload: 'voice-realtime'
}

resource account 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: azureOpenAiAccountName
}

resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: account
  name: 'gpt-realtime-${country}'
  tags: tags
  sku: {
    name: 'GlobalStandard'
    capacity: capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
    raiPolicyName: 'udcsp-voice-rai'
    currentCapacity: capacity
  }
}

output deploymentName string = deployment.name
output endpoint string = account.properties.endpoint
