// name: voice-orchestrator | owner agent: A10 | purpose: Container App that hosts the ACS Call Automation ↔ GPT-4o Realtime ↔ Foundry topic-router bridge.
//
// Per-country deployment. Reads its secrets (ACS connection string, APIM
// client secret, D365 transfer-target id) from the platform Key Vault via
// the user-assigned managed identity bound at deployment time.
//
// The Container App must expose a public ingress because:
//   - Event Grid posts IncomingCall events to /api/acs/eventgrid
//   - ACS posts call lifecycle events to /api/acs/callbacks
//   - ACS opens a bidirectional Media Streaming WebSocket to /api/acs/media
//
// Front Door + WAF rules sit in front of the Container App ingress in prod
// (see infra/security/front-door); here we only declare the workload.

@allowed(['dk','se','no'])
@description('Country in which the orchestrator is deployed; pinned to the country sovereign zone.')
param country string

@allowed(['dev','test','prod'])
@description('Environment marker for tagging and naming.')
param env string = 'dev'

@description('Region — must match the country sovereign region (northeurope/swedencentral/norwayeast).')
param location string = resourceGroup().location

@description('Resource ID of the per-country Container Apps environment.')
param containerAppsEnvironmentId string

@description('Container image reference (mcr.microsoft.com/... or ACR-hosted) for the orchestrator.')
param image string

@description('Resource ID of the user-assigned managed identity that holds Key Vault Secrets User + ACS Contributor + Cognitive Services User roles.')
param userAssignedIdentityId string

@description('Public hostname (FQDN) the Container App is reachable at; passed to the app so it can build callback URLs.')
param publicHostname string

@description('Azure OpenAI endpoint hosting the gpt-realtime deployment.')
param azureOpenAiEndpoint string

@description('Name of the gpt-realtime model deployment in Azure OpenAI.')
param azureOpenAiRealtimeDeployment string = 'gpt-realtime'

@description('Public APIM gateway base URL (e.g. https://udcsp-apim-no.azure-api.net).')
param apimBaseUrl string

@description('Cognitive Services endpoint registered with the ACS Call Intelligence pipeline.')
param cognitiveServicesEndpoint string

@description('Communication identifier used as the warm-transfer destination for the D365 voice workstream queue.')
param d365TransferTargetId string = ''

@description('Voice channel D365 voice workstream queue id (for trace/audit only; transfer routes by communicationUserId).')
param d365VoiceQueueId string = ''

@description('Application Insights connection string for trace correlation with Foundry.')
param appInsightsConnectionString string

@description('Key Vault secret URI for the ACS connection string.')
param acsConnectionStringSecretUri string

@description('Key Vault secret URI for the voice service principal client secret used to obtain the APIM access token.')
param voiceClientSecretUri string

@description('Voice service principal application (client) id.')
param voiceClientId string

@description('Tenant id used by the voice service principal.')
param tenantId string = subscription().tenantId

@description('CPU + memory profile for the Container App workload.')
param cpu string = '0.5'

@description('Memory profile for the Container App workload (must pair with cpu per ACA SKU rules).')
param memory string = '1Gi'

var tags = {
  country: country
  env: env
  costCenter: 'UDCSP'
  dataResidency: 'EU'
  dataClassification: 'Confidential'
  owner: 'A10'
  workload: 'voice-orchestrator'
}

resource voice 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'udcsp-${country}-${env}-voice-orch'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      secrets: [
        {
          name: 'acs-connection-string'
          identity: userAssignedIdentityId
          keyVaultUrl: acsConnectionStringSecretUri
        }
        {
          name: 'voice-client-secret'
          identity: userAssignedIdentityId
          keyVaultUrl: voiceClientSecretUri
        }
        {
          name: 'app-insights-connection'
          #disable-next-line use-secure-value-for-secure-inputs
          value: appInsightsConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'orchestrator'
          image: image
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: [
            { name: 'PORT', value: '8080' }
            { name: 'UDCSP_COUNTRY', value: country }
            { name: 'PUBLIC_BASE_URL', value: 'https://${publicHostname}' }
            { name: 'ACS_CONNECTION_STRING', secretRef: 'acs-connection-string' }
            { name: 'ACS_COGNITIVE_SERVICES_ENDPOINT', value: cognitiveServicesEndpoint }
            { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenAiEndpoint }
            { name: 'AZURE_OPENAI_REALTIME_DEPLOYMENT', value: azureOpenAiRealtimeDeployment }
            { name: 'AZURE_OPENAI_API_VERSION', value: '2025-04-01-preview' }
            { name: 'APIM_BASE_URL', value: apimBaseUrl }
            { name: 'APIM_TOPIC_ROUTER_PATH', value: '/agents/topic-router/messages' }
            { name: 'VOICE_CLIENT_ID', value: voiceClientId }
            { name: 'VOICE_CLIENT_SECRET', secretRef: 'voice-client-secret' }
            { name: 'AZURE_TENANT_ID', value: tenantId }
            { name: 'D365_VOICE_QUEUE_ID', value: d365VoiceQueueId }
            { name: 'D365_TRANSFER_TARGET_ID', value: d365TransferTargetId }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'app-insights-connection' }
            { name: 'OTEL_SERVICE_NAME', value: 'udcsp-voice-orchestrator-${country}' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/healthz', port: 8080 }
              initialDelaySeconds: 10
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: { path: '/healthz', port: 8080 }
              initialDelaySeconds: 5
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 6
        rules: [
          {
            name: 'concurrent-calls'
            http: { metadata: { concurrentRequests: '20' } }
          }
        ]
      }
    }
  }
}

output orchestratorName string = voice.name
output orchestratorFqdn string = voice.properties.configuration.ingress.fqdn
output orchestratorPrincipalId string = reference(userAssignedIdentityId, '2023-01-31', 'Full').properties.principalId
