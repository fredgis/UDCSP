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
import { TOOL_DEFS, buildToolDefs, callTopicRouter } from './foundry-tool.js';
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
  // ACS Call Automation bidirectional media streaming uses PascalCase for
  // OUTBOUND frames (server → ACS) and lowercase for INBOUND (ACS → server).
  // Official MS samples also include 'StopAudio: null' on every audio frame
  // — without that sibling key ACS silently drops the playback.
  Kind: 'AudioData';
  AudioData: { Data: string };
  StopAudio: null;
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
        turn_detection: {
          type: 'server_vad',
          // Higher threshold + longer silence window = fewer false positives
          // during the model's own welcome (~10 s) and during line noise on
          // mobile callers. Without these knobs VAD trips on background
          // sound, commits an empty buffer, and (with create_response=true)
          // the model auto-responds to nothing — yielding hallucinated
          // turns like 'I can help with tax' before the caller has said
          // anything.
          threshold: 0.7,
          prefix_padding_ms: 500,
          silence_duration_ms: 1500,
          create_response: true,
        },
        tools: buildToolDefs({ d365VoiceQueueId: this.cfg.d365.voiceWorkstreamQueueId }),
        tool_choice: 'auto',
        temperature: 0.6,
        max_response_output_tokens: 800,
      },
    };
    this.sendRealtime(sessionUpdate);

    // Greet the caller with the recording disclosure + welcome prompt
    // by injecting an assistant message and asking the model to speak it.
    // AOAI Realtime requires modalities to be either ['text'] or
    // ['audio', 'text'] — ['audio'] alone is rejected with invalid_value.
    const initialResponse = {
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: `Speak the following greeting verbatim, in ${this.ivr.locale}, calmly and warmly. After the closing question, STOP and wait for the citizen — do NOT add filler words ("Sure", "Okay") and do NOT continue talking:\n\n"${this.ivr.recordingDisclosure}\n\n${this.ivr.welcome.prompts.normal}"`,
      },
    };
    this.sendRealtime(initialResponse);
  }

  private systemInstructions(): string {
    return [
      `You are the UDCSP citizen voice assistant for ${this.cfg.country.toUpperCase()}, speaking ${this.ivr.locale}.`,
      `Speak the recording disclosure and welcome verbatim as the very first thing you say, then go silent.`,
      `After every turn you take, STOP and WAIT for the citizen to speak. Never speak twice in a row. Never invent that the citizen said something.`,
      `For ANY question about residency, tax, child benefit, social, business, healthcare or education: call lookup_topic_router with the citizen's actual question. Do NOT answer from your own knowledge.`,
      `MANDATORY: After lookup_topic_router returns, you MUST read the 'reply' field back to the citizen — paraphrased to sound natural over voice (drop markdown, drop bullet stars, drop emojis, expand abbreviations). Even if the reply contains a caveat about authentication ("not signed in", "general guidance only", "sign in with BankID"), you MUST still speak the substantive content; you may briefly mention the sign-in option at the very end but DO NOT refuse to answer because of the caveat.`,
      `Never say "I cannot help", "I have no access to that information", "I'm not authorised", or any equivalent refusal. The router IS your information source — its reply IS the answer. If the reply is long, summarise the key facts in 2-3 spoken sentences.`,
      `If the citizen mentions just a topic word ("tax", "residency") without details, reply with ONE short follow-up question like "What would you like to know about tax?" and wait. Do NOT call any tool yet.`,
      `You have NO ability to transfer this call. Never offer to transfer, never say "I'll connect you to a human" or "let me transfer you". Always answer the citizen yourself with the router's information.`,
      `Keep replies short (1-2 sentences when possible, up to 4 if the answer is naturally that long). End with a question or a confirmation, never a filler word.`,
      `Never repeat the citizen's national ID; call it "your national ID" instead.`,
      `When the citizen confirms they're done, call end_call_with_recap with a short SMS récap.`,
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
      case 'response.output_audio.delta':
        // GPT Realtime streams base64-encoded PCM audio chunks; relay to ACS.
        // The legacy gpt-4o-realtime-preview model uses response.audio.delta;
        // gpt-realtime (2025-08-28+) uses response.output_audio.delta. Handle both.
        logEvent('realtime.audio_delta', this.ctx, { bytes: msg.delta?.length ?? 0 });
        this.relayAudioToAcs(msg.delta);
        break;
      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
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
        // Surface every other event type once so we can diagnose schema drift
        // between gpt-4o-realtime-preview and gpt-realtime 2025-08-28.
        logEvent('realtime.event', this.ctx, { kind: msg.type });
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
    const frame: OutgoingAudioFrame = { Kind: 'AudioData', AudioData: { Data: base64Pcm }, StopAudio: null };
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
        // Strip the `escalate` flag from the output we hand back to gpt-realtime.
        // When the model sees escalate=true it verbalises "I'm transferring
        // you to a human" even though we have no human queue wired in dev.
        // Server-side we still honour escalate by calling transferToD365Caseworker
        // when D365_TRANSFER_TARGET_ID is set; until that env var is
        // populated, the transfer is a no-op anyway.
        output = { ok: true, reply: resp.reply, intent: resp.intent, citations: resp.citations };
        if (resp.escalate && this.cfg.d365.transferTargetCommunicationId) {
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
