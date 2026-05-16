<div align="center">

# 🍳 UDCSP — Acceptance Recipe

### 8 scenarios · ≈ 1 h 15 walkthrough · 100 % eval coverage

*A directly-executable, step-by-step walkthrough an evaluator follows after install — proves every requirement in [`case-study-11.md`](./case-study-11.md) is met by the deployed platform. Mirrors [`uses.md`](./uses.md) demos 1-8 (demos 9-10 are not exercised live — see footer note).*

[![Scenarios](https://img.shields.io/badge/🎬_Scenarios-8_live-2E7D32?style=for-the-badge)](#)
[![Walkthrough](https://img.shields.io/badge/⏱️_Walkthrough-≈_1h15-AD1457?style=for-the-badge)](#)
[![Coverage](https://img.shields.io/badge/🎯_Eval_rows-1_→_18-E65100?style=for-the-badge)](#)

</div>

---

> **Audience:** evaluators and platform owners walking through the platform end-to-end after install.
>
> **Goal:** prove that every requirement in [`case-study-11.md`](./case-study-11.md) is demonstrably met by the deployed platform — step by step, in the same order an auditor would follow.

> ℹ️ **Live vs target steps.** Scenarios 1 (Anna · DK→SE) and 2 (Lars · voice) include steps that depend on D365 Customer Service per country + Verified ID issuance, which are **not yet provisioned**. Today, Scenario 2 runs in **no-handoff mode** (citizen↔AI loop only, verbal callback closure) and Scenario 1's SE landing is mocked via the shared Dataverse Power App. See [`../tech/inprogress.md`](../tech/inprogress.md) for the canonical live-vs-roadmap split.

Each step is **directly executable**, names the file/script involved, the expected outcome, and the **eval-matrix row** + **demo scenario from [`uses.md`](./uses.md)** it satisfies.

This recipe is split into **collapsible sections**. Click any ▶ to expand.

| # | Persona / theme | Use case (one-liner) | Channel | ⏱️ Time | Eval-matrix rows |
|---|---|---|---|---|---|
| 🟩 **1** | 👩‍💼 Anna — cross-border identity & residency (DK → SE) | Anna moves from Copenhagen to Stockholm and registers her Swedish residency using her Danish eID. | 🌐 Web | ~15 min | 1, 2, 3, 7, 12, 13 |
| 🟪 **2** | 👨‍🦯 Lars — accessibility voice journey (NO) | Lars, blind, calls in Norwegian to check a tax-refund case and is warm-transferred to a human. | 📞 Voice | ~10 min | 4, 5, 11, 12, 17 |
| 🟨 **3** | 👩‍🍼 Maria — Polish caregiver, screen-reader application (SE) | Maria applies for child benefit in Sweden using NVDA + keyboard, in Polish end-to-end. | 🌐 Web + 🦮 NVDA | ~10 min | 4, 5, 13 |
| 🟧 **4** | 👨‍🔧 Erik — DK SMB mobile payslip upload | Erik snaps a payslip on mobile for an income-based benefit; AI extracts fields, AI is assistive. | 📱 Mobile | ~10 min | 7, 13, 16 |
| 🟫 **5** | 👩‍⚖️ Astrid — SE caseworker reviews AI pre-assessment | Astrid triages her D365 queue with Copilot, inspects AI reasoning, overrides one decision. | 🖥️ D365 | ~10 min | 6, 7, 12, 14, 15 |
| ⬛ **6** | 🧑‍💼 Hans — DK DPO handles a Subject Access Request | Hans fulfils a citizen's GDPR data export end-to-end with Purview lineage. | 🛡️ APIM + Purview | ~5 min | 8, 9, 10, 18 |
| 🟥 **7** | 🦸‍♀️ Ingrid — SOC investigates impossible-travel alert | Ingrid investigates a Sentinel alert on a caseworker account, runs the containment playbook. | 🛰️ Sentinel | ~10 min | 9, 10 |
| 🟦 **8** | 👨‍💻 Henrik — CIO opens the cockpit | Henrik reads per-country / per-language outcomes; confirms 28→4-day SLA + 47-portal sunset. | 📊 Power BI | ~5 min | 11, 16 |
| | | | **Total** | **≈ 1 h 15** | |

---

<details>
<summary><h2>🟩 1. Scenario 1 — 👩‍💼 Anna moves Denmark → Sweden (cross-border identity &amp; residency)</h2></summary>

> *Anna moves from Copenhagen to Stockholm and registers her residency in Sweden using her Danish eID — one journey, two countries, one identity.*

> Maps to: **uses.md scenario 01** · **eval-matrix rows 1, 2, 3, 7, 12, 13**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 1.1 | Open the Swedish citizen portal | `https://udcsp-se.swa.azurestaticapps.net/` | Portal loads in Swedish (auto-detected) |
| 1.2 | Click "Logga in med dansk eID" | Login page | Federated External ID flow → DK External ID → eIDAS bridge → SE External ID |
| 1.3 | Confirm citizen lands authenticated as `anna@SYNTH-PERSONAS-DK` | Portal header | Display name + DK→SE migration banner shown |
| 1.4 | Apply for residency permit | Wizard "Apply / Boenderegistrering" | Multi-step accessible form, ARIA live region, no a11y violations |
| 1.5 | Upload payslip + passport scan (samples in `data/synthetic/documents/`) | Upload step | Doc Extractor (Foundry agent) returns structured fields, latency < 4 s |
| 1.6 | Submit application | Final step | Citizen sees confirmation #, SLA 4 days, AI assistant offers next steps in Swedish |
| 1.7 | Switch to caseworker view (D365) | `https://udcspse.crm4.dynamics.com/main.aspx?appid=UDCSP_CaseWorker` | Case appears in queue with AI pre-assessment, BPF at stage "Caseworker review" |
| 1.8 | Open AI pre-assessment trace | "Show AI reasoning" tab | Eligibility agent's grounding, model version, AI Act registry ID, prompts shown |
| 1.9 | Caseworker approves | "Approve" button | Decision logged, citizen notified in Swedish, case closed |
| 1.10 | Verify trace propagation | App Insights end-to-end transaction view, filtered by the case `traceparent` | One transaction across APIM → Logic App → Foundry → D365 → Fabric |

**Exit gate:** all 10 steps green; trace ID propagated; AI Act disclosure visible to citizen.

</details>

---

<details>
<summary><h2>🟪 2. Scenario 2 — 👨‍🦯 Lars (NO) accessibility voice journey 📞</h2></summary>

> *Lars, blind, calls in Norwegian to check the status of a tax-refund case and is warm-transferred to a human caseworker — no screen needed.*

> Maps to: **uses.md scenario 02** · **eval-matrix rows 4, 5, 11, 12, 17**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 2.1 | Look up the bound NO PSTN number | `apps/voice/acs/phone-number-bindings.yaml` — entry where `country: no` | E.164 number + `inboundWebhook: https://voice-no.udcsp.no/api/acs/eventgrid`. If still `placeholder: true`, bind a real one per [`installation.md` § C1](../tech/installation.md#-c--optional-only-if-you-need-them) |
| 2.2 | Smoke the orchestrator (no PSTN required) | `pwsh apps/voice/scripts/Test-Voice.ps1 -Country no -Env dev -OrchestratorBaseUrl https://voice-no.udcsp.no` | `healthz` returns `ok=true country=no liveMode=true`; the synthetic Event Grid handshake succeeds |
| 2.3 | **Real-call path** — dial the NO number, ask in Bokmål: « Hva er statusen på sak NO-2026-0117? » | Voice (PSTN) | Orchestrator answers in Norwegian, plays the recording-consent disclosure, opens gpt-realtime, and routes through APIM to the Foundry topic-router |
| 2.4 | Verify the APIM hop happened | App Insights query: `requests \| where url contains "/agents/topic-router/messages" and customDimensions["x-channel-actor"] == "voice" \| where timestamp > ago(2m)` | Exactly one HTTP 200 with `traceparent` linking back to the ACS call leg |
| 2.5 | Listen to the spoken status answer | Voice playback | Status read with the `nb-NO-FinnNeural` neural voice |
| 2.6 | Say « Snakk med saksbehandler » | Voice | Warm transfer to the D365 voice queue (`Voice.no.d365VoiceQueueId`) |
| 2.7 | Hang up and inspect the trace | App Insights end-to-end transaction view, filtered by the `traceparent` from 2.4 | One transaction spanning ACS → Voice Orchestrator → APIM → Foundry → D365 transfer; PII redacted |
| 2.8 | (Optional, CI) Re-run the function-tool unit suite | `cd apps/voice/call-automation && npm test` | All tests pass — proves GPT Realtime → APIM contract & IVR DTMF routing without a PSTN call |

**Exit gate:** voice path works without touching a screen; APIM hop proven (step 2.4); D365 warm transfer fires (step 2.6); transcript captured in observability with masked PII. Without a real PSTN number, steps 2.1–2.2 + 2.8 still demonstrate the chain is wired correctly.

</details>

---

<details>
<summary><h2>🟨 3. Scenario 3 — 👩‍🍼 Maria (PL caregiver in SE) screen-reader application 🦮</h2></summary>

> *Maria, Polish caregiver in Sweden, applies for child benefit using only NVDA + keyboard, in her own language end-to-end.*

> Maps to: **uses.md scenario 03** · **eval-matrix rows 4, 5, 13**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 3.1 | Open SE portal with NVDA running | Browser + NVDA | Page lang attribute switches when Maria selects Polish |
| 3.2 | Navigate via keyboard only to "Child benefit" | Tab key | Visible focus indicators on every focusable element, skip-nav works |
| 3.3 | Apply for child benefit | Wizard | All form labels announced; error messages programmatic + ARIA-live |
| 3.4 | Trigger validation error | Submit blank required field | Focus moves to first error, error summary read aloud |
| 3.5 | Fix and submit | Final | Confirmation in Polish; AI assistant in Polish offers follow-up |
| 3.6 | Run automated axe scan | `pwsh tests/accessibility/scripts/Run-Accessibility.ps1 -Scenario 3` | Zero WCAG 2.1 AA violations |

**Exit gate:** zero a11y violations across the journey; Polish language preserved end-to-end.

</details>

---

<details>
<summary><h2>🟧 4. Scenario 4 — 👨‍🔧 Erik (DK SMB) mobile payslip upload 📱</h2></summary>

> *Erik, Danish small-business owner, snaps a photo of his payslip on mobile to apply for an income-based benefit; AI extracts the fields, AI is assistive, never autonomous.*

> Maps to: **uses.md scenario 04** · **eval-matrix rows 7, 13, 16**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 4.1 | Launch Expo dev build of the mobile app | `apps/mobile` | DK External ID login screen |
| 4.2 | Login with `erik@SYNTH-PERSONAS-DK` | Native OIDC flow | Token acquired |
| 4.3 | Take a photo of the payslip stub | `data/synthetic/documents/payslip_dk_001.jpg` | Image uploaded, virus-scanned (Defender for Storage), Doc Intelligence extracts fields |
| 4.4 | App displays parsed payslip | Form prefill | Net pay, employer, period, NIN auto-populated; user confirms |
| 4.5 | App calls Foundry eligibility agent via APIM | Background | < 4 s, response contains AI Act registry ID and confidence |
| 4.6 | App displays pre-assessment + "Talk to a human" link | Result screen | Citizen retains agency; nothing auto-decided |

**Exit gate:** AI is **assistive**, never autonomous; full PII flow documented in Purview.

</details>

---

<details>
<summary><h2>🟫 5. Scenario 5 — 👩‍⚖️ Astrid (SE caseworker) reviews AI pre-assessment</h2></summary>

> *Astrid, Swedish caseworker, triages her queue with Copilot for Service, inspects the AI reasoning, overrides one decision and the override feeds shadow-mode metrics.*

> Maps to: **uses.md scenario 05** · **eval-matrix rows 6, 7, 12, 14, 15**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 5.1 | Astrid opens her queue in D365 | `https://udcspse.crm4.dynamics.com/` | "AI Pre-assessed" view lists cases with confidence, language, SLA |
| 5.2 | Open a high-confidence case | Form | BPF on "Caseworker review", AI summary panel from Caseworker-helper agent |
| 5.3 | Click "Show AI reasoning" | Side panel | Sources, prompt, model version, registry ID, fairness slice info |
| 5.4 | Disagree with AI assessment | "Override" button | Form requests reason → captured in Dataverse → mirrored to Fabric for shadow-mode metrics |
| 5.5 | Decision published | "Approve" | Logic App `caseworker-decision-publish` notifies citizen, archives event |
| 5.6 | Open Foundry shadow-mode dashboard | **Compliance Audit** report in the Power BI Premium workspace | Astrid's override is added to the human-AI agreement metric |

**Exit gate:** caseworker can override every AI decision; overrides feed back into model improvement.

</details>

---

<details>
<summary><h2>⬛ 6. Scenario 6 — 🧑‍💼 Hans (DK DPO) handles a Subject Access Request 🛡️</h2></summary>

> *Hans, Danish DPO, fulfils a citizen's GDPR data export end-to-end with audit trail and Purview lineage — proof of "GDPR by design".*

> Maps to: **uses.md scenario 06** · **eval-matrix rows 8, 9, 10, 18**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 6.1 | Hans opens the SAR API | APIM dev portal "data-export" API | OpenAPI shows GDPR scopes |
| 6.2 | POST a SAR for `anna@SYNTH-PERSONAS-DK` | `tests/e2e/tests/scenario-06-hans-dpo.spec.ts` request fixture | Logic App `gdpr-data-export` triggered, ID returned |
| 6.3 | Track progress | GET status endpoint | Pulls personal data from D365, Fabric, Foundry traces, ACS recordings |
| 6.4 | Download bundle | Signed URL returned in 30 s for synthetic data | Encrypted ZIP with audit trail |
| 6.5 | Verify Purview lineage | Purview Studio > Data lineage | Bundle export visible as a lineage edge |

**Exit gate:** SAR completes within target time; every data flow inventoried in Purview.

</details>

---

<details>
<summary><h2>🟥 7. Scenario 7 — 🦸‍♀️ Ingrid (SOC) investigates impossible-travel alert 🛰️</h2></summary>

> *Ingrid, SOC analyst, opens a Sentinel impossible-travel alert on a caseworker account, runs the containment playbook (session revoked, PIM removed) — covers identity + AI-specific risks.*

> Maps to: **uses.md scenario 07** · **eval-matrix rows 9, 10**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 7.1 | Ingrid opens Sentinel | Sentinel Workbook in shared sub | "Impossible travel — caseworker" rule has fired (synthetic) |
| 7.2 | Pivot to user investigation | Sentinel investigation graph | Sign-ins, External ID events, role activations stitched |
| 7.3 | Run containment playbook | Sentinel automation `respond-to-impossible-travel` (`infra/security/sentinel/playbooks/`) | User session revoked, PIM eligibility removed, ticket opened in D365 |
| 7.4 | Verify trace | Log Analytics KQL `union ... | where TraceId == 'X'` | Single trace ID shows all SOC actions |

**Exit gate:** AI-specific risks (prompt injection, model misuse) and identity risks both covered.

</details>

---

<details>
<summary><h2>🟦 8. Scenario 8 — 👨‍💻 Henrik (CIO) opens the cockpit 📊</h2></summary>

> *Henrik, CIO, reads per-country / per-language outcomes in the Power BI cockpit and confirms the 28→4-day SLA + 47-portal sunset are measured automatically.*

> Maps to: **uses.md scenario 08** · **eval-matrix rows 11, 16**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 8.1 | Henrik opens the executive dashboard | **Executive Cockpit** report in the Power BI Premium workspace (URL = `phases.Fabric.outputs.workspaceUrl/reports/executive-cockpit` from the install report) | KPIs: avg processing days = 4.0, satisfaction = 4.5/5, AI accuracy = 92 % |
| 8.2 | Drill into "AI accuracy by language" | Visual | All 12 languages shown; minority languages within tolerance |
| 8.3 | Drill into "Per-country trends" | Visual | DK / SE / NO compared, no regressions |
| 8.4 | Validate KPI matches Fabric gold | KQL via Real-Time Intelligence | KPI numbers reconcile with `gold.applications_decisions` |

**Exit gate:** business outcome KPIs (28 → 4 days, +38 % CSAT) are measured automatically.

</details>

> **Note.** Two demos from [`uses.md`](./uses.md) are intentionally **not exercised live** in this recipe:
> - **Demo 9 — Ole, DevOps reproducible install.** A full tear-down + re-install takes ~90 min. Proof of reproducibility is the `install-report.json` already produced when you ran the platform — diff two consecutive runs to verify idempotence.
> - **Demo 10 — Evaluator cross-cutting walkthrough.** Run automatically by the QA pipeline (`pwsh ./scripts/install/Install-UDCSP.ps1 -Phase QA -SmokeOnly -EvaluatorMode`); the HTML report it produces is the deliverable artefact, no live re-play needed.

— A14 · QA & Evaluation
