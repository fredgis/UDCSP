// Function tools exposed to the GPT-4o Realtime session.
// GPT Realtime calls these by name (the session is configured with the
// JSON schemas below); the implementation forwards the request to APIM
// /agents/topic-router/messages — the SAME endpoint the chat widget uses.
// This guarantees one Foundry brain across web, mobile, chat AND voice,
// with one trace plane and one audit story for the AI Act registry.

import { ClientSecretCredential } from '@azure/identity';
import type { Config } from './config.js';
import type { LogContext } from './logger.js';
import { logError, logEvent } from './logger.js';

export interface TopicRouterRequest {
  sessionId: string;
  channel: 'voice';
  locale: string;
  text: string;
  callConnectionId?: string;
  traceparent?: string;
}

export interface TopicRouterResponse {
  reply: string;
  intent?: string;
  escalate?: boolean;
  escalationReason?: string;
  citations?: Array<{ title: string; url: string }>;
}

const SCOPE_DEFAULT = 'api://udcsp-foundry/.default';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getApimToken(cfg: Config): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.token;
  }
  if (!cfg.apim.tenantId || !cfg.apim.voiceClientId || !cfg.apim.voiceClientSecret) {
    return ''; // dev mode — APIM JWT validation expected to be loose or skipped
  }
  const cred = new ClientSecretCredential(cfg.apim.tenantId, cfg.apim.voiceClientId, cfg.apim.voiceClientSecret);
  const at = await cred.getToken(SCOPE_DEFAULT);
  if (!at) throw new Error('Failed to acquire APIM access token for voice channel');
  cachedToken = { token: at.token, expiresAt: at.expiresOnTimestamp };
  return at.token;
}

export async function callTopicRouter(cfg: Config, req: TopicRouterRequest, ctx: LogContext): Promise<TopicRouterResponse> {
  const url = `${cfg.apim.baseUrl}${cfg.apim.topicRouterPath}`;
  const token = await getApimToken(cfg);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    traceparent: req.traceparent ?? '',
    'x-channel-actor': 'voice',
    'x-call-connection-id': req.callConnectionId ?? '',
  };
  if (token) headers.authorization = `Bearer ${token}`;
  logEvent('topic_router.request', ctx, { sessionId: req.sessionId, locale: req.locale, textLength: req.text.length });
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId: req.sessionId,
      channel: 'voice',
      locale: req.locale,
      text: req.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '<no-body>');
    const err = new Error(`topic-router HTTP ${res.status}: ${body.slice(0, 256)}`);
    logError(err, ctx);
    throw err;
  }
  const data = (await res.json()) as TopicRouterResponse;
  logEvent('topic_router.response', ctx, {
    sessionId: req.sessionId,
    intent: data.intent,
    escalate: data.escalate,
    replyLength: data.reply?.length ?? 0,
  });
  return data;
}

// JSON-Schema definitions handed to GPT-4o Realtime when the session opens.
// GPT Realtime calls these tools mid-conversation; our handler executes
// the calls and returns the result as a `function_call_output` message.
export const TOOL_DEFS = [
  {
    type: 'function',
    name: 'lookup_topic_router',
    description:
      "Look up an answer for the citizen by routing the question through the Foundry topic-router. Use this for any factual / domain / eligibility question. Returns text grounded in UDCSP knowledge sources, with the recognised intent and citations.",
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The citizen question (verbatim or paraphrased) in the citizen language.' },
        locale: {
          type: 'string',
          enum: ['da', 'sv', 'nb', 'en'],
          description: 'Primary citizen locale (da | sv | nb | en); detailed BCP-47 region tag is inferred from country.',
        },
      },
      required: ['text', 'locale'],
    },
  },
  {
    type: 'function',
    name: 'escalate_to_human',
    description:
      "Hand the call to a D365 human caseworker queue. Use this when the citizen explicitly asks for a human, when sentiment becomes very negative, when the topic is sensitive (homelessness, domestic violence, child safety, identity theft), when the topic-router escalate flag is true, or when the question crosses a sovereignty border (cross_border).",
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          enum: ['low_confidence', 'sensitive_topic', 'citizen_request', 'sentiment_negative', 'cross_border'],
          description: 'Machine-readable reason aligned with foundry/agents/topic-router/escalation-rules.json.',
        },
        summary: { type: 'string', description: 'A 1-2 sentence summary of the conversation so far, attached to the warm transfer for the caseworker.' },
      },
      required: ['reason'],
    },
  },
  {
    type: 'function',
    name: 'end_call_with_recap',
    description:
      "End the call gracefully and send an SMS récap to the caller with the case number or follow-up steps. Use only when the citizen confirms they have everything they need.",
    parameters: {
      type: 'object',
      properties: {
        recapText: { type: 'string', description: 'Plain-text récap to send by SMS, in the citizen locale.' },
      },
      required: ['recapText'],
    },
  },
] as const;
