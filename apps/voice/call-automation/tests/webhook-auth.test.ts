import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import {
  authenticateAcsWebhook,
  extractBearerToken,
  parseAcsCallbackEvents,
  parseEventGridRequest,
  WebhookRequestError,
} from '../src/webhook-auth.js';

function request(body: unknown, headers: Record<string, string> = {}): Request {
  const normalized = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  return {
    body,
    get(name: string) {
      return normalized[name.toLowerCase()];
    },
  } as unknown as Request;
}

describe('Event Grid request validation', () => {
  it('accepts only the expected subscription validation handshake', () => {
    const req = request(
      [
        {
          eventType: 'Microsoft.EventGrid.SubscriptionValidationEvent',
          data: { validationCode: 'test-validation-code' },
        },
      ],
      {
        'aeg-event-type': 'SubscriptionValidation',
        'aeg-subscription-name': 'udcsp-no-acs-incoming-call',
      },
    );

    expect(parseEventGridRequest(req, 'udcsp-no-acs-incoming-call')).toEqual({
      kind: 'validation',
      validationCode: 'test-validation-code',
    });
  });

  it('rejects a spoofed subscription name', () => {
    const req = request([], {
      'aeg-event-type': 'SubscriptionValidation',
      'aeg-subscription-name': 'attacker-subscription',
    });

    expect(() => parseEventGridRequest(req, 'udcsp-no-acs-incoming-call')).toThrowError(
      expect.objectContaining<WebhookRequestError>({ reason: 'unexpected_subscription', statusCode: 401 }),
    );
  });

  it('validates incoming-call notification shape', () => {
    const req = request(
      [
        {
          eventType: 'Microsoft.Communication.IncomingCall',
          data: {
            incomingCallContext: 'opaque-context',
            correlationId: '57d926f6-6ee9-4933-9bf6-3ad60a175956',
          },
        },
      ],
      {
        'aeg-event-type': 'Notification',
        'aeg-subscription-name': 'udcsp-no-acs-incoming-call',
      },
    );

    expect(parseEventGridRequest(req, 'udcsp-no-acs-incoming-call')).toEqual({
      kind: 'notification',
      events: [
        {
          incomingCallContext: 'opaque-context',
          correlationId: '57d926f6-6ee9-4933-9bf6-3ad60a175956',
        },
      ],
    });
  });
});

describe('ACS callback authentication and CloudEvents validation', () => {
  it('extracts a case-insensitive Bearer token from the Authentication header', () => {
    expect(extractBearerToken(request([], { Authentication: '  bearer signed.jwt.value  ' }))).toBe('signed.jwt.value');
  });

  it('fails closed when the ACS audience or token is missing', async () => {
    await expect(authenticateAcsWebhook(request([]), '')).resolves.toEqual({ ok: false, reason: 'missing_configuration' });
    await expect(authenticateAcsWebhook(request([]), 'acs-resource-id')).resolves.toEqual({ ok: false, reason: 'missing_token' });
  });

  it('requires valid CloudEvents metadata and a GUID call connection ID', () => {
    const events = parseAcsCallbackEvents([
      {
        id: 'event-id',
        source: '/calling/callConnections/81d15f4f-8e98-4a5b-a530-84c66a5d4518',
        specversion: '1.0',
        type: 'Microsoft.Communication.CallConnected',
        data: { callConnectionId: '81d15f4f-8e98-4a5b-a530-84c66a5d4518' },
      },
    ]);

    expect(events[0].type).toBe('Microsoft.Communication.CallConnected');
  });
});
