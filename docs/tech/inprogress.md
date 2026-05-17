# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox. Update one row at a time as we wire each demo.

- **Web SWA** — https://udcsp.fredgis.com
- **Current SPA bundle** — `nordic-map-+-tax-administration-+-case-detail-3-tier-parser` (recent commits: `45b6393` case-detail parser + redesign, `42612e9` /tax-administration page, `bb69d11` real Natural Earth Nordic map). Earlier bundles `D3-pl-locale-translator-axe` (Polish locale, Translator in LA, axe-core CI) + `signout-home-+-authgate-redesign-+-required-asterisks-+-eid-preview` still active for D3 + auth flow.
- **Current observability bundle** — Demo 9 workbooks (3 × DK/SE/NO, 9 total) deployed live on the per-country App Insights via direct ARM PUT (the `application-insights` az extension 1.2.3 silently drops `--kind shared`). Voice orchestrator telemetry already flowing into NO; DK/SE remain empty until a country-specific orchestrator or instrumented surface is deployed. Recent commits: `ed7a6af` (timechart → barchart histograms), `30c2537` (patterns aligned with real voice events `call.*` / `realtime.*` / `topic_router.*`), `fec8845` (timeContextFromParameter fix), `6737f3e` (functional KQL replacing scaffolds), `25a7f08` (Platform Monitoring install section + dual-surface plan).
- **Deploy** — SWA `udcsp-web-dev` has no GitHub Action: every change is pushed live with `npm run build && npx --yes @azure/static-web-apps-cli@latest deploy ./dist --deployment-token <key> --env production --no-use-keychain` (token from `az staticwebapp secrets list -n udcsp-web-dev`).

> ⚠️ **Caseworker surface — temporary stance.** Until per-country D365 Customer Service envs are provisioned, the caseworker workspace runs as a **model-driven Power App on the shared Dataverse env `org939d8f07`** (DK system tenant). The `udcsp_application` schema + Power Fx form + column logical names match the future D365 CS deployment for drop-in replacement. Today the LA `application-intake` writes to the standard `tasks` table; the LA repoint to `udcsp_applications` happens once D365 CS is installed. See **📂 Reference → 🧑‍💼 Caseworker UI strategy (D7)** below.

## Demo status

**Status legend** — 🟢 played live end-to-end · 🟡 built & wired, not yet played live · 🔴 not built / placeholders only.

The 10 rows below mirror the 10 demos defined in [`docs/biz/uses.md`](../biz/uses.md). State reflects what *can be played today on the live tenant*, not what has been provisioned in Azure.

| #  | Demo (uses.md)                                            | State | What works today                                                                                          | What blocks a live walk-through                                                                                              |
|----|-----------------------------------------------------------|:-----:|-----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| 1  | Anna moves Copenhagen → Stockholm (cross-border)          | 🟡    | **Citizen-side single rail is live** (sign-in via External ID across DK/SE/NO CIAM tenants, 6-step Residency wizard in 12 langs, Foundry-driven eligibility pre-submit via APIM v3, POST → LA `application-intake` → Dataverse `tasks`, My Cases cross-device re-hydration via APIM GET op-policy, Case Detail with 3-tier description parser, Remove cascade DV row + blob via DELETE op-policy with ownership guard). APIM `agent-topic-router` knows the DK/SE/NO residency rules + Info Norden / Øresunddirekt / Grensetjänsten cross-border refs. LA `cross-border-residency` workflow.json scaffolded. Caseworker workspace = model-driven Power App on shared Dataverse (drop-in for future D365 CS). | Cross-border fan-out (Service Bus + eIDAS bridge + signed-claims envelope) not wired; SE D365 Customer Service env not provisioned; ACS notification SV+EN template absent; Verified ID issuance + SE portal auto-onboarding not built; Foundry trace ID not surfaced on Case Detail; SLA timer + Power BI median-4d KPI missing. |
| 2  | Lars asks voice assistant for tax refund (NO)             | 🟢    | **Voice channel live end-to-end on `+33 801 150 799`** routed via `udcsp-no-acs` (data-location Norway, sovereignty intact). ACS Call Automation → orchestrator Container App (UAMI-bound, KV-backed secrets) → gpt-realtime (2025-08-28) on `udcspai` Sweden Central → `lookup_topic_router` function tool via APIM `/agent-topic-router/messages` → Foundry citizen-assistant. EN locale override active for jury demos (`UDCSP_LOCALE_OVERRIDE=en`). Transcripts (`realtime.assistant_transcript` + `realtime.user_transcript`) ingested into App Insights with traceparent end-to-end. 8 wire-protocol gotchas documented in `voice.md § 11.9`. New `/tax-administration` page (AuthGate + Anna-only FR-number override) entry point. | **Demo 2 v1 = no-handoff** (D365 voice workstream not provisioned): `escalate_to_human` gated on empty `D365_VOICE_QUEUE_ID` → tool not exposed to gpt-realtime. Audio recording to `voice-recordings/` blob also gated; only transcript is captured. Both re-enabled in v2 once D365 CS NO is installed. |
| 3  | Maria with Windows Narrator (PL in DK)                    | 🟢    | DK chain works end-to-end (sign-in → APIM → LA → 4 Foundry agents → Dataverse `tasks`); MI-proxy upload onto `udcspdkprodlake`; workflow timeline; eligibility reasoning surfaced; consent-gating live; **PL locale bundle complete (12 languages translated end-to-end), Translator agent invoked in LA after Doc Extractor, axe-core CI gate active, site-wide RouteAnnouncer + cookie-banner a11y fix shipped**. | — Promoted 🟢 after live walk-through with Windows Narrator (Win + Ctrl + Enter) on Edge, Polish UI. |
| 4  | Erik snaps a payslip on mobile (DK)                       | 🟢    | **Scope reframed: Demo 4 = mobile-responsive SPA + accessibility, not a native app.** `udcsp.fredgis.com` renders correctly on iPhone (SE 375 px → 14 Pro Max 430 px) via 21 media queries across `home.css` + `accessibility.css` with breakpoints at 560/600/800/820/1100 px. Citizen rail (Apply Child Benefit + Apply Residency upload flows) works tactile, file picker uses the native iOS document/photo chooser. Chat widget pinned bottom-right, accessibility menu (slow-speech, high-contrast, reduce-motion) grid-stacks to 1 column under 600 px. axe-core CI gate green. RouteAnnouncer + cookie-banner a11y fix shipped in Demo 3 also benefits this row. | Native iOS/Android binary not packaged (Expo shell exists in repo but not built). Not on critical path for this demo — covered by the responsive PWA path above. |
| 5  | Astrid caseworker triages with Copilot for Service        | 🟡    | **Caseworker workspace = model-driven Power App** (`apps/d365/solutions/UDCSP_Core/customizations/apps/caseworker-app.xml` + `apps/powerapps/caseworker/README.md`) — single XML imports as the production-shape model-driven app via `pac solution import`; same Dataverse table (`udcsp_application`) the future D365 Customer Service deployment will use, so the artefact is a drop-in. Cross-country queue + AI verdict + extracted fields + workflow timeline + approve/reject/request-more-info via the form. Caseworker-helper Foundry agent deployed; APIM op routes to it. | `pac solution import` pending against `org939d8f07` (DK system tenant) and the per-country envs once they're provisioned; `udcsp_application` custom table needs to be authored once in `make.powerapps.com` then re-exported with `pac solution export --include customization` to embed the table XML in `apps/d365/solutions/UDCSP_Core/Other`. |
| 6  | Eligibility model proposes, caseworker disposes           | 🟡    | Eligibility Pre-Assessor `udcsp-eligibility` invoked synchronously from the citizen portal at step 4 (residency) and from the *AI eligibility pre-assessment* panel (child-benefit) via APIM `POST /eligibility-checks/assessments` — citizen sees the recommendation badge, confidence %, rule-by-rule evidence, missing-evidence list, citizen notice, caseworker summary BEFORE consenting. The verdict travels in the submit payload (`payload.eligibilityPreflight`). LA re-calls the agent for the AI Act art. 14 audit registry (dual-call by design). Caseworker disposes via the model-driven Power App. | LA writes to `tasks` activity entity today (canonical `udcsp_application` table provisioned but LA not yet repointed). No Confidential Ledger entry written for caseworker overrides yet; `udcsp_caseworker_decision` Dataverse table scaffolded but not yet persisted via a LA callback. |
| 7  | Hans the DPO audits a 6-month-old AI decision             | 🟡    | GDPR Art. 17 erasure stub `POST /gdpr/erasure-request` returns Priva certificate; SPA wipes local cache.  | Real Priva DSR connector pending E5 licence; Purview lineage endpoint still `placeholder.local`; no DPO console.              |
| 8  | Prompt-injection attempt is contained & investigated      | 🟡    | Foundry Content Safety filters enabled by default; APIM rate-limits per channel actor; Sentinel deployed. | No red-team scenario rehearsed; no Sentinel hunting query published; no incident-response runbook proven.                     |
| 9  | CIO per-country, per-language outcomes & 47-portal sunset | 🟡    | **Operator view live**: 9 App Insights workbooks deployed across DK/SE/NO (`platform-health`, `citizen-journey-funnel`, `ai-decision-traces` per country), KQL aligned with the real voice telemetry the NO orchestrator emits (`call.*`, `realtime.*`, `topic_router.*`, `escalation.*`). Histograms (volume + p50/p95/p99) + funnel + decision pie + recent-verdicts table with operation_Id drill. **NO instance receives live data from every dial test** (voice ACA wired via KV-bound `APPLICATIONINSIGHTS_CONNECTION_STRING`). **Sovereignty proof in the workbooks themselves**: switching from NO → DK → SE during the demo shows NO populated and DK/SE empty (no cross-region telemetry flow). | Executive surface (`apps/reporting/cio-dashboard.pbix` on Fabric workspace `UDCSP-Platform-Reporting`) not yet built; sunset CSV not authored; CSAT capture (voice IVR + web NPS) still in backlog; DK/SE workbooks empty by design until country-specific orchestrators or SPA instrumentation are added (M3 diag-settings → LAW available as a separate path, not yet executed). |
| 10 | DevOps stands up the platform from a clean tenant         | 🟡    | 25 install phases scripted in `scripts/install/Install-UDCSP.ps1`; B4-B7 Voice phase playbook expanded to 14 executable steps. | Not re-run on a clean tenant since the recent installer changes; needs a one-shot validation. |

**Live tonight**: Demo 1 + Demo 2 + Demo 3 + Demo 4 are playable end-to-end on `udcsp.fredgis.com` and `+33 801 150 799`. Demo 2 runs in no-handoff mode (D365 voice workstream not provisioned). Demo 4 reframed as responsive-PWA on iPhone — no native binary required for the demo path.

<details>
<summary><h2 id="demo-1-anna">Demo 1 (Anna · DK → SE) — current state</h2></summary>

> Source narrative: [`docs/biz/uses.md` § Demo 1](../biz/uses.md#-demo-1--anna-moves-from-copenhagen-to-stockholm-flagship). Self-rating: **~70 % of the happy-path jouable live** — citizen-side single-country rail wired end-to-end. The **cross-border fan-out + SE landing + notification loop** remains the missing third.

### What works today (✅)

- **DK / SE / NO sign-in** via External ID — three real CIAM tenants on `udcspdk.ciamlogin.com`, `udcspse.ciamlogin.com`, `udcspno.ciamlogin.com`.
- **`/apply/residency` wizard** — 3 steps (move details → documents → review & submit), localised in the 12 supported languages, accessible (WCAG 2.1 AA), with destination + move-date validation gating step 1.
- **Eligibility Foundry-driven** pre-submit (recommendation + confidence + rule-by-rule + missing evidence + citizen notice + caseworker summary), verdict embedded in `payload.eligibilityPreflight`.
- **POST /citizen-applications/** → LA `application-intake` → Dataverse `tasks` (description truncated server-side to 1900 chars — workaround `c2f44e8`).
- **My Cases cross-device** — APIM `GET /citizen-applications/` op-policy reads Dataverse filtered by `citizenUpn`, APIM MI has Systemadministrator role to read tasks owned by the LA MI; API-level cache removed so reads are real-time.
- **Case Detail** — SPA 3-tier description parser recovers `documentBlobUrl`, `extractedFields`, `eligibilityPreflight` even when the JSON was truncated mid-string. Redesigned hero + workflow timeline (Document Extractor shows `<filename> · N fields extracted`) + Eligibility section (rules, missing, notice, summary) + document attached + extracted fields.
- **Remove** — DELETE op-policy cascades Dataverse row + uploaded blob with ownership guard.
- **APIM `agent-topic-router`** system prompt teaches the model the residency-transfer copy for DK/SE/NO and the cross-border references (Info Norden, Øresunddirekt, Grensetjänsten).
- **Logic App `cross-border-residency`** workflow scaffold deployed: Service Bus trigger on queue `cross-border-coordination`, parameters for `aiActRegistryId`, `eidasValidationEndpoint`, `dkResidencyFacadeEndpoint`, `d365CasesEndpoint`, `acsNotificationEndpoint`, App Insights `traceparent` propagation.
- **Foundry agents** Classifier, Document Extractor, Eligibility Pre-Assessor, Translator already built and invoked from the DK application-intake LA (D3).
- **Governance assets**: DPIA `dpia-eligibility-model.md`, Purview DLP `block-cross-border-cpr-without-consent`, sensitivity label `Restricted-Cross-Border`, AI Act registry stub.
- **Cross-country flag UI** in the header; per-country tenant gating on `/login`.

### 🛑 Hard blocker — pending D365 Customer Service installation

> User is installing D365 Customer Service now (per-country envs). Resume Demo 1 hardening once the new envs exist. Until then, every cross-border item below is **blocked** — the SE landing has nowhere to land.

**Resume sequence after D365 Customer Service is installed:**

1. **Provision the DK/SE/NO D365 Customer Service envs** (per-country, NOT the shared `org939d8f07`). Note the new org URLs — they will become the new values for `d365-dataverse-url` named-values per APIM instance.
2. **Re-point the LA `application-intake`** from `…/api/data/v9.2/tasks` to `…/api/data/v9.2/udcsp_applications`. The workflow.json source-of-truth already maps every column (`services/logic-apps/workflows/application-intake/workflow.json` lines 156-220); a clean redeploy makes the legacy `tasks` write disappear and **eliminates the 2000-char truncation entirely** — the SPA's `descriptionParser.ts` becomes a legacy compatibility shim for old `tasks` rows.
3. **Update APIM op-policies** `GET /citizen-applications/` and `DELETE /{id}` to query `udcsp_applications?$filter=udcsp_citizenupn eq '<upn>'` instead of `tasks?$filter=contains(description,…)`. Also swap the field mapping in the GET-list body: `id=udcsp_applicationid`, `title=udcsp_displaytitle`, etc. The Document Extractor / Eligibility / DocumentBlobUrl sections will then come from dedicated columns instead of a parsed JSON blob.
4. **Bootstrap `udcsp_application` custom table on each new env** via `apps/powerapps/caseworker/bootstrap-udcsp-application.ps1` (idempotent; auto-detects base LCID since commit `22fa6cd`).
5. **Import the model-driven caseworker app** (`apps/d365/solutions/UDCSP_Core` via `pac solution import --publish-changes`) on the SE env first (it carries the SLA timer + queues).
6. **Cross-border submission path** — re-route Apply Residency from single-country POST to enqueue on `cross-border-coordination` Service Bus when destination ≠ origin (front-end + APIM op + LA trigger).
7. **eIDAS-bridge HTTP action** — replace `eidasValidationEndpoint` placeholder with a real validator (or a clearly-labeled mock that returns `eIDAS High` for the demo); produce a signed-claims JWT envelope so DK PII never crosses the border in the clear.
8. **DK → SE handoff in the LA `cross-border-residency`** — implement `Call_DK_residency_facade → Build_signed_claims → Post_to_SE_D365_cases` end-to-end against the new SE env; surface the resulting case ID back to APIM.
9. **Translator agent on outbound** — call `udcsp-translator` in the LA to produce SV body + EN summary.
10. **ACS push + email notification** — implement `Send_notification` HTTP action against ACS; produce templates `residency-approved.sv-SE.html` and `residency-approved.en.html`.
11. **Microsoft Entra Verified ID** — provision issuer, define `NordicResidencyCredential` schema, issue from the LA after caseworker approval.
12. **SE portal auto-onboarding** — accept the Verified ID at `udcspse.ciamlogin.com` via External ID's Verified ID custom-policy hook so Anna lands authenticated without re-registering.
13. **Foundry trace ID on Case Detail** — already capture `traceparent`; render a copyable trace link in the workflow timeline.
14. **D365 SLA timer + Power BI median-4d KPI** — configure the SLA on the SE Customer Service env once it's up.
15. **Cross-border consent enforcement** — gate the cross-border submission on `consent_cross_border = true` (toggle exists on `/consent` but is not checked yet).
16. **CSAT post-completion survey** + Fabric ingest for the +38 % satisfaction KPI.
17. **Recorded live walk-through** — once 1–9 are wired, play Anna DK → SE on the live tenant, capture screen + Foundry trace + LA run history; promote row 1 to 🟢.

</details>

<details>
<summary><h2 id="cross-demo">📋 Cross-demo backlog &amp; quick demos</h2></summary>

### What I can show right now (no further work)

1. Architecture & navigation: home, `/demos`, persona panel, footer.
2. **D3 DK auth path**: pick Danmark → Sign in / Create account → CIAM hosted page on `udcspdk.ciamlogin.com` → return to portal authenticated.
3. Multi-tenant gating: ✓/⚠ markers per country card on `/login` show governance posture.

### How to test D3 end-to-end on the portal (10 min, no screen reader)

1. Open https://udcsp.fredgis.com in an **InPrivate / Incognito** window (forces a fresh token).
2. On `/login`, click the **Danmark 🇩🇰** card → **Create account** (first run) or **Sign in**.
3. You land on `udcspdk.ciamlogin.com` hosted page → sign up with any email + OTP, or sign in with an existing local user. Accept the consent prompt the first time.
4. You're redirected to the portal authenticated. Header shows `Hi {firstName} 🇩🇰`.
5. Go to **Apply for Child Benefit** (or `/apply/child-benefit`). Fill the form (child name, DOB, etc.) and **Submit**.
   - Expect a green confirmation toast with a `caseId` (`UDCSP-DK-…`).
6. Open **My cases** (`/cases`). The new case appears in the list with status **Open** within ~10 s.
7. (Optional verification — Azure portal)
   - **Logic App** `udcsp-dk-dev-application-intake` → *Runs history*: latest run = ✅ Succeeded, all 3 Foundry agent actions green, `Create_D365_case` returns 204.
   - **Dataverse** `https://org939d8f07.crm4.dynamics.com` → *Advanced find* on **Tasks** filtered by `Subject begins with [UDCSP-` → new row present.

If step 5 returns 401 → token expired, sign out + sign in again.
If step 6 is empty → check APIM trace on `GET /citizen-applications/` for the Dataverse error.

For the screen-reader-specific walk-through, see Demo 3 § "How to test Demo 3 with Windows Narrator" above.

### Unblock backlog (in suggested order)

1. **APIM**
   - Replace `foundry-topic-router-agent-endpoint` placeholder with the real Foundry agent endpoint.
   - Add CORS policy allowing `https://udcsp.fredgis.com` (and a `*.azurestaticapps.net` preview pattern for PR slots).
   - **Unblocks**: D1 chat, in-app chat for D3.
2. **App registrations on SE + NO** (5 min each, follow `installation.md` POST CONFIGURATION steps 1-3).
   - Set `VITE_EXTERNAL_ID_CLIENT_ID_SE` and `VITE_EXTERNAL_ID_CLIENT_ID_NO` in `apps/web/.env`, rebuild + deploy.
   - **Unblocks**: D2, D3-SE.
3. **APIM `/cases` route + D365 bridge** (read view of cases by UPN).
   - **Unblocks**: D4.
4. **Voice runtime** (`apps/voice/call-automation`): ACS event subscription + warm transfer policy on agent-topic-router.
   - **Unblocks**: D5, then D8.
5. **Consent ledger** service + storage account.
   - **Unblocks**: D6.
6. **Back-office / M365 connector / Purview / Event Grid** for D7, D9, D10.

</details>

<details>
<summary><h2 id="demo-2-lars">Demo 2 (Lars · NO · voice) — current state</h2></summary>

> Source narrative: [`docs/biz/uses.md` § Demo 2](../biz/uses.md). Architecture: [`docs/biz/voice.md`](../biz/voice.md). Self-rating: **~85% — voice channel live end-to-end except D365 warm-transfer (v2 work)**.

### Scope decision (2026-05-15, confirmed 2026-05-16) — "no-handoff" mode for v1

D365 Customer Service NO is not installed → Demo 2 v1 ships **without warm-transfer**. The citizen ↔ AI voice loop alone covers 9 of the 10 case-study requirements (everything except the SLA / KPI items that need a caseworker outcome). `escalate_to_human` is gated on `D365_VOICE_QUEUE_ID` — the env var is empty in dev, so the tool is NOT exposed to gpt-realtime (see `buildToolDefs()` in `apps/voice/call-automation/src/foundry-tool.ts`). The model has no way to call it; if a caller asks for a human, the model says so and offers a callback. The handoff leg is re-added in v2 once D365 CS NO is provisioned.

### What works live today (✅)

- **PSTN ingress** — `+33 801 150 799` (ACS-procured French toll-free) routed to `udcsp-no-acs` (`dataLocation=Norway`). Audio + metadata stay in the Nordic sovereign block.
- **Voice orchestrator** Container App `udcsp-no-dev-voice-orch` (`norwayeast`, UAMI `udcsp-no-voice-orch-uami` with KV Secrets User + Cognitive Services User + ACS Contributor + AcrPull roles). KV secrets `acs-connection-string` + `voice-client-secret` read at startup. Image `udcspnoprodacr.azurecr.io/udcsp/voice-orchestrator:1.0.0` built via `az acr build` from repo root with root-level `.dockerignore`.
- **Realtime model** `gpt-realtime-no` deployed on `udcspai` (Sweden Central, the only Nordic region with realtime quota). `Microsoft.DefaultV2` RAI policy, `GlobalStandard` SKU, 10 TPM.
- **Bidirectional audio** — ACS Call Automation `enableBidirectional=true` + `audioFormat='Pcm24KMono'` matches gpt-realtime's 24 kHz output. Outbound frames are PascalCase (`Kind/AudioData/Data` + `StopAudio: null`) — confirmed working through `relayAudioToAcs`.
- **Tool-calling loop** — `lookup_topic_router` function fires on every domain question (`tax`, `child benefit`, `residency`, …) → POST APIM `/agent-topic-router/messages` with `channel: 'voice'` + `authenticated: true` → Foundry citizen-assistant returns the substantive answer → model reads it back paraphrased (drop markdown, expand abbreviations).
- **Event Grid sub** `udcsp-no-acs-incoming-call` POSTs IncomingCall to `/api/acs/eventgrid` on the orchestrator's HTTPS ingress. Dead-letter container `voice-deadletter` on `udcspnoprodlake`.
- **Locale override** — `UDCSP_LOCALE_OVERRIDE=en` set on the live revision so non-Nordic juries hear English (NO orchestrator country binding otherwise defaults to `nb`).
- **Topic-router brain shared with chat** — same APIM endpoint the SPA chat widget posts to. One brain, two channels.
- **Trace plane** — every call emits `realtime.assistant_transcript` + `realtime.user_transcript` + `realtime.tool_call` + `topic_router.request/response` events into App Insights with W3C `traceparent` propagated; observable in KQL via `requests | where customDimensions["x-channel-actor"] == "voice"`.

### Operational hardening shipped during the dial test (8 wire-protocol gotchas)

Documented in `docs/biz/voice.md § 11.9`:

| # | Symptom | Root cause | Commit |
|---|---|---|---|
| 1 | `ENOENT '/apps/voice/recording-consent/recording-disclosure.md'` | Dockerfile didn't bundle IVR/disclosure/escalation assets | 8c9d925 |
| 2 | `az acr build` hangs 15 min on upload | No root `.dockerignore` after context move | 7c0bf18 |
| 3 | `media.upgrade_rejected` — ACS WS upgrade fails | ACS does NOT append callConnectionId to URL | 627d79b |
| 4 | `ChainedTokenCredential authentication failed` | Missing `AZURE_CLIENT_ID` env var for UAMI | 032c11e |
| 5 | AOAI Realtime HTTP 400 on connect | Wrong deployment name (defaulted to `gpt-realtime` not `gpt-realtime-${country}`) | a1e3fdf |
| 6 | `Invalid modalities: ['audio']` | gpt-realtime requires `['audio','text']` | b12955b |
| 7 | Transcript present but caller hears silence | Event renamed `response.audio.delta` → `response.output_audio.delta` | eb08e9d |
| 8 | Audio relayed yet caller hears nothing | ACS asymmetric protocol (camelCase in / PascalCase out) + `enableBidirectional` + `Pcm24KMono` + `StopAudio:null` | 0f5cc30 |

Plus three behavioural fixes :

- **Topic-router path** corrected to `/agent-topic-router/messages` (not `/agents/...`) — same path the chat widget uses (commit f9c0857).
- **`getApimToken` no-throw** — the topic-router accepts anonymous, the ClientCredential acquisition was throwing on the `udcsp-voice-orch-no` App Reg's missing scope, swallow and fall back (commit 2d3dfb1).
- **Orphan-session matcher hardened** with `answeredAt` timestamp + 30 s freshness window + periodic 60 s sweep so a missed CallDisconnected can't leak conversation context into a fresh call (commit 62aec73).

### v2 backlog (re-enable after D365 Customer Service NO is provisioned)

1. Provision D365 Customer Service NO env + Voice workstream + queue.
2. Capture `d365TransferTargetId` + `d365VoiceQueueId` in `Voice.no` config.
3. Re-enable `escalate_to_human` tool (the env-gating from v1 turns it back on automatically when the GUIDs are set).
4. Test warm-transfer: caseworker receives the call leg + the `udcspEscalation` JSON operation context.
5. Configure recording at the workstream level → Dataverse `callTranscript` → Fabric + Confidential Ledger anchor (transcript-only audit today; add audio when D365 takes ownership of recording).
6. Add post-call CSAT IVR survey, ingest into Fabric → Power BI median-4d tile → +38 % KPI.
7. Promote Demo 2 row to fully covered (all 10 case-study requirements).

</details>

<details>
<summary><h2 id="demo-3-maria">Demo 3 (Maria · DK · PL · Windows Narrator) — current state</h2></summary>

Reference script: `docs/biz/uses.md` Demo 3 (Maria Kowalska, Windows Narrator, Polish UI in Denmark).

Everything required by the script is shipped. The DK / SE / NO code paths are identical — pick any country profile and play the same script.

| Script element | State |
|---|:-:|
| External ID sign-in (DK · SE · NO tenants) | 🟢 |
| Polish UI (`pl.json`, full HomePage + footer + Apply forms + Compliance + Login + Cases + Consent + Demos translated) | 🟢 |
| axe-core CI gate (WCAG 2.1 AA, fails on serious / critical) | 🟢 `.github/workflows/web-axe.yml` |
| Keyboard-only navigation + landmarks + visible focus | 🟢 |
| Site-wide route-change announcer + cookie-banner a11y fix | 🟢 `apps/web/src/components/RouteAnnouncer.tsx` |
| Citizen Assistant (consent-gated contextual help) | 🟢 |
| Document Extractor on lease / payslip (MI-proxy upload to country lake) | 🟢 |
| Translator agent in the LA (PL → DA · SV · NB for caseworker) | 🟢 `Call_translator_to_caseworker_locale` |
| Eligibility reasoning visible to citizen | 🟢 |
| Submit → country D365 queue (DK / SE / NO) | 🟢 LA `Create_D365_case` writes to `tasks` |
| Confirmation: estimated decision date + tracking deep link | 🟢 |
| GDPR Art. 17 erasure | 🟢 stub certificate; real Priva connector pending |
| Live walk-through with Windows Narrator recorded | 🟢 |

**Demo flipped to 🟢 once the live walk-through with Windows Narrator on Edge (Polish UI) was recorded.**

### How to test Demo 3 with Windows Narrator (10 min)

Windows Narrator is the screen reader built into Windows 10/11. It speaks aloud what is on the screen and lets you navigate the page with the keyboard. No installation needed — it is part of Windows.

1. **Start Narrator** — press `Windows + Ctrl + Enter`. The same shortcut stops it. (Alternative: Settings → Accessibility → Narrator → toggle on.)
2. **(Optional) Add the Polish voice** — Settings → Time & Language → Language → Add a language → Polish → Speech. Then Settings → Accessibility → Narrator → Voice = Polish (Paulina or Zofia).
3. **Open the portal** — https://udcsp.fredgis.com (Edge or any Chromium browser).
4. **Switch the UI to Polish** — language switcher in the top-right header → "Polski". Narrator now reads the entire page in Polish.
5. **Sign in as a Danish resident** — country card *Danmark* → *Sign in / Create account* → CIAM hosted page → return.
6. **Run the apply flow** — Tab to *"Apply for child benefit"*, Enter → upload `sample_payslip_maria_kowalska.pdf` → confirm extracted fields → submit. Useful Narrator shortcuts: `Caps Lock + H` jump heading, `Caps Lock + F` jump form field, `Caps Lock + K` jump link, `Caps Lock + Space` toggle browse / focus mode.
7. **What you should hear in Polish**: page title, every form label, the AI-disclosure banner, the document-extractor result card, the eligibility reasoning, the confirmation card and the case-reference number. Route changes are announced by the site-wide `RouteAnnouncer`.
8. **Verify the AI / data path** — Azure portal → Logic App `udcsp-dk-dev-application-intake` → *Runs history*: latest run = ✅ *Succeeded*; the new `Call_translator_to_caseworker_locale` step is green; `Create_D365_case` returns 204. Dataverse (`https://org939d8f07.crm4.dynamics.com`) → *Tasks* → new row with subject `[UDCSP-DK] …`.
9. **Trigger the axe-core CI run** — push any change under `apps/web/**` (or run the workflow manually from the *Actions* tab → *web-axe* → *Run workflow*). Confirm 0 serious + 0 critical violations across `/`, `/login`, `/demos`, `/consent`.

The same flow works with NVDA, JAWS or VoiceOver — only the modifier key differs. The accessibility implementation is screen-reader agnostic.

### D3 wiring decisions (resolved 2026-05-13)

1. **DK SPA app reg — `access_as_user` scope** ✅ exposed + self-pre-authorised. See `installation.md` Step 3.5.

2. **Logic App agent invocations** ✅ Resolved with **pattern (a) hybrid**: agent `instructions` and `model` are stored as workflow parameters (auto-synced from `foundry/agents/*/system-prompt.md` + `agent.yaml`) and the Logic App POSTs directly to `https://udcspai.services.ai.azure.com/api/projects/udcsp/openai/v1/responses` with MI auth (audience `https://ai.azure.com`). No separate wrapper Function or APIM op needed for the LA path. APIM agent-* APIs (still configured for the SPA-facing chat path) use the same pattern with named values.

3. **D365 case write** ✅ Logic App system-assigned MI granted **System Customizer + Basic User** in Dataverse (Application User with `applicationid = 8596ea8e-…`). HTTP action posts to `/api/data/v9.2/tasks` (NOT `/incidents` — Customer Service is not installed in `org939d8f07`). Body shape: `{subject:"[UDCSP-DK] <topic>", description:"citizenUpn: … | text: …", prioritycode:1}`.

4. **APIM `citizen-applications` POST** ✅ policy on `post-citizen-applications-submit` decodes the bearer JWT inline, extracts `preferred_username`, calls the LA callback URL (stored as secret named value `logicapp-intake-dk-callback`), returns `202 {correlationId, status, laStatus}`.

5. **APIM `case-management` GET/POST** ✅ both ops have policies that authenticate to Dataverse with APIM system MI (also Application User in `org939d8f07`, same role-grants). GET returns `tasks` filtered by `startswith(subject,'[UDCSP-')` — `MyCasesPage` parses the OData envelope and maps to its `Case` shape.

6. **APIM `citizen-applications` DELETE** ✅ (`operations/delete-citizen-applications-by-id.xml`, commit `db29abb`) — `MyCasesPage` Remove button now calls `DELETE /citizen-applications/{activityid}` end-to-end. Policy: validates External ID JWT → extracts `preferred_username`/`email`/`emails`/`upn` (`citizenUpn`) → GETs the `task` row → checks `description` contains `citizenUpn: <caller>` (IDOR guard, returns 403 if not owner; 404 if row gone) → parses the JSON tail of `description` (after `| text: `) to extract `documentBlobUrl` → if present, fires a blob `DELETE` against `udcspdkprodlake/citizen-uploads/...` using APIM MI (`Storage Blob Data Contributor` granted in `Install-Apim.psm1` line 258, `x-ms-version: 2021-06-08`, `ignore-error="true"` so a missing/old blob doesn't block the row deletion) → DELETEs the Dataverse row (204/200/404 → 204; else 502 with the upstream body for triage). Companion SPA fix (commit `3ad73f5`): `MyCasesPage` no longer merges remote+local — when the back-end responds, it shows remote rows only (the prior merge produced two cards per case because remote ids = `activityid` GUID and local cache ids = `correlationId` returned by POST, which never collide; clicking the local card sent a non-existent GUID to the DELETE op and the row stayed on Dataverse). Local cache is now only the offline fallback when APIM is unreachable. Cascade verified end-to-end: Dataverse `task` row gone + uploaded PDF removed from `udcspdkprodlake`. Install script auto-deploys this on a fresh env: `openapi.yaml` defines the `DELETE /{applicationId}` op (so `az apim api import` creates it), and `Install-Apim.psm1` lines 184-207 PUT the operation policy from `operations/*.xml` — no manual step.

</details>

<details>
<summary><h2 id="demo-9-cio">Demo 9 (CIO outcomes dashboard) — feasibility check</h2></summary>

> Source narrative: [`docs/biz/uses.md` § Demo 9](../biz/uses.md). Architecture target: end-to-end visibility on platform health + AI-decision audit + per-country, per-language CSAT + 47-portal sunset progress. Self-rating today: **~30 % shipped, ~70 % achievable from existing assets without new code**.

### What's already in place

| Asset | Status | Where |
|---|:-:|---|
| Application Insights (per country) | 🟢 | `udcsp-{dk,se,no}-prod-shared-appi` — receiving voice orchestrator telemetry today (`requests`, `dependencies`, `customEvents` for `call.*` / `realtime.*` / `topic_router.*`, `traces`, `exceptions`) on **NO only**. DK/SE remain empty until country-specific surfaces are instrumented. |
| Log Analytics workspaces (obs + sentinel × 3 countries) | 🟢 | `udcsp-{dk,se,no}-prod-{law,sentinel-law}` provisioned |
| Workbook JSON templates | 🟢 | `infra/observability/workbooks/{ai-decision-traces,citizen-journey-funnel,platform-health}.json` — production-shape: TimeRange parameter, side-by-side KPI tiles, histograms for volume + p50/p95/p99 latency, funnel by event prefix, locale split, channel pie, decision pie, recent-verdicts table with `operation_Id` drill. **Deployed live as 9 shared workbooks** (3 × DK/SE/NO) via direct ARM PUT (the `application-insights` az extension 1.2.3 silently drops `--kind shared`, see `installation.md` § Platform monitoring). |
| Alert rule templates | 🟡 | 6 alerts under `infra/observability/alerts/` (`apim-5xx-spike`, `d365-sla-breach-risk`, `external-id-error-rate`, `fabric-pipeline-failure`, `foundry-eval-degradation`, `logicapp-run-failure`) — **JSON ready, not deployed** |
| Data Collection Rules | 🟡 | DCRs for AKS / Functions / VM in `infra/observability/dcr/` — not yet bound to live resources |
| Correlation ID strategy | 🟢 | W3C `traceparent` propagated end-to-end (proven by voice dial test); surfaced as `operation_Id` in the `ai-decision-traces` workbook → click row → Transaction search |
| Telemetry wiring per producer | 🟡 | Voice orchestrator 🟢 (`APPLICATIONINSIGHTS_CONNECTION_STRING` via KV secret `app-insights-connection` on `udcsp-no-dev-voice-orch`). SPA 🔴 (no SDK in `apps/web/`). APIM × 3 🔴 (0 loggers, 0 diag-settings — M3 in `installation.md` provides the non-invasive recipe). ACS NO 🔴 (no diag-settings). Logic Apps 🔴 (no diag-settings). |
| Fabric capacity | 🟡 | 12 capacities exist on the tenant (`fgisweden F64` is sovereign EU); **no UDCSP workspace bound yet** |
| Power BI Premium / Fabric workspace for UDCSP | 🔴 | Not provisioned. Need a workspace, a semantic model, and a report file |
| Dataverse `udcsp_application` table | 🟡 | LA currently writes to the system `task` entity; canonical table designed but not authored in maker UI |
| CSAT capture | 🔴 | No post-interaction survey yet — neither in SPA nor in voice flow |
| Sunset roadmap data | 🔴 | No data source for "47 portals decommissioned over time"; would need a static lookup + manual checkpoint table |

### Where we are now (2026-05-17 — operator surface 🟢, executive surface 🔴)

The **operator view is live and demoable**. After a dial test on `+33 801 150 799`, the 🇳🇴 NO App Insights workbooks light up:

- **`platform-health`** — KPI tiles (Requests, Exceptions, Dependencies, Custom events) + request volume histogram by `cloud_RoleName` + p50/p95/p99 latency histogram + dependency success/failure barchart + exceptions table.
- **`citizen-journey-funnel`** — funnel step "Voice / assistant turn" populated by `call.*` + `realtime.*` + `topic_router.*` events; activity-per-language histogram driven by `customDimensions['locale']`; endpoint-hits fallback table over `requests`.
- **`ai-decision-traces`** — decision-mix pie + verdicts-over-time-by-agent histogram + recent-verdicts table (clickable `operation_Id` → Transaction search) + Content-Safety-blocks table.

🇩🇰 DK and 🇸🇪 SE workbooks **stay empty during a dial test, by design** — the toll-free number is bound to `udcsp-no-acs`, the orchestrator runs in `norwayeast`, its AI cnx points only at `udcsp-no-prod-shared-appi`. That emptiness is the **sovereignty proof tile** the storyboard expects (cf. `uses.md §Demo 9 watch-for: per-country data residency`): swipe NO → DK → SE during the demo and the visual silence is the talking point.

### Demo flow — 7 min, operator surface only (current state)

1. **(1 min)** Workbook `platform-health` on 🇳🇴 NO → Time range **Last hour** → show real KPI tiles populated by the dial test you just ran; talking point *"SRE view, no synthetic traffic, real call from `+33 801 150 799`"*.
2. **(1 min)** Switch to `citizen-journey-funnel` → show step 6 (Voice / assistant turn) lit up; locale histogram colour-coded.
3. **(1 min)** Switch to `ai-decision-traces` → click an `operation_Id` row → Transaction search opens, full W3C `traceparent` chain ACS → ACA → APIM → Foundry visible; talking point *"audit row #15, every AI verdict is drillable for EU AI Act art. 14 evidence"*.
4. **(2 min)** Switch App Insights instance from NO → DK → SE in the URL bar, same workbooks → DK and SE empty; talking point *"3 instances, 3 regions, no cross-border telemetry. Sovereignty isn't a checkbox, it's visible silence in the dashboards"*.
5. **(2 min)** Reframe to the executive surface: *"the workbooks are the operator view. The CIO view — `apps/reporting/cio-dashboard.pbix` on a Fabric F64 capacity — packages the same KQL underneath into 4 executive pages (Platform health · Citizen outcomes · AI Act audit · 47→1 consolidation). That's the next sprint."*

### What's left before the row goes 🟡 → 🟢

1. **Author the `.pbix` + bind a Fabric workspace** (`UDCSP-Platform-Reporting` on `fgisweden` F64). 60-90 min of Power BI Desktop work. Phases 1-5 of the previous plan stand.
2. **Author the sunset CSV** (`governance/portal-sunset/decommissioned-portals.csv`, ~47 rows) for the consolidation page.
3. (Optional but recommended) **Run M3** from `installation.md` § Platform monitoring → APIM / ACS / LA diag-settings → LAW → enables an APIM-specific workbook on DK/SE that lights up when the SPA hits the gateways. Pure Azure plane config, no app code touched.
4. (Stretch) **CSAT capture** for the Per-language CSAT proxy measure on PBI Page 2 (currently uses event counts as the proxy).

### Plan B (kept as safety net)

If the Fabric/PBI build hits a blocker (capacity quota, Direct Query auth, Power BI Desktop unavailable), the operator surface alone is now defensible. Talking point: *"workbooks = operator view, real-time, raw signals. Executive packaging is the next sprint — same KQL underneath, F64 capacity already on the tenant."*

### Executive surface roadmap — Power BI on Fabric (~75-95 min when ready)

The 6 phases below build the **executive view** (`apps/reporting/cio-dashboard.pbix`). The operator view is already shipped; these phases are what flips row #9 to 🟢. Phases 1-2 are CLI; phase 3 is Power BI Desktop (Windows); phases 4-6 are CLI + portal.

#### Phase 1 — Bind a Fabric workspace (~5 min, CLI)

```powershell
# Find the F64 capacity ID (sovereign EU = fgisweden)
$cap = Get-AzResource -ResourceType "Microsoft.Fabric/capacities" -Name "fgisweden"
$capId = $cap.ResourceId

# Create the workspace via Fabric REST API (uses Power BI service principal or your user token)
$token = (Get-AzAccessToken -ResourceUrl "https://api.fabric.microsoft.com").Token
$body  = @{ displayName = "UDCSP-Platform-Reporting"; capacityId = $cap.Properties.uniqueIdentifier } | ConvertTo-Json
$ws    = Invoke-RestMethod -Method POST `
  -Uri  "https://api.fabric.microsoft.com/v1/workspaces" `
  -Headers @{Authorization="Bearer $token"} `
  -ContentType "application/json" -Body $body
$ws.id  # → save as $env:FABRIC_WORKSPACE_ID
```

If `fgisweden` is on another subscription you cannot reach, fall back to creating an **F2 trial capacity** in `swedencentral` (`az resource create --resource-type Microsoft.Fabric/capacities --sku F2`) — still EU-sovereign, sufficient for one report.

#### Phase 2 — Author the sunset CSV + provision `apps/reporting/` (~5 min, CLI)

```powershell
# 47→1 sunset roadmap (case-study mandatory tile)
New-Item -ItemType Directory -Path governance/portal-sunset -Force | Out-Null
@"
date,country,portal_decommissioned,replaced_by
2024-01-15,DK,borger-old-residence,udcsp.fredgis.com
2024-03-10,DK,borger-old-child-benefit,udcsp.fredgis.com
2024-05-22,SE,skatteverket-residence,udcsp.fredgis.com
2024-08-01,NO,skatteetaten-residence,udcsp.fredgis.com
…(plus ~43 rows, real or plausibly synthetic)…
"@ | Out-File governance/portal-sunset/decommissioned-portals.csv -Encoding utf8

# Power BI project scaffold (Desktop project format)
New-Item -ItemType Directory -Path apps/reporting -Force | Out-Null
```

#### Phase 3 — Author the `.pbix` in Power BI Desktop (~60-90 min, Windows-only UI)

1. **Power BI Desktop → Get Data → Azure Monitor logs** → connect to all 3 App Insights:
   - `udcsp-dk-prod-shared-appi`, `udcsp-se-prod-shared-appi`, `udcsp-no-prod-shared-appi` — Direct Query mode.
2. **Get Data → Dataverse** → environment `org939d8f07` → table `tasks` (today; switch to `incidents` once D365 CS lands — see migration checklist below).
3. **Get Data → Text/CSV** → `governance/portal-sunset/decommissioned-portals.csv`.
4. Author the **5 mandatory measures** (DAX):
   - `Cases submitted (last 30 d)` = `COUNTROWS(FILTER('AppEvents', [name]="apply.submit" && [timestamp] > NOW()-30))`
   - `AI-decided %` = share where `customDimensions["eligibilityPreflight.decision"] == "likely-eligible"` AND no caseworker override flag
   - `Median lead time` = median `dateDiff(applied, decided)` across closed `tasks`
   - `Voice share` = `customDimensions["x-channel-actor"] == "voice"` over total interactions
   - `Per-language CSAT proxy` = group by `customDimensions["locale"]`, count successful completions (until CSAT survey is wired)
5. Build the **4 pages** of `apps/reporting/cio-dashboard.pbix`:
   - **Page 1 — Platform health**: uptime per country, alert count, APIM 5xx rate, voice p95 latency.
   - **Page 2 — Citizen outcomes**: cases trend (28d→4d narrative), AI-decided %, median lead time, channel mix (web/mobile/voice).
   - **Page 3 — AI Act audit**: top intents, escalation reasons, Content Safety blocks, eval pass-rate per agent per language (read from `foundry/evaluations/results/` if exported, else manual import).
   - **Page 4 — Consolidation**: 47→1 sunset burndown from the CSV, cumulative-over-time line + per-country bar.
6. Save as `apps/reporting/cio-dashboard.pbix` and commit.

#### Phase 4 — Publish to the workspace (~2 min)

In Power BI Desktop → **Publish** → select `UDCSP-Platform-Reporting`. Or via REST:

```powershell
$pbix = Get-Item apps/reporting/cio-dashboard.pbix
$form = @{ file = $pbix }
Invoke-RestMethod -Method POST `
  -Uri "https://api.fabric.microsoft.com/v1/workspaces/$($ws.id)/imports?datasetDisplayName=UDCSP+Outcomes" `
  -Headers @{Authorization="Bearer $token"} -Form $form
```

#### Phase 5 — Grant the demo viewer a shareable link (~1 min)

In the Fabric portal → workspace settings → Manage access → add `viewer@<demo-tenant>` as **Viewer**. Copy the report URL. Test it from an InPrivate window with that account.

#### Phase 6 — (Optional, ~30 min) Deploy the 6 alert rules

These light up Page 1 with live alert counts. Skip if time is tight.

```powershell
$law = az monitor log-analytics workspace show -g udcsp-no-observability-rg -n udcsp-no-prod-law --query id -o tsv
Get-ChildItem infra/observability/alerts/*.json | ForEach-Object {
  az monitor scheduled-query create `
    --resource-group udcsp-no-observability-rg `
    --name $_.BaseName --scopes $law --condition-query "@$($_.FullName)"
}
```

### Future v2 (post-demo)

- **OneLake medallion ingestion** — Fabric pipeline that reads App Insights + Dataverse into Bronze → Silver → Gold; Power BI switches from Direct Query to Import on Gold. Survives App Insights' 30-day retention cap.
- **Real CSAT capture** — voice: post-call IVR "Press 1 if helpful"; web: one-question NPS on case-detail when `status: closed`. Both into Dataverse `udcsp_csat_response`. Replaces the `Per-language CSAT proxy` measure with a real one.
- **Live Polish-CSAT gap tile** — once CSAT is captured, surface the SV-vs-PL gap (uses.md talking point) as a dedicated tile on Page 2.

</details>

<details>
<summary><h2 id="reference">📂 Reference &amp; operational notes</h2></summary>

### 🤖 Foundry agents (DK/SE/NO — same project, new Agents v1 API)

> ⚠️ **Migration done** — All 7 agents were originally created as **classic Assistants** (Assistants v1 API on `/assistants`). The Foundry portal flagged them as legacy with the message _"Classic agents — Assistants are not yet supported, save as a new agent powered by the updated API"_. We deleted the 7 classic assistants and recreated them using the **new Agents v1 API** (`/agents`, `kind: prompt`, name+version identity, Entra-only auth, no API key). The importer `foundry/scripts/Import-FoundryAgent.ps1` was rewritten accordingly — see commit log.

Project endpoint: `https://udcspai.services.ai.azure.com/api/projects/udcsp` · API version: `v1`

| Agent | Identity (name) | Latest version | Model deployment |
|---|---|---|---|
| Classifier | `udcsp-classifier` | `:1` | `gpt-5.4-mini` |
| Eligibility | `udcsp-eligibility` | `:2` | `gpt-5.4` (was `gpt-5.5`, no quota in `swedencentral`) |
| Document extractor | `udcsp-doc-extractor` | `:1` | `gpt-5.4-mini` |
| Citizen assistant | `udcsp-citizen-assistant` | `:1` | `gpt-5.4` |
| Topic router | `topic-router` | `:1` | `gpt-5.4` |
| Caseworker helper | `udcsp-caseworker-helper` | `:2` | `gpt-5.4` (was `gpt-5.5`, no quota) |
| Translator | `udcsp-translator` | `:1` | `gpt-5.4` |

Model deployments on `udcspai`: `gpt-5.4-mini` and `gpt-5.4` (both GlobalStandard, 100 k TPM). `gpt-5.5` could not be deployed (zero quota in this region as of today).

**No more `asst_*` IDs.** Agents are referenced by `<name>` and optionally `<name>:<version>`. Update `foundry-*-agent-endpoint` named values in APIM to use the new format (e.g. `https://udcspai.services.ai.azure.com/api/projects/udcsp|udcsp-classifier`) — done.

### 🧑‍💼 Caseworker UI strategy (D7)

Today the citizen-side LA writes to the `task` activity entity in `org939d8f07` (UDCSP system tenant) — caseworker identity is therefore an Entra user in the **system tenant**, not in any of the per-country External ID tenants. That separation is intentional: caseworkers operate on cases from any country, while citizens authenticate through their country's CIAM.

Two paths exist:

1. **Power Apps Model-Driven app on `task`** — buildable in ~30 min today. Pros: unblocks D7 immediately, uses the rows the LAs are already writing, no extra licence. Cons: `task` is a generic activity (no `gps_citizencountry`, no `gps_aiconfidence`) so the caseworker view is plain.
2. **Wait for D365 Customer Service licence + migrate to `incident`** — ~1-2 days once the licence lands. Pros: native case management UI (queues, SLA, knowledge base, omni-channel), proper case schema, out-of-the-box dashboards. Cons: blocked on procurement.

**Recommendation**: build the Power Apps shell now (just enough to demo D7 routing + AI confidence overlay) and migrate when the licence lands. The migration is well documented under the D365 Customer Service migration checklist below — only the LA action `Create_D365_case` and the APIM `case-management` policies need to flip from `tasks` to `incidents`. The Power Apps view can be deleted at that point in favour of the native incident model-driven app.

### 🔔 D365 Customer Service migration checklist (when licence is acquired)

Today the demo writes cases to the generic `task` activity entity (no `incident` table in this env). Once Customer Service is installed, swap back:

1. **Logic App `udcsp-{c}-dev-application-intake` → `Create_D365_case`**
   - URL: `…/api/data/v9.2/tasks` → `…/api/data/v9.2/incidents`
   - Body: `{subject, description, prioritycode}` → `{title, description, caseorigincode:3, customerid_contact@odata.bind:"/contacts(<guid>)"}`
   - Param `d365CasesEndpoint` value updated accordingly.

2. **APIM `case-management` policies**
   - `post-case-management-cases`: `rewrite-uri /tasks` → `/incidents`; rebuild body to incident schema.
   - `get-case-management-cases`: `rewrite-uri /tasks` → `/incidents`; replace `$filter=startswith(subject,'[UDCSP-')` with per-citizen filter `_customerid_value eq <contactId>` (resolved from JWT `preferred_username`); `$select` → `incidentid,title,ticketnumber,statecode,statuscode,createdon,prioritycode`.

3. **SPA `apps/web/src/pages/MyCasesPage.tsx`**
   - Field map: `activityid` → `incidentid`, `subject` → `title`, surface `ticketnumber`.
   - `STATE_LABEL` → `{0:'Active', 1:'Resolved', 2:'Cancelled'}`.

4. Apply the same on SE + NO once their Logic Apps are wired.

### 🕰️ Recent commits relevant to this tracker

- **Today (Demo 9 operator surface, 2026-05-17)** — 9 App Insights workbooks deployed live (3 × DK/SE/NO) via direct ARM PUT, after the `az monitor app-insights workbook create --kind shared` bug in extension 1.2.3 was hit. Workbook JSONs rewritten from minimal scaffolds to production-shape definitions (TimeRange parameter, KPI tiles, histograms, funnel, decision pie, recent-verdicts table with `operation_Id` drill); patterns aligned with the real voice telemetry events (`call.*`, `realtime.*`, `topic_router.*`, `escalation.*`). New `📊 Platform monitoring` section in `installation.md` (M1 audit · M2 deploy · M3 optional diag-settings · M4 test · M5 demo notes · M6 rollback) — referenced from the top-of-file section table. Demo 9 row #9 now 🟡 (operator surface live, executive PBI surface still on roadmap).
- **Today (Foundry v1 migration)** — Deleted 7 classic assistants. Rewrote `Import-FoundryAgent.ps1` to call new Agents v1 API (`/agents` with `kind: prompt`, no API key, Entra-only auth). Recreated all 7 agents via the new API; eligibility & caseworker-helper bumped to v2 after switching from `gpt-5.5` (no quota) to `gpt-5.4`. Deployed model `gpt-5.4` on `udcspai`. Updated `architecture.md` Foundry section to reflect the new identity model.
- **Today (Option B wiring, see commit log)** — Foundry: gpt-5.4-mini deployed + 7 assistants created on `udcspai/udcsp` project. APIM DK named-values filled (logicapp callback, foundry endpoints, d365 url, OIDC config, audience, portal-origin). Global CORS policy on `udcsp-dk-prod-apim`. Subscription-key disabled on all 11 APIs. Web `apiFetch` acquires bearer for `api://<dk-clientId>/access_as_user` per current country. Apply Child Benefit page now POSTs and shows correlationId.
- `ed7a6af` — Demo 9: timechart → barchart histograms on volume / latency / locale / verdicts charts.
- `30c2537` — Demo 9: workbook patterns aligned with real voice events (`call.*` / `realtime.*` / `topic_router.*`).
- `fec8845` — Demo 9: switch from `{TimeRange}` substitution (buggy) to `timeContextFromParameter` injection.
- `6737f3e` — Demo 9: replace minimal workbook scaffolds with functional KQL (TimeRange parameter, KPI tiles, drills).
- `25a7f08` — Demo 9: `installation.md` § Platform monitoring section + dual-surface plan in `inprogress.md`.
- `2dfa7e5` — CIAM authority fix (drop `/SignUpSignIn` from path).
- `c59fb25` — Per-country `VITE_EXTERNAL_ID_CLIENT_ID_{DK,SE,NO}` + correct PCA per redirect.
- `bbe61d7` — POST CONFIGURATION section in `installation.md` + UserBadge "Sign in" without flag.
- `efb22e6` — AuthGate, UserBadge, DemosIndexPage, identity-aware ChatWidget, MyCases empty-state.
- `35a93f7` — Country picker on `/login`.

### 🔧 Maintenance rule

When you finish wiring a demo, edit only its row (state + columns), bump the bundle hash at the top, append a one-line entry to "Recent commits", and do not rewrite the rest of the file.

</details>
