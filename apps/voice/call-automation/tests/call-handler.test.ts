import type { CallAutomationClient } from '@azure/communication-call-automation';
import type WebSocket from 'ws';
import { describe, expect, it, vi } from 'vitest';
import { CallHandler } from '../src/call-handler.js';
import type { Config } from '../src/config.js';

const cfg: Config = {
  port: 8080,
  country: 'no',
  publicBaseUrl: 'https://voice.example.test',
  acs: {
    connectionString: '',
    cognitiveServicesEndpoint: '',
    resourceId: '/subscriptions/test/resourceGroups/test/providers/Microsoft.Communication/communicationServices/udcsp-no-acs',
    eventGridSubscriptionName: 'udcsp-no-acs-incoming-call',
  },
  azureOpenAI: { endpoint: '', realtimeDeployment: 'gpt-realtime', apiVersion: '2025-04-01-preview' },
  apim: { baseUrl: 'https://example.invalid', topicRouterPath: '/messages', voiceClientId: '', voiceClientSecret: '', tenantId: '' },
  d365: { voiceWorkstreamQueueId: '', transferTargetCommunicationId: '' },
  trace: { appInsightsConnectionString: '', serviceName: 'test', unsafeDebugLogging: false },
};

function createHandler() {
  const answerCall = vi.fn().mockResolvedValue({
    callConnectionProperties: {
      callConnectionId: '81d15f4f-8e98-4a5b-a530-84c66a5d4518',
      serverCallId: 'opaque-server-call-id',
    },
  });
  const getToken = vi.fn();
  const client = { answerCall } as unknown as CallAutomationClient;
  const handler = new CallHandler(cfg, { client, credential: { getToken } as any });
  return { handler, answerCall, getToken };
}

async function answerCall(handler: CallHandler): Promise<void> {
  await (handler as any).answerIncomingCall({
    incomingCallContext: 'opaque-incoming-call-context',
    correlationId: '1f7cc17a-991f-48bc-b191-7e8e49e80ab9',
  });
}

describe('CallHandler media nonce authentication', () => {
  it('places a cryptographic nonce in the ACS media URL and consumes it once', async () => {
    const { handler, answerCall: answerCallMock } = createHandler();
    await answerCall(handler);

    const options = answerCallMock.mock.calls[0][2];
    const mediaUrl = new URL(options.mediaStreamingOptions.transportUrl);
    const nonce = mediaUrl.searchParams.get('nonce');

    expect(mediaUrl.pathname).toBe('/api/acs/media');
    expect(mediaUrl.searchParams.has('callConnectionId')).toBe(false);
    expect(nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(handler.consumeMediaNonce(nonce!)).toBe('81d15f4f-8e98-4a5b-a530-84c66a5d4518');
    expect(handler.consumeMediaNonce(nonce!)).toBeNull();
  });

  it('rejects an expired nonce', async () => {
    const { handler, answerCall: answerCallMock } = createHandler();
    await answerCall(handler);
    const nonce = new URL(answerCallMock.mock.calls[0][2].mediaStreamingOptions.transportUrl).searchParams.get('nonce')!;
    const session = (handler as any).sessions.get('81d15f4f-8e98-4a5b-a530-84c66a5d4518');
    session.mediaNonceExpiresAt = Date.now() - 1;

    expect(handler.consumeMediaNonce(nonce)).toBeNull();
    expect(handler.consumeMediaNonce(nonce)).toBeNull();
  });

  it('refuses to replace an existing bridge', async () => {
    const { handler, getToken } = createHandler();
    await answerCall(handler);
    const session = (handler as any).sessions.get('81d15f4f-8e98-4a5b-a530-84c66a5d4518');
    session.bridge = {};
    const close = vi.fn();

    await handler.attachMediaSocket('81d15f4f-8e98-4a5b-a530-84c66a5d4518', { close } as unknown as WebSocket);

    expect(close).toHaveBeenCalledWith(1008, 'Media already attached');
    expect(getToken).not.toHaveBeenCalled();
  });
});
