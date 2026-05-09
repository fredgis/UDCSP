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
import type WebSocket from 'ws';
import type { Config } from './config.js';
import { COUNTRY_LOCALES, loadIvrPack, type IvrPack } from './ivr-loader.js';
import { logEvent, logError, type LogContext } from './logger.js';
import { RealtimeBridge } from './realtime-bridge.js';

interface CallSession {
  callConnectionId: string;
  serverCallId: string;
  bridge?: RealtimeBridge;
  ivr: IvrPack;
  ctx: LogContext;
}

const sessions = new Map<string, CallSession>();

export class CallHandler {
  private cfg: Config;
  private client: CallAutomationClient;
  private credential: DefaultAzureCredential;

  constructor(cfg: Config) {
    this.cfg = cfg;
    this.credential = new DefaultAzureCredential();
    if (!cfg.acs.connectionString) {
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
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const ev of events) {
      if (ev.eventType === 'Microsoft.EventGrid.SubscriptionValidationEvent') {
        res.status(200).json({ validationResponse: ev.data?.validationCode });
        return;
      }
      if (ev.eventType === 'Microsoft.Communication.IncomingCall') {
        await this.answerIncomingCall(ev.data);
      }
    }
    res.sendStatus(200);
  }

  private async answerIncomingCall(data: any): Promise<void> {
    const incomingCallContext = data?.incomingCallContext;
    const correlationId = data?.correlationId ?? '';
    const callerId = data?.from?.rawId ?? '';
    const ctx: LogContext = { traceparent: correlationId, country: this.cfg.country };
    if (!incomingCallContext) {
      logError(new Error('IncomingCall event missing incomingCallContext'), ctx);
      return;
    }
    const callbackUrl = `${this.cfg.publicBaseUrl}/api/acs/callbacks`;
    const mediaWebSocketUrl = `${this.cfg.publicBaseUrl.replace(/^https?/, 'wss')}/api/acs/media`;

    const options: AnswerCallOptions = {
      callIntelligenceOptions: { cognitiveServicesEndpoint: this.cfg.acs.cognitiveServicesEndpoint },
      mediaStreamingOptions: {
        transportType: 'websocket',
        transportUrl: mediaWebSocketUrl,
        contentType: 'audio',
        audioChannelType: 'mixed',
        startMediaStreaming: true,
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
        ivr,
        ctx: { ...ctx, callConnectionId, locale: COUNTRY_LOCALES[this.cfg.country] },
      };
      sessions.set(callConnectionId, session);
      logEvent('call.answered', session.ctx, { callerId, serverCallId });
    } catch (err) {
      logError(err, ctx);
    }
  }

  // ACS sends CallConnected, MediaStreamingStarted, ParticipantsUpdated,
  // PlayCompleted, ContinuousDtmfRecognitionToneReceived, CallDisconnected.
  async handleAcsCallback(req: Request, res: Response): Promise<void> {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const ev of events) {
      const callConnectionId = ev?.data?.callConnectionId;
      const session = callConnectionId ? sessions.get(callConnectionId) : undefined;
      if (!session) continue;
      switch (ev.type) {
        case 'Microsoft.Communication.CallConnected':
          logEvent('call.connected', session.ctx, {});
          break;
        case 'Microsoft.Communication.MediaStreamingStarted':
          logEvent('call.media_started', session.ctx, {});
          break;
        case 'Microsoft.Communication.CallDisconnected':
          logEvent('call.disconnected', session.ctx, { reason: ev?.data?.callDisconnectedReason });
          session.bridge?.shutdown();
          sessions.delete(callConnectionId);
          break;
        case 'Microsoft.Communication.ContinuousDtmfRecognitionToneReceived':
          await this.handleDtmfTone(session, ev?.data?.tone);
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

  // Called by index.ts when a new WebSocket connection arrives at /api/acs/media.
  // ACS opens this socket once MediaStreaming is active.
  async attachMediaSocket(callConnectionId: string, socket: WebSocket): Promise<void> {
    const session = sessions.get(callConnectionId);
    if (!session) {
      logError(new Error(`No session for callConnectionId=${callConnectionId}`), { callConnectionId });
      socket.close();
      return;
    }
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
  }

  private async acquireOpenAiToken(): Promise<string> {
    if (!this.cfg.azureOpenAI.endpoint) return '';
    const at = await this.credential.getToken('https://cognitiveservices.azure.com/.default');
    if (!at) throw new Error('Failed to acquire Azure OpenAI access token (managed identity)');
    return at.token;
  }
}
