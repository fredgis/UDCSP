# Voice Orchestrator (`apps/voice/call-automation/`)

> Owner agent: A10-Voice — see `governance/agents/A10-voice.md`
> Status: implemented (Phase A complete)

## Purpose

Bridges three Azure components into a single low-latency citizen voice channel:

```
PSTN caller ─► ACS Call Automation ─► Voice Orchestrator ─► GPT-4o Realtime
                                            │
                                            ├──► Foundry topic-router (function tool)
                                            └──► D365 voice workstream (warm transfer)
```

| Concern              | Component                                                           |
| -------------------- | ------------------------------------------------------------------- |
| Telephony            | Azure Communication Services Call Automation (PSTN, SIP, WebRTC)    |
| Speech (STT/TTS/VAD) | Azure OpenAI **GPT-4o Realtime** (one stream, native Whisper STT)   |
| Brain                | Foundry **topic-router** agent (`/agents/topic-router/messages`)    |
| Human handoff        | Dynamics 365 **Voice Channel** workstream (warm transfer)           |
| Recording + récap    | ACS recording → Dataverse `callTranscript` → Fabric + Confidential Ledger anchor |

## Why this shape and not Bot Framework / MAF for the audio path?

* **Bot Framework SDK reaches end-of-life on 31 December 2025.** All net-new Microsoft voice + agent work is on the **Microsoft Agent Framework (MAF)** + M365 Agents SDK. We follow that direction for any *turn-based* agent surface.
* **But voice with GPT Realtime is not turn-based.** It is a continuous bidirectional audio stream with server-side VAD and barge-in. Microsoft's own canonical sample (`Azure-Samples/acs-azopenai-voice-integration`) connects ACS Call Automation directly to the Realtime WebSocket — no Bot Framework or MAF in the audio path. We adopt that pattern.
* **MAF still earns its keep.** The Foundry topic-router agent is itself an MAF-hosted agent reached over the same `/agents/topic-router/messages` HTTP contract that the chat widget uses. The voice orchestrator just exposes that agent to GPT Realtime as a *function tool*. One brain, three channels (chat, voice, copilot).

## Component map

```
apps/voice/call-automation/
├── src/
│   ├── index.ts              ── Express + WS upgrade entry point
│   ├── call-handler.ts       ── Event Grid handshake, AnswerCall, lifecycle events
│   ├── realtime-bridge.ts    ── ACS audio ↔ GPT Realtime WebSocket bridge + tool dispatch
│   ├── foundry-tool.ts       ── 3 function-tool definitions + APIM client (OAuth client-credentials)
│   ├── d365-handoff.ts       ── transferCallToParticipant with udcspEscalation context
│   ├── ivr-loader.ts         ── reads apps/voice/ivr/{locale}/*.yaml + recording disclosure
│   ├── logger.ts             ── App Insights wrapper (callConnectionId-scoped LogContext)
│   └── config.ts             ── env-driven config + isLiveMode helper
├── infra/
│   ├── voice-orchestrator.bicep        ── Container App + UAMI + KV-backed secrets
│   ├── event-grid-incoming-call.bicep  ── ACS IncomingCall → /api/acs/eventgrid
│   └── gpt-realtime-deployment.bicep   ── Azure OpenAI gpt-realtime per country
├── tests/
│   ├── ivr-loader.test.ts
│   └── foundry-tool.test.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Routes

| Method | Path                                       | Purpose                                                  |
| ------ | ------------------------------------------ | -------------------------------------------------------- |
| GET    | `/healthz`                                 | Liveness + readiness                                     |
| POST   | `/api/acs/eventgrid`                       | Event Grid `IncomingCall` (handles validation handshake) |
| POST   | `/api/acs/callbacks`                       | ACS Call Automation lifecycle events                     |
| WS     | `/api/acs/media?callConnectionId={id}`     | Bidirectional PCM 16k audio stream from/to ACS           |

## Function tools exposed to GPT Realtime

| Tool                  | Purpose                                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lookup_topic_router` | Calls APIM `/agents/topic-router/messages` with `{channel: 'voice', locale, text}`; result drives the spoken answer. If the agent flips `escalate=true`, we also invoke `transferToD365Caseworker`. |
| `escalate_to_human`   | Direct citizen request, sensitive topic, or DTMF `0`; warm-transfers to the country D365 voice workstream queue with an `udcspEscalation` JSON context the caseworker sees on screen.    |
| `end_call_with_recap` | Sends an SMS récap (best-effort, via the SMS templates) and hangs up.                                                                                                                    |

## Configuration

All wiring is environment-driven so secrets stay in Key Vault and the same image runs in DK/SE/NO. Required variables are listed in `src/config.ts`; the Bicep template injects them automatically. `isLiveMode()` returns `false` until ACS, OpenAI, APIM and D365 endpoints are populated, which keeps `npm run dev` safe locally.

## Local development

```pwsh
cd apps/voice/call-automation
npm install
npm run lint
npm test
npm run dev   # Express on :8080; WS upgrade on /api/acs/media
```

## Deployment

```pwsh
./scripts/Deploy-Voice.ps1 -Country no -Env dev
./scripts/Bind-AcsNumber.ps1 -Country no -Env dev
./scripts/Test-Voice.ps1 -Country no -Env dev
```

These scripts call the Bicep templates here and then bind the procured PSTN numbers from `apps/voice/acs/phone-number-bindings.yaml` to this orchestrator's Event Grid subscription.
