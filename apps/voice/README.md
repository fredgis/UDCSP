# UDCSP Voice & Channels

## Purpose
Azure Communication Services, IVR, Azure AI Speech, transcription, escalation, and SMS/email notification scaffold for A10.

## ⚠️ Voice runtime readiness

**This tree is design content + IaC scaffolding for the voice channel. The runtime that handles a real PSTN call is provided by Dynamics 365 Customer Service voice channel** (which is built on Azure Communication Services under the hood) — not by code in this directory. Today, neither the D365 voice trial nor a real bot adapter is yet wired in this repo, so a real human dialling a real phone number does not yet reach the Foundry agent. The gap is small and Microsoft-productized; see [`docs/biz/voice.md` § 11](../../docs/biz/voice.md#11--voice-runtime--readiness-vs-scaffold-whats-actually-runnable-today) for the canonical readiness analysis.

**What this tree gives you:**
- Deployable Bicep for the ACS resource (per country, sovereignty-pinned via `dataLocation`) and the AI Speech account
- Procurement-intent Bicep for the PSTN number (real Nordic numbers are issued by the regulator — DK ERST, SE PTS, NO Nkom — not by IaC; for demo, use the D365 trial US toll-free, see voice.md § 11.2)
- 24 IVR dialog YAMLs in 6 languages (`kind: UDCSP.Voice.Dialog`) — design source for the D365 voice workstream IVR menu; not consumed at runtime
- The 12-language recording-disclosure script — played at call-pickup once configured in the D365 workstream
- The escalation policy YAML — design source for the D365 voice workstream queue routing
- A blueprint of the transcript pipeline (`transcript-pipeline/logic-app-transcription.json`) — *spec*, not workflow; **superseded** by D365's native transcription
- SMS / email récap templates

**What is missing for a real call to reach the agent (Phase A, ~½ day):**
- Enable the D365 Customer Service voice trial (1 click in Copilot Service admin center → free 60 min US toll-free)
- A small Bot Framework SDK bot (~150 lines) that proxies each turn to APIM `/agents/topic-router/messages` (same backend as `ChatWidget.tsx`)
- Register the bot in the D365 voice workstream and assign it as the IVR handler
- Configure the workstream IVR menu in the D365 admin UI using the YAMLs in `apps/voice/ivr/` as the design spec

**What is missing for production Nordic numbers (Phase B, 1–3 weeks regulator + ½ day code):**
- Submit the ACS regulatory pack per country (procedure documented in `docs/biz/voice.md` § 9)
- Sync the procured numbers into D365
- Add the 6 missing Speech voice fonts (NN, SE-Sami, FR, PL, UK, FI)

**What is NOT needed (despite earlier scaffolding suggesting otherwise):**
- ❌ A custom Azure Function App with the Call Automation SDK — D365 voice channel IS that runtime
- ❌ A Logic App for transcription — D365 records and transcribes natively
- ❌ Event Grid `IncomingCall` wiring — D365 owns the call leg
- ❌ A custom APIM voice route — the bot adapter calls the same `/agents/topic-router/messages` endpoint as the chat widget

## Dev setup
Install Azure PowerShell/Bicep in the deployment environment only. Placeholder numbers, resource names, and endpoints must be supplied by platform teams before execution.

## Build
Bicep files are deployable modules. No local build is required for YAML/JSON templates.

## Test
`scripts/Test-Voice.ps1` is a string-comparison stub against a hard-coded transcript — it asserts the prompts file is well-formed but does not exercise ACS, Speech, or the agent. Replace with the ACS test-call API once the Call Automation handler is provisioned.

## Deploy
`scripts/Deploy-Voice.ps1` validates parameters and prints the Azure deployment command without executing it; replace placeholders with environment values in CI.

## Owner
Frontend & Channels build agent — work package A10.
