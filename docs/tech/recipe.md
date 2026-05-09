# UDCSP — Acceptance Recipe

> **Audience:** evaluators and platform owners walking through the platform end-to-end after install.
>
> **Goal:** prove that every requirement in [`case-study-11.md`](../biz/case-study-11.md) is demonstrably met by the deployed platform — step by step, in the same order an auditor would follow.

Each step is **directly executable**, names the file/script involved, the expected outcome, and the **eval-matrix row** + **demo scenario from `uses.md`** it satisfies.

---

## 0. Pre-flight (5 minutes)

| # | Action | Command / file | Expected | Evidence |
|---|---|---|---|---|
| 0.1 | Confirm install report is green | `Get-Content scripts/install/reports/latest/install-report.json` | `"status": "Succeeded"` for every phase | JSON file |
| 0.2 | Confirm tenant inventory | `pwsh ./scripts/install/Install-UDCSP.ps1 -TestOnly` | All 24 phases report healthy | Console summary |
| 0.3 | Open Power BI Cockpit | URL printed by step 0.2 | KPI tiles render with synthetic data baseline | Screenshot |

---

## 1. Scenario 1 — Anna moves Denmark → Sweden (cross-border identity & residency)

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
| 1.10 | Verify trace in Fabric | Open `Power BI > Caseworker Operations > Citizen Journey` | The traceparent ID found end-to-end across APIM, Logic App, Foundry, D365, Fabric |

**Exit gate:** all 10 steps green; trace ID propagated; AI Act disclosure visible to citizen.

---

## 2. Scenario 2 — Lars (NO) accessibility voice journey

> Maps to: **uses.md scenario 02** · **eval-matrix rows 4, 5, 11, 12, 17**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 2.1 | Call Norwegian helpline | Number printed in `apps/voice/acs/phone-numbers.bicep` (placeholder for case study: simulate via `tests/e2e/tests/scenario-02-lars-no-voice.spec.ts`) | IVR greeting in Norwegian Bokmål, slow-speech mode offered |
| 2.2 | Press 1 for "Status sak" | DTMF | IVR routes to `application-status.yaml` |
| 2.3 | Speak case number | Voice | AI Speech → Foundry classifier resolves intent + retrieves case |
| 2.4 | IVR reads back status in Bokmål | Voice | Status spoken with neural voice `nb-NO-FinnNeural` |
| 2.5 | Request a human agent | "Snakk med saksbehandler" | Escalation routes to D365 omnichannel queue |
| 2.6 | Hang up — verify recording-consent disclosure was played | Logs | `apps/voice/recording-consent/recording-disclosure.md` line for `nb` was emitted at call open |

**Exit gate:** voice path works without touching a screen; full transcript captured in observability with masked PII.

---

## 3. Scenario 3 — Maria (PL caregiver in SE) screen-reader application

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

---

## 4. Scenario 4 — Erik (DK SMB) mobile payslip upload

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

---

## 5. Scenario 5 — Astrid (SE caseworker) reviews AI pre-assessment

> Maps to: **uses.md scenario 05** · **eval-matrix rows 6, 7, 12, 14, 15**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 5.1 | Astrid opens her queue in D365 | `https://udcspse.crm4.dynamics.com/` | "AI Pre-assessed" view lists cases with confidence, language, SLA |
| 5.2 | Open a high-confidence case | Form | BPF on "Caseworker review", AI summary panel from Caseworker-helper agent |
| 5.3 | Click "Show AI reasoning" | Side panel | Sources, prompt, model version, registry ID, fairness slice info |
| 5.4 | Disagree with AI assessment | "Override" button | Form requests reason → captured in Dataverse → mirrored to Fabric for shadow-mode metrics |
| 5.5 | Decision published | "Approve" | Logic App `caseworker-decision-publish` notifies citizen, archives event |
| 5.6 | Open Foundry shadow-mode dashboard | Power BI > AI Decision Trace | Astrid's override is added to the human-AI agreement metric |

**Exit gate:** caseworker can override every AI decision; overrides feed back into model improvement.

---

## 6. Scenario 6 — Hans (DK DPO) handles a Subject Access Request

> Maps to: **uses.md scenario 06** · **eval-matrix rows 8, 9, 10, 18**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 6.1 | Hans opens the SAR API | APIM dev portal "data-export" API | OpenAPI shows GDPR scopes |
| 6.2 | POST a SAR for `anna@SYNTH-PERSONAS-DK` | `tests/e2e/tests/scenario-06-hans-dpo.spec.ts` request fixture | Logic App `gdpr-data-export` triggered, ID returned |
| 6.3 | Track progress | GET status endpoint | Pulls personal data from D365, Fabric, Foundry traces, ACS recordings |
| 6.4 | Download bundle | Signed URL returned in 30 s for synthetic data | Encrypted ZIP with audit trail |
| 6.5 | Verify Purview lineage | Purview Studio > Data lineage | Bundle export visible as a lineage edge |

**Exit gate:** SAR completes within target time; every data flow inventoried in Purview.

---

## 7. Scenario 7 — Ingrid (SOC) investigates impossible-travel alert

> Maps to: **uses.md scenario 07** · **eval-matrix rows 9, 10**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 7.1 | Ingrid opens Sentinel | Sentinel Workbook in shared sub | "Impossible travel — caseworker" rule has fired (synthetic) |
| 7.2 | Pivot to user investigation | Sentinel investigation graph | Sign-ins, External ID events, role activations stitched |
| 7.3 | Run containment playbook | `respond-to-impossible-travel` Logic App | User session revoked, PIM eligibility removed, ticket opened in D365 |
| 7.4 | Verify trace | Log Analytics KQL `union ... | where TraceId == 'X'` | Single trace ID shows all SOC actions |

**Exit gate:** AI-specific risks (prompt injection, model misuse) and identity risks both covered.

---

## 8. Scenario 8 — Henrik (CIO) opens the cockpit

> Maps to: **uses.md scenario 08** · **eval-matrix rows 11, 16**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 8.1 | Henrik opens the executive dashboard | Power BI > Executive Cockpit | KPI: average processing days = 4.0, satisfaction = 4.5/5, AI accuracy = 92 % |
| 8.2 | Drill into "AI accuracy by language" | Visual | All 12 languages shown; minority languages within tolerance |
| 8.3 | Drill into "Per-country trends" | Visual | DK / SE / NO compared, no regressions |
| 8.4 | Validate KPI matches Fabric gold | KQL via Real-Time Intelligence | KPI numbers reconcile with `gold.applications_decisions` |

**Exit gate:** business outcome KPIs (28 → 4 days, +38 % CSAT) are measured automatically.

---

## 9. Scenario 9 — Ole (DevOps) reproducible install

> Maps to: **uses.md scenario 09** · **eval-matrix rows 13, 17**

| # | Action | Where | Expected outcome |
|---|---|---|---|
| 9.1 | Tear down environment | `pwsh ./scripts/cleanup/Remove-UDCSP.ps1 -Environment test` | RGs deleted, External ID disabled, Purview unregistered |
| 9.2 | Re-install | `pwsh ./scripts/install/Install-UDCSP.ps1 -Environment test` | Full platform up in one shot |
| 9.3 | Diff install reports | `Compare-Object (Get-Content reports/run1.json) (Get-Content reports/run2.json)` | Same phases, same status, same checksums |
| 9.4 | Run smoke | `Install-UDCSP.ps1 -SmokeOnly` | All 4 smoke tests green |

**Exit gate:** install is idempotent and reproducible.

---

## 10. Scenario 10 — Evaluator cross-cutting walkthrough

> Maps to: **uses.md scenario 10** · **eval-matrix rows 1–18**

A single Playwright test (`tests/e2e/tests/scenario-10-evaluator-cross-cutting.spec.ts`) chains the previous 9 scenarios in the order an evaluator would explore the platform. Run with:

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -Phase QA -SmokeOnly -EvaluatorMode
```

The HTML report it produces is the **single artefact** to attach to the case-study deliverable.

---

## 11. Eval-matrix coverage map

This recipe walks through scenarios that, combined, cover every row of the [README evaluation criteria matrix](../../README.md#evaluation-criteria-matrix-coverage):

| Row | Criterion | Covered by recipe step |
|---|---|---|
| 1 | EU sovereignty + residency | 1.10, 6.5 |
| 2 | Identity & cross-border | 1.1–1.3 |
| 3 | 47 portals → unified front door | 1.1, 8.1 |
| 4 | Multilingual (12 languages) | 2.4, 3.5 |
| 5 | Accessibility (WCAG 2.1 AA) | 2.1, 3.6 |
| 6 | AI under human control (supervised) | 5.3–5.4 |
| 7 | Service experience modernized (28→4 days) | 1.6, 4.5, 8.1 |
| 8 | GDPR by design | 6.1–6.5 |
| 9 | EU AI Act compliance | 1.8, 7.1, 5.3 |
| 10 | Security & SOC | 7.1–7.4 |
| 11 | Observability + trace propagation | 1.10, 8.4 |
| 12 | Voice + omnichannel | 2.1–2.6 |
| 13 | Reproducibility & DevEx | 9.1–9.4 |
| 14 | Caseworker AI assistance | 5.2–5.5 |
| 15 | Shadow-mode evaluation | 5.6 |
| 16 | Business outcomes measurable | 8.1–8.4 |
| 17 | Operational resilience | 7.3, 9.4 |
| 18 | Continuous evaluation (model + bias) | 5.6, scenario 10 |

The column "Covered by recipe step" must remain green after every release.

— A14 · QA & Evaluation
