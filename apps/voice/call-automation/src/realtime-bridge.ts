// Bridges the bidirectional audio WebSocket from ACS Call Automation to
// the Azure OpenAI GPT-4o Realtime WebSocket.
//
//                  ┌──────────────────────────────────────┐
//   ACS audio ──▶  │  inbound buffer  ──▶  GPT Realtime   │  ──▶ TTS audio ──▶ ACS
//   (PCM 16k)      │                                       │       (PCM 24k)
//                  │           function tools              │
//                  │   ┌─────────────────────────────┐     │
//                  │   │ lookup_topic_router         │ ──▶ │  APIM /agents/topic-router
//                  │   │ escalate_to_human           │ ──▶ │  D365 voice workstream transfer
//                  │   │ end_call_with_recap         │ ──▶ │  ACS SMS récap
//                  │   └─────────────────────────────┘     │
//                  └──────────────────────────────────────┘
//
// We use a server-VAD configuration so GPT Realtime detects the citizen
// finishing their utterance natively, without us doing endpointing.
// Barge-in is enabled (input audio interrupts current TTS playback).

import WebSocket from 'ws';
import type { CallAutomationClient } from '@azure/communication-call-automation';
import type { Config } from './config.js';
import type { IvrPack } from './ivr-loader.js';
import type { LogContext } from './logger.js';
import { logEvent, logError } from './logger.js';
import { TOOL_DEFS, callTopicRouter } from './foundry-tool.js';
import { transferToD365Caseworker } from './d365-handoff.js';

export interface BridgeOptions {
  cfg: Config;
  acsClient: CallAutomationClient;
  callConnectionId: string;
  acsMediaSocket: WebSocket;
  ivr: IvrPack;
  sessionId: string;
  ctx: LogContext;
}

interface OutgoingAudioFrame {
  kind: 'AudioData';
  audioData: { data: string };
}

const REALTIME_VOICES: Record<string, string> = {
  da: 'alloy',
  sv: 'shimmer',
  nb: 'verse',
  en: 'verse',
  de: 'echo',
  ar: 'sage',
};

function realtimeUrl(cfg: Config): string {
  const host = cfg.azureOpenAI.endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const params = new URLSearchParams({
    'api-version': cfg.azureOpenAI.apiVersion,
    deployment: cfg.azureOpenAI.realtimeDeployment,
  });
  return `wss://${host}/openai/realtime?${params.toString()}`;
}

export class RealtimeBridge {
  private realtime: WebSocket | null = null;
  private acs: WebSocket;
  private cfg: Config;
  private ivr: IvrPack;
  private sessionId: string;
  private callConnectionId: string;
  private acsClient: CallAutomationClient;
  private ctx: LogContext;
  private closed = false;

  constructor(opts: BridgeOptions) {
    this.cfg = opts.cfg;
    this.ivr = opts.ivr;
    this.sessionId = opts.sessionId;
    this.callConnectionId = opts.callConnectionId;
    this.acs = opts.acsMediaSocket;
    this.acsClient = opts.acsClient;
    this.ctx = opts.ctx;
  }

  async start(token: string): Promise<void> {
    const url = realtimeUrl(this.cfg);
    // Azure OpenAI Realtime accepts either api-key (key auth) OR
    // Authorization: Bearer (AAD auth). Sending both confuses some
    // server-side variants and triggered a 400 on first connect when we
    // were sending the MI bearer in both headers. Use Bearer only — the
    // managed identity acquires a token for cognitiveservices.azure.com.
    this.realtime = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    this.realtime.on('open', () => this.onRealtimeOpen());
    this.realtime.on('message', (raw) => this.onRealtimeMessage(raw.toString()));
    this.realtime.on('close', (code, reason) => {
      logEvent('realtime.closed', this.ctx, { code, reason: reason.toString() });
      this.shutdown();
    });
    this.realtime.on('error', (err) => logError(err, this.ctx));

    this.acs.on('message', (raw) => this.onAcsAudio(raw.toString()));
    this.acs.on('close', () => this.shutdown());
    this.acs.on('error', (err) => logError(err, this.ctx));
  }

  private onRealtimeOpen(): void {
    logEvent('realtime.opened', this.ctx, { deployment: this.cfg.azureOpenAI.realtimeDeployment });
    const voice = REALTIME_VOICES[this.ivr.locale] ?? 'verse';
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        instructions: this.systemInstructions(),
        voice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500, create_response: true },
        tools: TOOL_DEFS,
        tool_choice: 'auto',
        temperature: 0.6,
        max_response_output_tokens: 800,
      },
    };
    this.sendRealtime(sessionUpdate);

    // Greet the caller with the recording disclosure + welcome prompt
    // by injecting an assistant message and asking the model to speak it.
    const initialResponse = {
      type: 'response.create',
      response: {
        modalities: ['audio'],
        instructions: `Speak the following greeting verbatim, in ${this.ivr.locale}, calmly and warmly:\n\n"${this.ivr.recordingDisclosure}\n\n${this.ivr.welcome.prompts.normal}"`,
      },
    };
    this.sendRealtime(initialResponse);
  }

  private systemInstructions(): string {
    return [
      `You are the UDCSP citizen voice assistant for ${this.cfg.country.toUpperCase()}.`,
      `You speak ${this.ivr.locale} with a warm, neutral, accessible voice.`,
      `Always start by playing the recording disclosure and welcome prompt that was injected as an initial response. Do not ad-lib it.`,
      `Use the lookup_topic_router function for any factual or domain question (residency, tax, child benefit, social, business). Never invent administrative facts.`,
      `If the citizen says "agent", "human", "caseworker", "complaint", presses 0, expresses distress, or the topic is sensitive (homelessness, domestic violence, child safety, identity theft), call escalate_to_human immediately with reason=citizen_request or sensitive_topic.`,
      `If sentiment turns negative or the topic-router escalate flag is true, call escalate_to_human with reason=sentiment_negative or low_confidence.`,
      `Keep responses short and clear (max ~3 sentences). Always confirm next steps. Offer the slow-speech mode if the citizen seems to struggle.`,
      `Never share personal data of other people. Never quote the citizen's CPR / personnummer / fødselsnummer back; refer to it as "your national ID" once consent is implied.`,
      `When the conversation is complete, call end_call_with_recap with a short SMS récap in the citizen language.`,
    ].join(' ');
  }

  private async onRealtimeMessage(raw: string): Promise<void> {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      logError(err, this.ctx);
      return;
    }
    switch (msg.type) {
      case 'response.audio.delta':
        // GPT Realtime streams base64-encoded PCM audio chunks; relay to ACS.
        this.relayAudioToAcs(msg.delta);
        break;
      case 'response.audio_transcript.done':
        logEvent('realtime.assistant_transcript', this.ctx, { transcript: msg.transcript });
        break;
      case 'conversation.item.input_audio_transcription.completed':
        logEvent('realtime.user_transcript', this.ctx, { transcript: msg.transcript });
        break;
      case 'response.function_call_arguments.done':
        await this.handleToolCall(msg.call_id, msg.name, msg.arguments);
        break;
      case 'error':
        logError(new Error(`realtime error: ${JSON.stringify(msg.error)}`), this.ctx);
        break;
      default:
        // Ignore the chatty events (rate-limits, response.created, etc.)
        break;
    }
  }

  private onAcsAudio(raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      logError(err, this.ctx);
      return;
    }
    if (msg.kind === 'AudioData' && msg.audioData?.data) {
      // ACS sends base64 PCM 16k mono; GPT Realtime accepts the same.
      this.sendRealtime({ type: 'input_audio_buffer.append', audio: msg.audioData.data });
    } else if (msg.kind === 'StopAudio') {
      // Caller hung up or interrupted; let server VAD finalise.
      this.sendRealtime({ type: 'input_audio_buffer.commit' });
    }
  }

  private relayAudioToAcs(base64Pcm: string): void {
    const frame: OutgoingAudioFrame = { kind: 'AudioData', audioData: { data: base64Pcm } };
    if (this.acs.readyState === WebSocket.OPEN) {
      this.acs.send(JSON.stringify(frame));
    }
  }

  private async handleToolCall(callId: string, name: string, argsJson: string): Promise<void> {
    let args: any = {};
    try {
      args = JSON.parse(argsJson);
    } catch {
      // ignore
    }
    logEvent('realtime.tool_call', this.ctx, { tool: name, args });
    let output: unknown = { ok: false, error: 'unknown_tool' };
    try {
      if (name === 'lookup_topic_router') {
        const resp = await callTopicRouter(
          this.cfg,
          { sessionId: this.sessionId, channel: 'voice', locale: args.locale ?? this.ivr.locale, text: args.text ?? '', callConnectionId: this.callConnectionId, traceparent: this.ctx.traceparent },
          this.ctx,
        );
        output = { ok: true, reply: resp.reply, intent: resp.intent, escalate: resp.escalate, citations: resp.citations };
        if (resp.escalate) {
          await transferToD365Caseworker(
            this.acsClient,
            this.cfg,
            { callConnectionId: this.callConnectionId, reason: resp.escalationReason ?? 'low_confidence', summary: resp.reply },
            this.ctx,
          );
        }
      } else if (name === 'escalate_to_human') {
        await transferToD365Caseworker(
          this.acsClient,
          this.cfg,
          { callConnectionId: this.callConnectionId, reason: args.reason ?? 'citizen_request', summary: args.summary },
          this.ctx,
        );
        output = { ok: true, transferred: true };
      } else if (name === 'end_call_with_recap') {
        await this.sendSmsRecap(args.recapText ?? '');
        await this.acsClient.getCallConnection(this.callConnectionId).hangUp(true);
        output = { ok: true, ended: true };
      }
    } catch (err) {
      logError(err, this.ctx);
      output = { ok: false, error: (err as Error).message };
    }

    this.sendRealtime({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(output) } });
    this.sendRealtime({ type: 'response.create' });
  }

  private async sendSmsRecap(_text: string): Promise<void> {
    // SMS récap is provisioned via apps/voice/notifications/sms-templates.json
    // and sent through ACS SMS in a best-effort fire-and-forget call. The
    // implementation lives in the SMS phase; here we only log the intent
    // so a missing SMS does not break the call hangup.
    logEvent('sms_recap.requested', this.ctx, { textLength: _text.length });
  }

  private sendRealtime(payload: unknown): void {
    if (this.realtime && this.realtime.readyState === WebSocket.OPEN) {
      this.realtime.send(JSON.stringify(payload));
    }
  }

  shutdown(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.realtime?.close();
    } catch { /* ignore */ }
    try {
      this.acs.close();
    } catch { /* ignore */ }
    logEvent('bridge.closed', this.ctx, {});
  }
}
