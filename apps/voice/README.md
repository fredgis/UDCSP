# UDCSP Voice & Channels

## Purpose
Azure Communication Services, IVR, Azure AI Speech, transcription, escalation, and SMS/email notification scaffold for A10.

## ⚠️ Voice runtime readiness

**This tree is declarative scaffolding. It is not, today, a runnable end-to-end voice channel.** A real PSTN call from a citizen does not yet reach the Foundry topic-router, because the bridging service (Call Automation handler that subscribes to ACS Event Grid `IncomingCall`, drives streaming STT/TTS, and posts to APIM) is not in the repo.

**What this tree gives you:**
- Deployable Bicep for the ACS resource (per country) and the AI Speech account
- Procurement-intent Bicep for the PSTN number (the real number is issued by the regulator — DK ERST, SE PTS, NO Nkom — not by IaC)
- 24 IVR dialog YAMLs in 6 languages (`kind: UDCSP.Voice.Dialog`)
- The 12-language recording-disclosure script
- The escalation policy YAML
- A blueprint of the transcript pipeline (`transcript-pipeline/logic-app-transcription.json` is a *spec*, not a Logic App workflow definition)
- SMS / email récap templates

**What is missing for a real call to reach the agent:**
- A Call Automation handler service (Function or Container App) using `Azure.Communication.CallAutomation`
- Event Grid wiring `Microsoft.Communication.IncomingCall` → handler HTTPS endpoint
- An APIM voice ingress route (`/agents/topic-router/voice/messages` with `actor=voice` JWT enforcement)
- A real Logic App workflow.json replacing the descriptive blueprint
- A regulator-approved PSTN number per country
- The 6 remaining Speech voice fonts (NN, SE-Sami, FR, PL, UK, FI) — today fall back to the 6 scaffolded fonts

**Canonical readiness section:** [`docs/biz/voice.md` § 11](../../docs/biz/voice.md#11--voice-runtime--readiness-vs-scaffold-whats-actually-runnable-today).

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
