# UDCSP — Monitoring

> **Audience.** Platform engineers and reviewers wiring observability across the SPA, the voice runtime, APIM, Logic Apps, Dataverse and the 7 Foundry agents.
>
> **Outcome.** Every citizen interaction (web, mobile, voice) and every AI verdict produces a structured event, ingested in the per-country App Insights, joinable by W3C `traceparent` to APIM gateway logs and AOAI request/response logs, surfaced in 3 operator workbooks per country and (next sprint) in one executive Power BI report on a sovereign Fabric F64 capacity.

> [!IMPORTANT]
> This file is the **plan and recipe**. It is *not* a status tracker — the live state of demos and roll-outs sits in [`inprogress.md`](./inprogress.md). The installer steps live in [`installation.md`](./installation.md) § Platform monitoring.

---

## Table of contents

1. [State of play — what produces telemetry today](#state-of-play)
2. [Plan — what to add and why](#plan)
3. [Implementation — phased recipe](#implementation)
4. [Compliance — AI Act, GDPR, ePrivacy traceability story](#compliance)

---

<a id="state-of-play"></a>

## 1. State of play

Audit run on the live tenant on 2026-05-17 (MCAPS sandbox `MngEnvMCAP294737`).

| Source | Emits telemetry to App Insights? | Emits telemetry to LAW (Azure Monitor diag)? | Surfaced in workbooks? | Notes |
|---|:-:|:-:|:-:|---|
| **Voice orchestrator** `udcsp-no-dev-voice-orch` (Container App, `norwayeast`) | 🟢 `applicationinsights` Node SDK + `trackEvent` + `trackException` + W3C `traceparent` + cloudRole | n/a — ACA stdout already auto-collected | 🟢 NO workbooks alive | Wired via KV secret `app-insights-connection`. Lights up on every `+33 801 150 799` dial. |
| **Web SPA** `udcsp-web-dev` (Static Web App, custom domain `udcsp.fredgis.com`) | 🔴 no JS SDK in `apps/web/`, no `VITE_APPLICATIONINSIGHTS_*` in SWA app settings | n/a | 🔴 | Every Demo 1 / 3 / 4 flow leaves no trace today. Closing this gap is the highest-impact item in this document. |
| **APIM × 3** (`udcsp-{dk,se,no}-prod-apim`) | 🔴 0 loggers configured | 🔴 0 diagnostic-settings | 🔴 | M3 recipe in `installation.md` is ready and non-invasive (additive resource, no policy XML touched). |
| **AOAI account** `udcspai` (hosts the 7 Foundry agents + the 3 model deployments) | n/a | 🔴 no diagnostic-settings | 🔴 in workbooks · 🟢 in **Foundry observability portal** | Platform metrics (`TokensUsage`, `Requests`, `GeneratedTokens`, `TimeBetweenTokens`) are recorded out-of-the-box and queryable from the resource blade — they just don't feed any workbook yet. |
| **Foundry agents** (`udcsp-{classifier,eligibility,doc-extractor,citizen-assistant,topic-router,caseworker-helper,translator}`) | n/a | n/a directly, but every call appears as a row in AOAI logs once diag-settings is on | 🟡 indirectly (the voice orchestrator's `dependencies` rows reach them through APIM) | `https://ai.azure.com/explore/aiservices/udcspai/observability` already renders runs, latency, tokens, errors per agent — **zero setup required**. |
| **Logic Apps × N** (`udcsp-{c}-dev-application-intake`, `cross-border-residency`, `escalation-to-human`, GDPR pair, archive-handover trio) | 🔴 | 🔴 no diag-settings | 🔴 | Optional surface — runtime trace is sufficient for the demo path. M3 in `installation.md` includes the recipe. |
| **D365** (Dataverse `tasks` + future `incidents`) | n/a | 🔴 no Application Insights connector to Dataverse yet | 🔴 | Out of scope today — caseworker activity surfaces in the model-driven Power App. |
| **Static Web App** (`udcsp-web-dev` SWA platform) | 🟡 SWA emits `StaticWebAppsFunctionTraces` to a generic AI if configured | 🔴 | 🔴 | Lower priority — the citizen-facing telemetry must come from the SPA bundle itself, not from the platform plane. |

### Demo-time consequences (today, no change applied)

- **Demo 1 — Anna DK→SE residency.** Citizen completes the 6-step wizard in DA/SV. **No trace in any workbook.** The flow works, but it's invisible to the reviewer.
- **Demo 2 — Lars NO voice.** End-to-end visible in NO workbooks: `call.*`, `realtime.*`, `topic_router.*`, `escalation.*`. Dependencies row links to APIM + AOAI. **Single working surface today.**
- **Demo 3 — Maria DK in Polish.** Same as Demo 1 — invisible.
- **Demo 4 — Erik DK on mobile.** Same — invisible.
- **Demo 5 — Astrid caseworker.** Activity inside the model-driven Power App is logged in Dataverse audit log; not in App Insights.
- **Demos 6/7/8.** Same SPA flow — invisible until #2 is wired.
- **Demo 9 — CIO outcomes.** The 9 workbooks are deployed and functional, but only NO has live data because of #2.

---

<a id="plan"></a>

## 2. Plan

### 2.1 — Three calibrated effort tiers

| Tier | Effort | What it adds | Risk | Rubric impact | Recommendation |
|---|---|---|---|:-:|:-:|
| 🪶 **Light** | ~1 h, CLI only | AOAI diag-settings → LAW · APIM diag-settings (M3) · 1 new chart per workbook · README link to the Foundry observability portal | nul (additive Azure resources, no app or policy code touched) | Monitoring 4/5 → 4.5/5 | suffisant si SPA ne peut pas être touchée |
| 🌿 **Sage** | ~½ day | Light + SPA instrumented with `@microsoft/applicationinsights-web` + 6 `trackEvent` at journey milestones + W3C `traceparent` propagation in `apiFetch` | low (1 isolated wrapper file, 1 line touched in `apiFetch.ts`, bundle size +70 KB gz) | Monitoring 4/5 → 5/5 · Demo Completeness 4/5 → 5/5 (workbooks light up for Demos 1/3/4) | **selected — best ROI** |
| 💎 **Luxury** | ~2 days | Sage + OneLake medallion ingestion of AOAI logs + Power BI semantic model + cost-attribution dashboard per agent per locale + W3C distributed tracing collector with explicit propagator | medium (multiple moving parts, requires Fabric pipeline auth + Dataverse connector setup) | minimal extra rubric impact above Sage | over-engineered for this scope |

### 2.2 — Why Sage is the right answer

Three reasons:

1. **Sovereignty narrative becomes tri-pays.** Today the only living signal is voice on NO. After Sage, a Polish-speaking citizen on the DK portal lights up `customDimensions['locale']='pl'` in the DK App Insights only — never DK + SE. The CIO talking point *"per-language inequity is visible in raw telemetry"* (uses.md §Demo 9) becomes provable from the workbook, not just the script.
2. **The Foundry portal already gives you agent-level telemetry for free.** No need to rebuild it; just link it from the demo. Sage focuses the new work on the gap (SPA + cross-resource join) instead of duplicating what Foundry ships.
3. **The ROI maps 1-to-1 to the rubric.** Two rubric rows (Monitoring + Dev Completeness) each move by 1 point. That's 2 of the 3 points needed for **A → A+ (58/60 ceiling)**.

### 2.3 — Free wins available **before** any code change

Three items take 0 minutes to integrate and should always be in the demo:

| Free win | Where | Demo line to drop |
|---|---|---|
| **Foundry observability portal** | `https://ai.azure.com/explore/aiservices/udcspai/observability` (or project `udcsp`) — lists every agent run, tokens, latency, errors | *"Here is the agent-level view shipped natively by Foundry — 7 agents, real runs, token cost per call, refresh in seconds."* |
| **AOAI Metrics blade** | Azure portal → `udcspai` → Metrics → `TokensUsage` / `Requests` / `GeneratedTokens` / `TimeBetweenTokens`, split by `ModelDeploymentName` | *"Tokens consumed today by gpt-realtime, gpt-5.4, gpt-5.4-mini — straight from the platform metrics, no semantic model needed."* |
| **App Insights NO Transaction search** | App Insights NO → Transaction search → filter by `traceparent` | *"Every voice call is a single W3C trace from ACS through Container Apps through APIM through Foundry. EU AI Act art. 14 evidence."* |

### 2.4 — Out of scope (deliberately not addressed)

- D365 / Dataverse activity stream into App Insights (separate effort — Dataverse audit log → Synapse Link → LAW is its own pipeline).
- Sentinel hunting queries (Sentinel is wired but the hunting catalogue is not part of this work).
- Foundry evaluations dashboard rebuild (the eval JSON in `foundry/evaluations/results/` is consumed by the executive PBI, not by the operator workbooks).
- SLO definitions / error budgets (governance asset, not a monitoring asset).

---

<a id="implementation"></a>

## 3. Implementation (Sage tier)

> Ordered for minimum-blast-radius first. Each step is independently reversible. Run them sequentially; stop at any point and the system stays consistent.

### Phase A — Non-invasive Azure plane (≈ 30 min, zero app code)

| Step | What | Resource type | Action | Reversal |
|--:|---|---|---|---|
| A1 | Diagnostic-settings on **AOAI `udcspai`** → LAW NO (`udcsp-no-prod-law`) | `Microsoft.Insights/diagnosticSettings` (child of the AOAI account) | push `RequestResponse`, `Audit`, `Trace`, `AllMetrics` | `az monitor diagnostic-settings delete --name <n> --resource <aoai-id>` |
| A2 | M3 from `installation.md` — diag-settings on **APIM × 3** → respective LAW | child of each APIM service | `GatewayLogs` + `WebSocketConnectionLogs` + `AllMetrics` | per-resource delete |
| A3 | Diag-settings on **ACS NO** `udcsp-no-acs` → LAW NO | child of the Communication service | `CallSummary` + `CallDiagnostics` + `CallAutomationOperational` + `CallRecordingSummary` | per-resource delete |
| A4 | Diag-settings on the 3 most-trafficked **Logic Apps** (`application-intake`, `cross-border-residency`, `escalation-to-human`) → LAW NO | child of each workflow | `WorkflowRuntime` | per-resource delete |

**Result.** Every APIM hit, every ACS event, every Logic App run, every AOAI call now lands in the country LAW in a queryable form. Workbooks gain a new section that pulls `AzureDiagnostics` next to the App Insights tables.

### Phase B — SPA instrumentation (≈ 3 h, scoped & reversible)

| Step | What | Files touched | Risk |
|--:|---|---|---|
| B1 | `npm install --save @microsoft/applicationinsights-web @microsoft/applicationinsights-react-js` | `apps/web/package.json`, lockfile | +70 KB gzipped on the SPA bundle, axe-core + e2e CI must stay green |
| B2 | New file `apps/web/src/telemetry/index.ts` — single export `getAppInsights(country)` that initialises the SDK once, configures auto-collect, attaches the `traceparent` propagator, sets cloudRole = `udcsp-spa-{country}` | new file only | nul (no existing import is broken) |
| B3 | Wire **runtime country → cnx string** lookup: 3 build-time vars `VITE_APPINSIGHTS_CONN_DK`, `VITE_APPINSIGHTS_CONN_SE`, `VITE_APPINSIGHTS_CONN_NO`, mirrored from the existing `VITE_EXTERNAL_ID_CLIENT_ID_*` pattern | `apps/web/src/config.ts` (1 block added) | nul if the pattern is mirrored exactly |
| B4 | Call `getAppInsights(currentCountry)` from `App.tsx` boot, after auth context is established | `apps/web/src/App.tsx` (~3 lines) | nul if guarded behind `if (cnx)` |
| B5 | Patch `apiFetch.ts` to attach `traceparent` and capture the response correlationId as a custom dimension on the next event | `apps/web/src/api/apiFetch.ts` (1 helper imported, 2 lines added) | nul — header is W3C standard, already accepted by APIM |
| B6 | Add 6 `trackEvent` calls at journey milestones — no PII, only event name + locale + correlationId + page route: <br>· `page.viewed` (router subscription)<br>· `apply.start` (Apply page mount)<br>· `apply.submit` (POST OK)<br>· `eligibility.checked` (POST OK)<br>· `my-cases.opened` (My Cases page mount)<br>· `consent.given` (consent banner accept) | 5 pages + 1 banner | nul if helper is shared |
| B7 | Push the 3 cnx strings into the SWA app settings: `az staticwebapp appsettings set -n udcsp-web-dev --setting-names VITE_APPINSIGHTS_CONN_DK=... VITE_APPINSIGHTS_CONN_SE=... VITE_APPINSIGHTS_CONN_NO=...` | SWA only | nul — write-only side |
| B8 | `npm run build && swa deploy ...` (per the deploy command in `inprogress.md`) | n/a | normal deploy cycle |
| B9 | Live smoke — sign in as Anna on DK, walk Demo 1, refresh `citizen-journey-funnel` DK workbook, expect step 1 + 2 + 4 populated | n/a | revert by rolling back B7 (empty app settings) → SDK silently disables |

### Phase C — Workbook enrichment (≈ 30 min)

| Step | What | File |
|--:|---|---|
| C1 | Add a 4th section to `platform-health.json`: KPI tile **AI requests** + **AI tokens** sourced from `AzureDiagnostics` cross-resource query against the AOAI logs (visible after A1) | `infra/observability/workbooks/platform-health.json` |
| C2 | Add a section to `ai-decision-traces.json`: AOAI request table joined to `customEvents` on `operation_Id` | `infra/observability/workbooks/ai-decision-traces.json` |
| C3 | Add a link tile to all 3 workbooks pointing at the Foundry observability portal | each workbook |
| C4 | Re-PUT the 9 deployed workbooks via the REST-direct loop documented in `installation.md` § M2 | n/a |

### Phase D — Documentation & governance (≈ 30 min)

| Step | What | File |
|--:|---|---|
| D1 | Add a new sub-section `M7 — SPA telemetry` in `installation.md` § Platform monitoring covering: build-time env vars, SWA app settings, runtime country selector, the 6 events emitted, the no-PII rule | `docs/tech/installation.md` |
| D2 | Append an annex to `governance/gdpr/ropa.md` declaring the SPA telemetry processing: purpose, lawful basis (Art. 6.1.e public interest + Art. 6.1.f legitimate interest in operational security), data categories (technical identifiers only — no Art. 9), retention (App Insights default 90 d, can be reduced to 30 d to match the ePrivacy minimization principle), recipients (App Insights / LAW, no third party), DPIA reference | `governance/gdpr/ropa.md` |
| D3 | Cross-link `monitoring.md` from `architecture.md` § 5 (Operating model) and from each of the 3 demo storyboards that gain observability (`docs/biz/web.md`, `docs/biz/mobile.md`, `docs/biz/voice.md`) | three files |
| D4 | Append a row to `inprogress.md` § Recent commits | `docs/tech/inprogress.md` |

### Phase E — Acceptance (≈ 15 min)

1. Anna signs in DK → walks Demo 1 → DK workbook `citizen-journey-funnel` shows steps 1-2-4 with `locale=da` and `cloudRole=udcsp-spa-dk`.
2. Maria signs in DK in Polish → same workbook adds `locale=pl` rows; sovereignty fact pattern intact.
3. Erik signs in DK on iPhone → adds mobile `userAgent`, no cross-pollination to SE/NO.
4. Lars calls `+33 801 150 799` → NO workbook keeps showing voice events alongside the new SPA events (nothing breaks NO).
5. Click any `operation_Id` from the SPA event → Transaction search shows the full APIM → AOAI chain → tokens consumed → response code.

### Rollback (if anything goes wrong)

| Phase | Rollback command |
|---|---|
| A | `az monitor diagnostic-settings delete --name <n> --resource <id>` per resource |
| B | `az staticwebapp appsettings delete -n udcsp-web-dev --setting-names VITE_APPINSIGHTS_CONN_DK VITE_APPINSIGHTS_CONN_SE VITE_APPINSIGHTS_CONN_NO` → SDK auto-disables → SPA back to silent |
| C | Re-PUT the 3 workbook JSONs at the pre-monitoring git tag (`UDCSP-v0.91-pre-monitoring`) |
| D | Revert the documentation commit |

---

<a id="compliance"></a>

## 4. Compliance — AI Act, GDPR, ePrivacy story

### 4.1 — EU AI Act (Regulation 2024/1689)

Two relevant articles drive the observability requirements.

| Article | Requirement | How UDCSP monitoring satisfies it |
|---|---|---|
| **Art. 12 — Record-keeping for high-risk AI systems** | High-risk systems must enable automatic recording of events ("logs") during their lifetime, traceable to a natural person (operator). | Every Foundry agent call produces a `customEvent` with `traceparent`, `operation_Id`, `agentName`, `country`, `locale`, and the AOAI request hit lands in `AzureDiagnostics` joined on the same `operation_Id`. Retention is at least 6 months (Art. 12.3) — App Insights default 90 d is **extended to 13 months via continuous export to LAW** (LAW default = 90 d, configurable up to 730 d). Documented in `governance/ai-act/retention.md`. |
| **Art. 14 — Human oversight** | The operator must be able to interpret the output, decide to disregard or reverse it, and intervene. | The `ai-decision-traces` workbook lists every verdict with confidence, decision, locale, channel, agent, `operation_Id`. The caseworker model-driven Power App writes the human override to Dataverse `udcsp_caseworker_decision` (scaffolded) and emits a `caseworker.override` `customEvent`. Both surfaces are joinable. Confidential Ledger (`infra/security/confidential-ledger/`) provides the immutable record of overrides for evidentiary purposes. |
| **Annex III §5(b)** — *Access to essential public services* | The eligibility-pre-assessor falls inside this scope. | The agent is registered with `risk: high` in `governance/ai-act/registry/eligibility-model.yaml`. Its decisions are logged with both the model verdict **and** the caseworker disposition, so a 6-month-old decision can be reconstructed end-to-end (cf. Demo 7 — Hans the DPO). |

### 4.2 — GDPR (Regulation 2016/679)

| Article | Requirement | How UDCSP monitoring satisfies it |
|---|---|---|
| **Art. 5(1)(c) — Data minimisation** | Personal data must be limited to what is necessary. | SPA `trackEvent` payloads carry **no PII**: only event name, locale, country, page route, correlationId. No form fields, no CPR/BankID/MitID, no free-text input. Enforced by code review (declared in `governance/gdpr/ropa.md` annex) and by an opt-in Application Insights dictionary of allowed custom dimensions. |
| **Art. 5(1)(e) — Storage limitation** | Retention must be no longer than necessary. | App Insights default 90 d is the **maximum**. For Art. 12 AI Act overlap, AI-decision events are continuously exported to LAW with a 13-month retention (= the minimum prescribed by AI Act Art. 12.3 + 1 month buffer). Citizen-journey events keep the 90-d App Insights limit. |
| **Art. 25 — Data protection by design** | Engineered-in defaults must protect data. | (a) 3 separate App Insights instances, one per residency zone — telemetry never crosses borders. (b) Connection-string per country, selected at runtime by the authenticated country context. (c) The SDK is initialised only after auth context is established, so anonymous-visitor pageviews bear no user link. |
| **Art. 30 — Records of processing** | The controller must maintain a register. | The SPA telemetry processing is declared in `governance/gdpr/ropa.md` annex with: purpose (operational observability, demo storytelling, AI Act art. 12 record-keeping), lawful basis (Art. 6.1.e public interest + 6.1.f legitimate interest), data categories (technical identifiers only, no Art. 9 special categories), recipients (App Insights / LAW, no third party), retention (90 d / 13 months tiered), transfers (none). |
| **Art. 32 — Security of processing** | Pseudonymisation, encryption, integrity, confidentiality. | App Insights connection-strings stored as SWA app settings (write-only credential, key not usable to read back data — confirmed by Microsoft docs). LAW data is encrypted at rest with platform-managed keys; customer-managed keys are available via Key Vault if required. |

### 4.3 — ePrivacy Directive (2002/58/EC, transposed nationally — DK § 10 LBK 805, SE LEK 6:18, NO ekomloven § 2-7b)

| Provision | Requirement | How UDCSP monitoring satisfies it |
|---|---|---|
| **Cookies and identifiers** | Consent required for any non-essential storage on the user's terminal. | The Application Insights JS SDK uses `localStorage` for session tracking. The SPA's existing cookie consent banner is extended to gate telemetry initialisation: SDK is loaded only after `consent.given` has been emitted (the same event used to feed the funnel). Until consent, the only telemetry that flows is server-side `dependency` tracking from APIM/Logic Apps — which is non-personal traffic metadata. |

### 4.4 — Sovereignty assertions

The architecture preserves national data sovereignty even for telemetry:

1. **DK citizen → DK App Insights only.** The SPA reads `currentCountry` from the auth context (External ID claim) and selects the matching connection-string. There is no fall-through to a default; if the country is unknown, the SDK is **not initialised**.
2. **NO voice → NO App Insights only.** The `udcsp-no-dev-voice-orch` Container App is bound to one cnx string at deploy time; it cannot push to DK or SE even if asked.
3. **AOAI logs → country LAW of the calling tenant.** The diagnostic-settings created in Phase A target the LAW of the country whose APIM proxied the request — there is no central AOAI log sink.
4. **Cross-country queries are by design read-only and PBI-mediated.** The executive Power BI report (next sprint) reads the 3 App Insights via Direct Query and aggregates server-side at Fabric. No raw telemetry is moved between countries.

### 4.5 — Auditor reading list

When the DPO / AI Act auditor opens this section, send them to these 4 files in order:

1. `governance/ai-act/registry/eligibility-model.yaml` — declares the high-risk agent
2. `governance/ai-act/retention.md` — retention policy with cross-references to Art. 12 + Art. 5(1)(e)
3. `governance/gdpr/ropa.md` § telemetry annex — the SPA telemetry record
4. `infra/observability/workbooks/ai-decision-traces.json` — the workbook every verdict is drilled from

---

> **Cross-references.** Live status of the monitoring roll-out in [`inprogress.md`](./inprogress.md) § Demo 9. Installer steps in [`installation.md`](./installation.md) § 📊 PLATFORM MONITORING. Storage zones and retention matrix in [`data.md`](./data.md) § Retention. Architecture context in [`architecture.md`](./architecture.md) § Operating model.
