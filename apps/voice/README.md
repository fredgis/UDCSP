# UDCSP Voice & Channels

## Purpose
Azure Communication Services, IVR, Azure AI Speech, transcription, escalation, and SMS/email notification scaffold for A10.

## ✅ Voice runtime (Phase A — implemented)

A real human dialling a real PSTN number bound to the country ACS resource will reach a low-latency conversational agent. The runtime that bridges ACS Call Automation to the Foundry brain lives in [`apps/voice/call-automation/`](./call-automation/README.md):

```
PSTN caller ─► ACS Call Automation ─► apps/voice/call-automation ─► GPT-4o Realtime
                                              │                          (function tool)
                                              ├──► APIM /agents/topic-router/messages
                                              │       (services/apim/apis/agent-topic-router)
                                              │
                                              └──► D365 voice workstream (warm transfer
                                                   via transferCallToParticipant +
                                                   udcspEscalation operationContext)
```

See [`docs/biz/voice.md` § 11](../../docs/biz/voice.md#11--voice-runtime--implemented-phase-a-complete) for the canonical readiness analysis and architecture rationale (why orchestrator + GPT Realtime instead of Bot Framework / MAF in the audio path).

## Component map

| Path | Role |
|---|---|
| `call-automation/` | **Voice orchestrator Container App** — the runtime. Node.js + TS, ACS Call Automation SDK, Azure OpenAI Realtime WebSocket, Foundry topic-router as a function tool, D365 warm transfer. |
| `acs/acs-resource.bicep` | Per-country ACS resource (sovereignty-pinned via `dataLocation`). |
| `acs/phone-numbers.bicep` | Procurement intent + regulator checklist for PSTN numbers. |
| `acs/phone-number-bindings.yaml` | Binding ledger written by `scripts/Bind-AcsNumber.ps1`. |
| `speech/speech-config.bicep` + `voice-fonts.json` | Azure AI Speech voices and lexicons used by D365 pre-orchestrator menus / post-call analytics. GPT Realtime brings its own TTS, so this scope is now narrower than before. |
| `ivr/{lang}/*.yaml` | 24 IVR dialog files (`kind: UDCSP.Voice.Dialog`) — loaded at runtime by `ivr-loader.ts`. |
| `recording-consent/recording-disclosure.md` | 12-language disclosure script played at call-pickup. |
| `escalation/escalation-config.yaml` | Routing rules consumed by the orchestrator's `escalate_to_human` tool. |
| `transcript-pipeline/logic-app-transcription.json` | Blueprint for post-call enrichment (Dataverse → Fabric + Confidential Ledger). Pending promotion to a real workflow. |
| `notifications/{sms,email}-templates.json` | ACS SMS / email récap templates. |
| `scripts/Deploy-Voice.ps1` | Real `az deployment group create` for the 3 Bicep files in `call-automation/infra/`. |
| `scripts/Test-Voice.ps1` | Real smoke test — `/healthz` + Event Grid SubscriptionValidationEvent handshake. |
| `scripts/Bind-AcsNumber.ps1` | Verifies number ownership and persists the binding to `phone-number-bindings.yaml`. |

## Dev setup

Install Node 22, the Azure CLI and (optionally) Bicep. The orchestrator's own dev workflow:

```pwsh
cd apps/voice/call-automation
npm install
npm run lint
npm test
npm run dev
```

## Deploy

```pwsh
./scripts/Deploy-Voice.ps1 -Country no -Env dev `
    -ResourceGroup udcsp-no-rg -Location norwayeast `
    -ContainerAppsEnvironmentId <id> -UserAssignedIdentityId <id> `
    -Image <acr>/udcsp-voice-orch:<tag> `
    -AzureOpenAiAccountName udcsp-no-aoai -AzureOpenAiEndpoint https://udcsp-no-aoai.openai.azure.com/ `
    -ApimBaseUrl https://udcsp-apim-no.azure-api.net `
    -CognitiveServicesEndpoint https://udcsp-no-cog.cognitiveservices.azure.com/ `
    -AcsConnectionStringSecretUri https://udcsp-no-kv.vault.azure.net/secrets/acs-cs `
    -VoiceClientSecretUri https://udcsp-no-kv.vault.azure.net/secrets/voice-sp-secret `
    -VoiceClientId <client-id> `
    -AppInsightsConnectionString '<conn>' `
    -PublicHostname udcsp-no-dev-voice-orch.norwayeast.azurecontainerapps.io `
    -D365TransferTargetId 8:acs:... -D365VoiceQueueId <guid> `
    -DeadLetterStorageAccountId <id> -AcsResourceName udcsp-no-acs

./scripts/Bind-AcsNumber.ps1 -Country no -Env dev -PhoneNumber +47XXXXXXXX `
    -AcsResourceName udcsp-no-acs -ResourceGroup udcsp-no-rg `
    -OrchestratorFqdn udcsp-no-dev-voice-orch.norwayeast.azurecontainerapps.io
```

Both scripts are idempotent (`-WhatIf` supported on Deploy / Bind). `Test-Voice.ps1` then exercises the live endpoint.

## Test

`scripts/Test-Voice.ps1` posts an Event Grid `SubscriptionValidationEvent` to the orchestrator and asserts the validation code is echoed back, then probes `/healthz`. The vitest suite under `call-automation/tests/` covers the IVR loader and the function-tool contract.

## Owner
Frontend & Channels build agent — work package A10.

