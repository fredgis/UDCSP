import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const ACS_ISSUER = 'https://acscallautomation.communication.azure.com';
const ACS_JWKS = createRemoteJWKSet(new URL(`${ACS_ISSUER}/calling/keys`));
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface IncomingCallData {
  incomingCallContext: string;
  correlationId?: string;
}

export interface AcsCallbackEvent {
  type: string;
  data: Record<string, unknown> & { callConnectionId: string };
}

export type EventGridRequest =
  | { kind: 'validation'; validationCode: string }
  | { kind: 'notification'; events: IncomingCallData[] };

export class WebhookRequestError extends Error {
  constructor(
    public readonly reason: string,
    public readonly statusCode: number,
  ) {
    super(reason);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

// Event Grid schema headers and the subscription handshake reject malformed or
// misrouted deliveries, but they are not a cryptographic sender signature. The
// subscription still needs Entra webhook authentication or a provisioned query
// secret before notification origin can be proven.
function requireExpectedSubscription(req: Request, expectedSubscriptionName: string): void {
  if (req.get('aeg-subscription-name') !== expectedSubscriptionName) {
    throw new WebhookRequestError('unexpected_subscription', 401);
  }
}

export function parseEventGridRequest(req: Request, expectedSubscriptionName: string): EventGridRequest {
  requireExpectedSubscription(req, expectedSubscriptionName);
  const deliveryType = req.get('aeg-event-type');
  const events = Array.isArray(req.body) ? req.body : [];

  if (deliveryType === 'SubscriptionValidation') {
    const event = events.length === 1 ? asRecord(events[0]) : null;
    const data = asRecord(event?.data);
    const validationCode = data?.validationCode;
    if (event?.eventType !== 'Microsoft.EventGrid.SubscriptionValidationEvent' || typeof validationCode !== 'string' || validationCode.length === 0 || validationCode.length > 256) {
      throw new WebhookRequestError('invalid_subscription_validation', 400);
    }
    return { kind: 'validation', validationCode };
  }

  if (deliveryType !== 'Notification' || events.length !== 1) {
    throw new WebhookRequestError('invalid_event_grid_delivery', 400);
  }

  const event = asRecord(events[0]);
  const data = asRecord(event?.data);
  const incomingCallContext = data?.incomingCallContext;
  if (event?.eventType !== 'Microsoft.Communication.IncomingCall' || typeof incomingCallContext !== 'string' || incomingCallContext.length === 0) {
    throw new WebhookRequestError('invalid_incoming_call_event', 400);
  }

  return {
    kind: 'notification',
    events: [
      {
        incomingCallContext,
        correlationId: typeof data?.correlationId === 'string' ? data.correlationId : undefined,
      },
    ],
  };
}

export function parseAcsCallbackEvents(body: unknown): AcsCallbackEvent[] {
  const events = Array.isArray(body) ? body : [];
  if (events.length === 0 || events.length > 32) {
    throw new WebhookRequestError('invalid_callback_batch', 400);
  }

  return events.map((value) => {
    const event = asRecord(value);
    const data = asRecord(event?.data);
    const callConnectionId = data?.callConnectionId;
    if (
      event?.specversion !== '1.0' ||
      typeof event.id !== 'string' ||
      event.id.length === 0 ||
      typeof event.source !== 'string' ||
      !String(event.type ?? '').startsWith('Microsoft.Communication.') ||
      typeof callConnectionId !== 'string' ||
      !GUID.test(callConnectionId)
    ) {
      throw new WebhookRequestError('invalid_callback_event', 400);
    }
    return { type: String(event.type), data: { ...data, callConnectionId } };
  });
}

export type AcsAuthenticationResult =
  | { ok: true }
  | { ok: false; reason: 'missing_configuration' | 'missing_token' | 'invalid_token' };

export function extractBearerToken(req: Request): string | null {
  const header = req.get('authentication') ?? req.get('authorization') ?? '';
  return /^\s*Bearer\s+(\S+)\s*$/i.exec(header)?.[1] ?? null;
}

export async function authenticateAcsWebhook(req: Request, audience: string): Promise<AcsAuthenticationResult> {
  if (!audience) return { ok: false, reason: 'missing_configuration' };
  const token = extractBearerToken(req);
  if (!token) return { ok: false, reason: 'missing_token' };
  try {
    await jwtVerify(token, ACS_JWKS, {
      issuer: ACS_ISSUER,
      audience,
      algorithms: ['RS256'],
      clockTolerance: 5,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'invalid_token' };
  }
}
