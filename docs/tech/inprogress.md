# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox. Update one row at a time as we wire each demo.

- **Web SWA** — https://udcsp.fredgis.com
- **Current SPA bundle** — `nordic-map-+-tax-administration-+-case-detail-3-tier-parser` (recent commits: `45b6393` case-detail parser + redesign, `42612e9` /tax-administration page, `bb69d11` real Natural Earth Nordic map). Earlier bundles `D3-pl-locale-translator-axe` (Polish locale, Translator in LA, axe-core CI) + `signout-home-+-authgate-redesign-+-required-asterisks-+-eid-preview` still active for D3 + auth flow.
- **Deploy** — SWA `udcsp-web-dev` has no GitHub Action: every change is pushed live with `npm run build && npx --yes @azure/static-web-apps-cli@latest deploy ./dist --deployment-token <key> --env production --no-use-keychain` (token from `az staticwebapp secrets list -n udcsp-web-dev`).

> ⚠️ **Caseworker surface — temporary stance.** Until per-country D365 Customer Service envs are provisioned, the caseworker workspace runs as a **model-driven Power App on the shared Dataverse env `org939d8f07`** (DK system tenant). The `udcsp_application` schema + Power Fx form + column logical names match the future D365 CS deployment for drop-in replacement. Today the LA `application-intake` writes to the standard `tasks` table; the LA repoint to `udcsp_applications` happens once D365 CS is installed. See **📂 Reference → 🧑‍💼 Caseworker UI strategy (D7)** below.

## Demo status

**Status legend** — 🟢 played live end-to-end · 🟡 built & wired, not yet played live · 🔴 not built / placeholders only.

The 10 rows below mirror the 10 demos defined in [`docs/biz/uses.md`](../biz/uses.md). State reflects what *can be played today on the live tenant*, not what has been provisioned in Azure.

| #  | Demo (uses.md)                                            | State | What works today                                                                                          | What blocks a live walk-through                                                                                              |
|----|-----------------------------------------------------------|:-----:|-----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| 1  | Anna moves Copenhagen → Stockholm (cross-border)          | 🟡    | **Citizen-side single rail is live** (sign-in via External ID across DK/SE/NO CIAM tenants, 6-step Residency wizard in 12 langs, Foundry-driven eligibility pre-submit via APIM v3, POST → LA `application-intake` → Dataverse `tasks`, My Cases cross-device re-hydration via APIM GET op-policy, Case Detail with 3-tier description parser, Remove cascade DV row + blob via DELETE op-policy with ownership guard). APIM `agent-topic-router` knows the DK/SE/NO residency rules + Info Norden / Øresunddirekt / Grensetjänsten cross-border refs. LA `cross-border-residency` workflow.json scaffolded. Caseworker workspace = model-driven Power App on shared Dataverse (drop-in for future D365 CS). | Cross-border fan-out (Service Bus + eIDAS bridge + signed-claims envelope) not wired; SE D365 Customer Service env not provisioned; ACS notification SV+EN template absent; Verified ID issuance + SE portal auto-onboarding not built; Foundry trace ID not surfaced on Case Detail; SLA timer + Power BI median-4d KPI missing. |
| 2  | Lars asks voice assistant for tax refund (NO)             | 🟡    | **Code complete** in `apps/voice/call-automation/` (Node 22 + TS + ACS SDK + GPT-4o Realtime WS bridge + 3 function tools + Bicep for ACS / gpt-realtime / Container App / Event Grid IncomingCall sub). New `/tax-administration` page on udcsp.fredgis.com with d3-geo Natural Earth Nordic map + 3 toll-free placeholders (NO/DK/SE). **Scope decision 2026-05-15: Demo 2 v1 = no-handoff mode** (escalate_to_human gated on D365_VOICE_QUEUE_ID env var) since D365 CS NO is not yet installed. | Voice phase B4-B7 not yet run (Container App, ACS resource, gpt-realtime deployment, Event Grid sub not provisioned per country); PSTN numbers not procured (Nkom/PTS/ERST KYC pending); NB-NO FAQ articles in AI Search index `udcsp-citizens-faq` to author; SMS template `tax-refund-recap.nb-NO.txt` to add. |
| 3  | Maria with Windows Narrator (PL in DK)                    | 🟢    | DK chain works end-to-end (sign-in → APIM → LA → 4 Foundry agents → Dataverse `tasks`); MI-proxy upload onto `udcspdkprodlake`; workflow timeline; eligibility reasoning surfaced; consent-gating live; **PL locale bundle complete (12 languages translated end-to-end), Translator agent invoked in LA after Doc Extractor, axe-core CI gate active, site-wide RouteAnnouncer + cookie-banner a11y fix shipped**. | — Promoted 🟢 after live walk-through with Windows Narrator (Win + Ctrl + Enter) on Edge, Polish UI. |
| 4  | Erik snaps a payslip on mobile (DK)                       | 🟡    | Web equivalent works (drop a PDF → Document Extractor → confirm → submit). Same APIM + LA path.            | No native iOS/Android build shipped; mobile shell exists in repo but not packaged.                                            |
| 5  | Astrid caseworker triages with Copilot for Service        | 🟡    | **Caseworker workspace = model-driven Power App** (`apps/d365/solutions/UDCSP_Core/customizations/apps/caseworker-app.xml` + `apps/powerapps/caseworker/README.md`) — single XML imports as the production-shape model-driven app via `pac solution import`; same Dataverse table (`udcsp_application`) the future D365 Customer Service deployment will use, so the artefact is a drop-in. Cross-country queue + AI verdict + extracted fields + workflow timeline + approve/reject/request-more-info via the form. Caseworker-helper Foundry agent deployed; APIM op routes to it. | `pac solution import` pending against `org939d8f07` (DK system tenant) and the per-country envs once they're provisioned; `udcsp_application` custom table needs to be authored once in `make.powerapps.com` then re-exported with `pac solution export --include customization` to embed the table XML in `apps/d365/solutions/UDCSP_Core/Other`. |
| 6  | Eligibility model proposes, caseworker disposes           | 🟡    | Eligibility Pre-Assessor `udcsp-eligibility` invoked synchronously from the citizen portal at step 4 (residency) and from the *AI eligibility pre-assessment* panel (child-benefit) via APIM `POST /eligibility-checks/assessments` — citizen sees the recommendation badge, confidence %, rule-by-rule evidence, missing-evidence list, citizen notice, caseworker summary BEFORE consenting. The verdict travels in the submit payload (`payload.eligibilityPreflight`). LA re-calls the agent for the AI Act art. 14 audit registry (dual-call by design). Caseworker disposes via the model-driven Power App. | LA writes to `tasks` activity entity today (canonical `udcsp_application` table provisioned but LA not yet repointed). No Confidential Ledger entry written for caseworker overrides yet; `udcsp_caseworker_decision` Dataverse table scaffolded but not yet persisted via a LA callback. |
| 7  | Hans the DPO audits a 6-month-old AI decision             | 🟡    | GDPR Art. 17 erasure stub `POST /gdpr/erasure-request` returns Priva certificate; SPA wipes local cache.  | Real Priva DSR connector pending E5 licence; Purview lineage endpoint still `placeholder.local`; no DPO console.              |
| 8  | Prompt-injection attempt is contained & investigated      | 🟡    | Foundry Content Safety filters enabled by default; APIM rate-limits per channel actor; Sentinel deployed. | No red-team scenario rehearsed; no Sentinel hunting query published; no incident-response runbook proven.                     |
| 9  | CIO per-country, per-language outcomes & 47-portal sunset | 🔴    | Power BI Premium capacity + Fabric workspace provisioned.                                                 | No published report; CSAT not captured per language; sunset roadmap dashboard not built.                                      |
| 10 | DevOps stands up the platform from a clean tenant         | 🟡    | 25 install phases scripted in `scripts/install/Install-UDCSP.ps1`; B4-B7 Voice phase playbook expanded to 14 executable steps. | Not re-run on a clean tenant since the recent installer changes; needs a one-shot validation. |

**Live tonight**: Demo 3 (Maria · DK · PL · Windows Narrator) played end-to-end; Demo 1 citizen-side single rail (submit → re-hydrate cross-device → detail → Remove) verified live on `udcsp.fredgis.com`. Demo 2 voice = code complete, infra B4-B7 pending (see [§ Demo 2](#demo-2-lars)).

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

> Source narrative: [`docs/biz/uses.md` § Demo 2](../biz/uses.md). Architecture: [`docs/biz/voice.md`](../biz/voice.md). Self-rating: **~40% — code complete, infra not yet provisioned**.

### Scope decision (2026-05-15) — "no-handoff" mode for v1

D365 Customer Service NO is not yet installed → we **drop the warm-transfer to a human caseworker** from the Demo 2 v1 script. The citizen ↔ AI voice loop alone covers 9 of the 10 case-study requirements (everything except the SLA / KPI items that need a caseworker outcome). The handoff leg is re-added in v2 once D365 CS NO is provisioned.

### What works today (✅, code-side)

- **Voice orchestrator** (`apps/voice/call-automation/`) — Node 22 + TS, Express + WS upgrade, ACS Call Automation SDK, GPT-4o Realtime WebSocket bridge with server-VAD + barge-in, 3 function tools (`lookup_topic_router`, `escalate_to_human`, `end_call_with_recap`), IVR loader, App Insights wrapper, vitest tests. `isLiveMode()` gates the real ACS/OpenAI calls so `npm run dev` is safe locally.
- **Bicep** for `voice-orchestrator` Container App + `gpt-realtime-deployment` (10k TPM, model `gpt-realtime` v2025-08-28) + `event-grid-incoming-call` Event Grid sub + per-country ACS resource + phone-number placeholder.
- **Foundry `topic-router`** agent (kind=prompt, gpt-5.4) live — same brain as chat + voice. Knowledge sources scaffolded: `udcsp-citizens-faq` AI Search index (12 languages incl. nb), `sharepoint-policies`, escalation rules. **Topic-router prompt already aware of voice channel** (system prompt includes voice-specific copy + DK/SE/NO refs).
- **APIM `/agents/topic-router/messages`** live (used by chat widget today, same endpoint voice calls as a function tool). System MI auth, JWT validation, rate-limit 600/min for voice actor (vs 120 for others).
- **IVR yaml packs** (`apps/voice/ivr/{locale}/*.yaml`) for da/sv/nb/en/de/ar — welcome + recording disclosure + escalation prompts.
- **SMS templates** scaffolded (`apps/voice/notifications/sms-templates.json`) — need a `tax-refund-recap.nb-NO.txt` body for the recap tool.

### What is provisioned in Azure (🟡)

| Asset | NO | DK | SE | Comment |
|---|---|---|---|---|
| ACS resource | 🔴 | 🔴 | 🔴 | None of the per-country ACS resources exist yet (the `fgiacs` global one belongs to a different workload) |
| `gpt-realtime` deployment | 🔴 | 🔴 | 🔴 | Quota in `norwayeast` to be verified — fallback `swedencentral` acceptable for v1 |
| `voice-orchestrator` Container App | 🔴 | 🔴 | 🔴 | Image to build + push to ACR first |
| Event Grid `IncomingCall` sub | 🔴 | 🔴 | 🔴 | Created by the orchestrator Bicep |
| PSTN number | 🔴 | 🔴 | 🔴 | Nkom/ERST/PTS lead 1-3 weeks; demo rehearsal uses ACS Direct Calling or US toll-free |
| App Insights | 🟢 | 🟢 | 🟢 | Per-country, ready |
| APIM topic-router | 🟢 | 🟢 | 🟢 | Live |
| Foundry topic-router | 🟢 | 🟢 | 🟢 | Live |

### v1 work order (no D365 Customer Service required)

1. **Verify `gpt-realtime` quota** in `norwayeast` (`az cognitiveservices usage list --location norwayeast`) — fall back to `swedencentral` if zero. Document the choice in `Voice.no.azureOpenAiEndpoint`.
2. **Build + push voice-orchestrator image** to the shared ACR (LandingZone phase output): `cd apps/voice/call-automation && docker build -t <acr>.azurecr.io/udcsp/voice-orchestrator:1.0.0 . && az acr login && docker push …`.
3. **First WhatIf run of the Voice phase** to create the `udcsp-no-acs` resource without the orchestrator: `pwsh ./scripts/install/Install-UDCSP.ps1 -Phase Voice -Environment dev -WhatIf` (B3 first pass).
4. **B4 — harvest outputs** from `scripts/install/reports/<stamp>/install-report.json`: `containerAppsEnvironmentId`, `userAssignedIdentityId`, `apimBaseUrl`, `azureOpenAiEndpoint`, `appInsightsConnectionString`, `acsConnectionStringSecretUri`.
5. **Gate the `escalate_to_human` function tool** on the presence of `D365_VOICE_QUEUE_ID` env var (`apps/voice/call-automation/src/foundry-tool.ts`) — when empty the tool is NOT exposed to GPT Realtime, so the agent gracefully says "a human caseworker will call you back" instead of crashing. Update the `topic-router` system prompt to handle the unavailable-human branch in NB.
6. **B5 — fill `Voice.no` in `udcsp.config.psd1`** with the harvested values, leaving `d365TransferTargetId` / `d365VoiceQueueId` empty until D365 CS exists.
7. **B6 — Run Voice phase for real**: `pwsh ./scripts/install/Install-UDCSP.ps1 -Phase Voice -Environment dev`. Creates the Container App, the gpt-realtime deployment, the Event Grid IncomingCall sub, and stores secrets in KV.
8. **PSTN ingress**: for jury rehearsal, use **ACS Direct Calling** (browser → ACS Web SDK, no PSTN); for full demo, procure a US toll-free in minutes via the ACS portal; for production-look, submit the Nkom KYC pack for `+47 800 …` (1-3 weeks lead).
9. **`Bind-AcsNumber.ps1 -Country no -Env dev`** to wire whichever number to the orchestrator's Event Grid handler.
10. **Author NB-NO FAQ articles** in AI Search index `udcsp-citizens-faq` covering Skatteetaten tax-refund Q&A (synthetic data from A15). Without this the topic-router answers are generic.
11. **Add SMS template `tax-refund-recap.nb-NO.txt`** in `apps/voice/notifications/sms-templates.json`.
12. **B7 — QA smoke gate**: `pwsh ./scripts/install/Install-UDCSP.ps1 -Phase QA -Environment dev`. Should validate `/healthz` on the orchestrator + Event Grid handshake.
13. **Latency tile**: pin a Workbook on App Insights showing `customMetrics["voice.turnLatencyMs"]` p95 ≤ 2 s.
14. **Live dial test**: call the bound number, confirm NB greeting + Foundry trace + SMS recap. Promote Demo 2 row to 🟡 (v1) — full 🟢 awaits D365 CS for the handoff demo.

### v2 backlog (re-enable after D365 Customer Service NO is provisioned)

1. Provision D365 Customer Service NO env + Voice workstream + queue.
2. Capture `d365TransferTargetId` + `d365VoiceQueueId` in `Voice.no` config.
3. Re-enable `escalate_to_human` tool (the env-gating from v1 #5 turns it back on automatically when the GUIDs are set).
4. Test warm-transfer: caseworker receives the call leg + the `udcspEscalation` JSON operation context.
5. Configure recording at the workstream level → Dataverse `callTranscript` → Fabric + Confidential Ledger anchor.
6. Add post-call CSAT IVR survey, ingest into Fabric → Power BI median-4d tile → +38 % KPI.
7. Promote Demo 2 row to 🟢.

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

- **Today (Foundry v1 migration)** — Deleted 7 classic assistants. Rewrote `Import-FoundryAgent.ps1` to call new Agents v1 API (`/agents` with `kind: prompt`, no API key, Entra-only auth). Recreated all 7 agents via the new API; eligibility & caseworker-helper bumped to v2 after switching from `gpt-5.5` (no quota) to `gpt-5.4`. Deployed model `gpt-5.4` on `udcspai`. Updated `architecture.md` Foundry section to reflect the new identity model.
- **Today (Option B wiring, see commit log)** — Foundry: gpt-5.4-mini deployed + 7 assistants created on `udcspai/udcsp` project. APIM DK named-values filled (logicapp callback, foundry endpoints, d365 url, OIDC config, audience, portal-origin). Global CORS policy on `udcsp-dk-prod-apim`. Subscription-key disabled on all 11 APIs. Web `apiFetch` acquires bearer for `api://<dk-clientId>/access_as_user` per current country. Apply Child Benefit page now POSTs and shows correlationId.
- `2dfa7e5` — CIAM authority fix (drop `/SignUpSignIn` from path).
- `c59fb25` — Per-country `VITE_EXTERNAL_ID_CLIENT_ID_{DK,SE,NO}` + correct PCA per redirect.
- `bbe61d7` — POST CONFIGURATION section in `installation.md` + UserBadge "Sign in" without flag.
- `efb22e6` — AuthGate, UserBadge, DemosIndexPage, identity-aware ChatWidget, MyCases empty-state.
- `35a93f7` — Country picker on `/login`.

### 🔧 Maintenance rule

When you finish wiring a demo, edit only its row (state + columns), bump the bundle hash at the top, append a one-line entry to "Recent commits", and do not rewrite the rest of the file.

</details>
