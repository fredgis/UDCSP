// Centralised configuration loaded from environment variables.
// Every value has a sensible default so the service can start in dev/CI
// without throwing; production deployments inject the real values via
// Container App secrets bound from Key Vault (see infra/voice-orchestrator.bicep).

export type Country = 'dk' | 'se' | 'no';

export interface Config {
  port: number;
  country: Country;
  publicBaseUrl: string;
  acs: {
    connectionString: string;
    cognitiveServicesEndpoint: string;
  };
  azureOpenAI: {
    endpoint: string;
    realtimeDeployment: string;
    apiVersion: string;
  };
  apim: {
    baseUrl: string;
    topicRouterPath: string;
    voiceClientId: string;
    voiceClientSecret: string;
    tenantId: string;
  };
  d365: {
    voiceWorkstreamQueueId: string;
    transferTargetCommunicationId: string;
  };
  trace: {
    appInsightsConnectionString: string;
    serviceName: string;
  };
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function loadConfig(): Config {
  const country = (process.env.UDCSP_COUNTRY ?? 'no').toLowerCase() as Country;
  if (!['dk', 'se', 'no'].includes(country)) {
    throw new Error(`Invalid UDCSP_COUNTRY: ${country}; expected dk|se|no`);
  }
  return {
    port: Number(optional('PORT', '8080')),
    country,
    publicBaseUrl: optional('PUBLIC_BASE_URL', 'http://localhost:8080'),
    acs: {
      connectionString: optional('ACS_CONNECTION_STRING', ''),
      cognitiveServicesEndpoint: optional('ACS_COGNITIVE_SERVICES_ENDPOINT', ''),
    },
    azureOpenAI: {
      endpoint: optional('AZURE_OPENAI_ENDPOINT', ''),
      realtimeDeployment: optional('AZURE_OPENAI_REALTIME_DEPLOYMENT', 'gpt-realtime'),
      apiVersion: optional('AZURE_OPENAI_API_VERSION', '2025-04-01-preview'),
    },
    apim: {
      baseUrl: optional('APIM_BASE_URL', 'https://example.invalid'),
      topicRouterPath: optional('APIM_TOPIC_ROUTER_PATH', '/agents/topic-router/messages'),
      voiceClientId: optional('VOICE_CLIENT_ID', ''),
      voiceClientSecret: optional('VOICE_CLIENT_SECRET', ''),
      tenantId: optional('AZURE_TENANT_ID', ''),
    },
    d365: {
      voiceWorkstreamQueueId: optional('D365_VOICE_QUEUE_ID', ''),
      transferTargetCommunicationId: optional('D365_TRANSFER_TARGET_ID', ''),
    },
    trace: {
      appInsightsConnectionString: optional('APPLICATIONINSIGHTS_CONNECTION_STRING', ''),
      serviceName: optional('OTEL_SERVICE_NAME', 'udcsp-voice-orchestrator'),
    },
  };
}

export function isLiveMode(cfg: Config): boolean {
  // Live mode requires the three external systems to be reachable.
  return !!(cfg.acs.connectionString && cfg.azureOpenAI.endpoint && cfg.apim.baseUrl !== 'https://example.invalid');
}
