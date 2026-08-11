// ACS Call Automation handler.
// 1. Receives Microsoft.Communication.IncomingCall events from Event Grid.
// 2. Calls AnswerCall on the ACS Call Automation client, configuring
//    bidirectional Media Streaming so audio frames are pushed to our
//    /api/acs/media WebSocket endpoint.
// 3. Receives lifecycle events at /api/acs/callbacks (CallConnected,
//    ParticipantsUpdated, etc.) and starts the RealtimeBridge to GPT-4o.
// 4. On call termination, the bridge shuts down and the call recording
//    is left to ACS (recording is configured at workstream level).

import { CallAutomationClient, AnswerCallOptions } from '@azure/communication-call-automation';
import { DefaultAzureCredential } from '@azure/identity';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import type WebSocket from 'ws';
import type { Config } from './config.js';
import { COUNTRY_LOCALES, loadIvrPack, type IvrPack } from './ivr-loader.js';
import { logEvent, logError, type LogContext } from './logger.js';
import { RealtimeBridge } from './realtime-bridge.js';
import { parseAcsCallbackEvents, parseEventGridRequest, WebhookRequestError, type IncomingCallData } from './webhook-auth.js';

interface CallSession {
  callConnectionId: string;
  serverCallId: string;
  bridge?: RealtimeBridge;
  mediaAttaching: boolean;
  mediaNonce?: string;
  mediaNonceExpiresAt: number;
  ivr: IvrPack;
  ctx: LogContext;
}

const MEDIA_NONCE_TTL_MS = 30_000;

interface CallHandlerDependencies {
  client?: CallAutomationClient;
  credential?: Pick<DefaultAzureCredential, 'getToken'>;
}

export class CallHandler {
  private readonly cfg: Config;
  private readonly client: CallAutomationClient;
  private readonly credential: Pick<DefaultAzureCredential, 'getToken'>;
  private readonly sessions = new Map<string, CallSession>();

  constructor(cfg: Config, dependencies: CallHandlerDependencies = {}) {
    this.cfg = cfg;
    this.credential = dependencies.credential ?? new DefaultAzureCredential();
    if (dependencies.client) {
      this.client = dependencies.client;
    } else if (!cfg.acs.connectionString) {
      // Dev mode — instantiate a stub-friendly client. The CallAutomationClient
      // constructor still requires a connection-like input; we throw later if
      // any real ACS API is invoked without proper credentials.
      this.client = new CallAutomationClient('endpoint=https://example.invalid;accesskey=AA==');
    } else {
      this.client = new CallAutomationClient(cfg.acs.connectionString);
    }
  }

  // Event Grid sends a validation handshake first, then IncomingCall events.
  async handleEventGrid(req: Request, res: Response): Promise<void> {
    let delivery;
    try {
      delivery = parseEventGridRequest(req, this.cfg.acs.eventGridSubscriptionName);
    } catch (err) {
      if (!(err instanceof WebhookRequestError)) throw err;
      logEvent('eventgrid.rejected', {}, { reason: err.reason });
      res.sendStatus(err.statusCode);
      return;
    }
    if (delivery.kind === 'validation') {
      res.status(200).json({ validationResponse: delivery.validationCode });
      return;
    }
    for (const event of delivery.events) {
      await this.answerIncomingCall(event);
    }
    res.sendStatus(200);
  }

  private async answerIncomingCall(data: IncomingCallData): Promise<void> {
    const incomingCallContext = data.incomingCallContext;
    const correlationId = data.correlationId ?? '';
    const ctx: LogContext = { traceparent: correlationId, country: this.cfg.country };
    const callbackUrl = `${this.cfg.publicBaseUrl}/api/acs/callbacks`;
    const mediaNonce = randomBytes(32).toString('base64url');
    const mediaUrl = new URL('/api/acs/media', this.cfg.publicBaseUrl);
    mediaUrl.protocol = mediaUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    mediaUrl.searchParams.set('nonce', mediaNonce);

    const options: AnswerCallOptions = {
      callIntelligenceOptions: { cognitiveServicesEndpoint: this.cfg.acs.cognitiveServicesEndpoint },
      mediaStreamingOptions: {
        transportType: 'websocket',
        transportUrl: mediaUrl.toString(),
        contentType: 'audio',
        audioChannelType: 'mixed',
        startMediaStreaming: true,
        // enableBidirectional=true is REQUIRED for server→ACS playback; the
        // default is one-way (ACS→server, for STT only). Without it ACS
        // accepts our outbound audio frames silently and never plays them.
        enableBidirectional: true,
        // gpt-realtime 2025-08-28 emits 24 kHz PCM mono (the 'pcm16' in
        // session.update is bit-depth only). ACS defaults to 16 kHz; force
        // 24 kHz here so the rates match. The enum value is PascalCase
        // 'Pcm24KMono' per @azure/communication-call-automation v1.x.
        audioFormat: 'Pcm24KMono',
      } as any,
    };

    try {
      const answer = await this.client.answerCall(incomingCallContext, callbackUrl, options);
      const callConnectionId = answer.callConnectionProperties.callConnectionId ?? '';
      if (!callConnectionId) {
        logError(new Error('AnswerCall returned no callConnectionId'), ctx);
        return;
      }
      const serverCallId = answer.callConnectionProperties.serverCallId ?? '';
      const ivr = loadIvrPack(this.cfg.country);
      const session: CallSession = {
        callConnectionId,
        serverCallId,
        mediaAttaching: false,
        mediaNonce,
        mediaNonceExpiresAt: Date.now() + MEDIA_NONCE_TTL_MS,
        ivr,
        ctx: { ...ctx, callConnectionId, locale: COUNTRY_LOCALES[this.cfg.country] },
      };
      this.sessions.set(callConnectionId, session);
      logEvent('call.answered', session.ctx, {});
    } catch (err) {
      logError(err, ctx);
    }
  }

  // ACS sends CallConnected, MediaStreamingStarted, ParticipantsUpdated,
  // PlayCompleted, ContinuousDtmfRecognitionToneReceived, CallDisconnected.
  async handleAcsCallback(req: Request, res: Response): Promise<void> {
    let events;
    try {
      events = parseAcsCallbackEvents(req.body);
    } catch (err) {
      if (!(err instanceof WebhookRequestError)) throw err;
      logEvent('acs.callback_rejected', {}, { reason: err.reason });
      res.sendStatus(err.statusCode);
      return;
    }
    for (const ev of events) {
      const callConnectionId = ev.data.callConnectionId;
      const session = this.sessions.get(callConnectionId);
      if (!session) continue;
      switch (ev.type) {
        case 'Microsoft.Communication.CallConnected':
          logEvent('call.connected', session.ctx, {});
          break;
        case 'Microsoft.Communication.MediaStreamingStarted':
          logEvent('call.media_started', session.ctx, {});
          break;
        case 'Microsoft.Communication.CallDisconnected':
          logEvent('call.disconnected', session.ctx, {
            reason: typeof ev.data.callDisconnectedReason === 'string' ? ev.data.callDisconnectedReason : undefined,
          });
          session.bridge?.shutdown();
          this.sessions.delete(callConnectionId);
          break;
        case 'Microsoft.Communication.ContinuousDtmfRecognitionToneReceived':
          if (typeof ev.data.tone === 'string') {
            await this.handleDtmfTone(session, ev.data.tone);
          }
          break;
        default:
          break;
      }
    }
    res.sendStatus(200);
  }

  private async handleDtmfTone(session: CallSession, tone: string): Promise<void> {
    // 0 → escalate; * → repeat last prompt. The IVR YAMLs encode the rest.
    if (tone === 'tone0') {
      logEvent('call.dtmf_escalate', session.ctx, { tone });
      // Ask the bridge to escalate via the Realtime function tool path.
      // We do this by sending a synthetic transcript that triggers the model.
      session.bridge?.['sendRealtime']?.({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '[DTMF 0 — citizen requests human agent]' }] },
      });
      session.bridge?.['sendRealtime']?.({ type: 'response.create' });
    }
  }

  consumeMediaNonce(nonce: string): string | null {
    const now = Date.now();
    for (const [callConnectionId, session] of this.sessions) {
      if (session.mediaNonce !== nonce) continue;
      session.mediaNonce = undefined;
      if (session.mediaNonceExpiresAt <= now || session.bridge || session.mediaAttaching) {
        return null;
      }
      return callConnectionId;
    }
    return null;
  }

  // Purge unanswered media sessions if ACS never opens the nonce-bound socket.
  startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [callConnectionId, session] of this.sessions) {
        if (!session.bridge && !session.mediaAttaching && session.mediaNonceExpiresAt <= now) {
          logEvent('session.purged_stale', { callConnectionId }, {});
          this.sessions.delete(callConnectionId);
        }
      }
    }, 30_000).unref();
  }

  async attachMediaSocket(callConnectionId: string, socket: WebSocket): Promise<void> {
    const session = this.sessions.get(callConnectionId);
    if (!session) {
      logEvent('media.attach_rejected', { callConnectionId }, { reason: 'unknown_session' });
      socket.close(1008, 'Unauthorized');
      return;
    }
    if (session.bridge || session.mediaAttaching) {
      logEvent('media.attach_rejected', session.ctx, { reason: 'bridge_already_attached' });
      socket.close(1008, 'Media already attached');
      return;
    }
    session.mediaAttaching = true;
    try {
      const token = await this.acquireOpenAiToken();
      const bridge = new RealtimeBridge({
        cfg: this.cfg,
        acsClient: this.client,
        callConnectionId,
        acsMediaSocket: socket,
        ivr: session.ivr,
        sessionId: session.serverCallId || callConnectionId,
        ctx: session.ctx,
      });
      session.bridge = bridge;
      await bridge.start(token);
    } catch (err) {
      session.bridge = undefined;
      throw err;
    } finally {
      session.mediaAttaching = false;
    }
  }

  private async acquireOpenAiToken(): Promise<string> {
    if (!this.cfg.azureOpenAI.endpoint) return '';
    const at = await this.credential.getToken('https://cognitiveservices.azure.com/.default');
    if (!at) throw new Error('Failed to acquire Azure OpenAI access token (managed identity)');
    return at.token;
  }
}
