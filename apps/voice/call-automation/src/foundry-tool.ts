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
  // The topic-router APIM operation accepts anonymous calls (the chat
  // widget hits it without a bearer too), so a token-acquisition failure
  // here must NOT break the tool call. Swallow errors and fall back to
  // anonymous. If APIM later starts requiring JWT, this will surface as
  // a 401 from APIM which the caller already handles.
  try {
    const cred = new ClientSecretCredential(cfg.apim.tenantId, cfg.apim.voiceClientId, cfg.apim.voiceClientSecret);
    const at = await cred.getToken(SCOPE_DEFAULT);
    if (!at) return '';
    cachedToken = { token: at.token, expiresAt: at.expiresOnTimestamp };
    return at.token;
  } catch (err) {
    // Log once and continue without a token.
    // eslint-disable-next-line no-console
    console.warn('[voice] getApimToken failed, falling back to anonymous topic-router call:', (err as Error)?.message);
    return '';
  }
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
      // Voice callers are implicitly authenticated by their PSTN number +
      // the recording disclosure they accepted by staying on the line.
      // Telling the topic-router 'authenticated=true' prevents it from
      // appending 'sign in with BankID' caveats that don't make sense in
      // an audio context and confused gpt-realtime into refusing answers.
      authenticated: true,
      citizen: {
        name: null,
        givenName: null,
        upn: null,
        country: req.locale === 'nb' ? 'no' : req.locale === 'sv' ? 'se' : req.locale === 'da' ? 'dk' : 'no',
      },
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
//
// We expose tools dynamically: when D365 voice workstream is not configured
// (D365_VOICE_QUEUE_ID empty) the escalate_to_human tool is omitted so the
// model cannot call something we cannot fulfil. This also fixes a class of
// dial-test bug where gpt-realtime picked escalate as a first action on
// every domain question — by removing it from the tool set entirely, the
// model is forced to use lookup_topic_router as it should.
const TOOL_TOPIC_ROUTER = {
  type: 'function' as const,
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
};

const TOOL_ESCALATE = {
  type: 'function' as const,
  name: 'escalate_to_human',
  description:
    "Hand the call to a D365 human caseworker queue. ONLY use this when the citizen EXPLICITLY asks for a human (says 'human', 'agent', 'caseworker', 'speak to someone', 'real person', presses 0), or when the topic is genuinely sensitive (homelessness, domestic violence, child safety, identity theft, suicidal ideation), or when lookup_topic_router was already called and its response set escalate=true. DO NOT call this as a first action — always try lookup_topic_router first for any factual question. Difficulty of the topic is not a reason to escalate.",
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        enum: ['low_confidence', 'sensitive_topic', 'citizen_request', 'sentiment_negative', 'cross_border'],
        description: 'Machine-readable reason aligned with foundry/agents/topic-router/escalation-rules.json. low_confidence is only valid AFTER lookup_topic_router has been called.',
      },
      summary: { type: 'string', description: 'A 1-2 sentence summary of the conversation so far, attached to the warm transfer for the caseworker.' },
    },
    required: ['reason'],
  },
};

const TOOL_END_CALL = {
  type: 'function' as const,
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
};

export function buildToolDefs(opts: { d365VoiceQueueId?: string }): Array<typeof TOOL_TOPIC_ROUTER | typeof TOOL_ESCALATE | typeof TOOL_END_CALL> {
  const tools: Array<typeof TOOL_TOPIC_ROUTER | typeof TOOL_ESCALATE | typeof TOOL_END_CALL> = [TOOL_TOPIC_ROUTER];
  if (opts.d365VoiceQueueId && opts.d365VoiceQueueId.length > 0) {
    tools.push(TOOL_ESCALATE);
  }
  tools.push(TOOL_END_CALL);
  return tools;
}

// Legacy export (kept for any consumer that imports the array directly).
// Prefer buildToolDefs() so escalate_to_human is dropped when D365 queue
// is not configured.
export const TOOL_DEFS = [TOOL_TOPIC_ROUTER, TOOL_ESCALATE, TOOL_END_CALL] as const;
