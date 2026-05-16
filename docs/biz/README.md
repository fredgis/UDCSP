<div align="center">

# 📚 UDCSP — Business Documentation

### *Why* the platform exists · *Who* it serves · *How* every channel works

[![Docs](https://img.shields.io/badge/📑_Docs-12-1565C0?style=for-the-badge)](#)
[![Channels](https://img.shields.io/badge/📡_Channels-6-2E7D32?style=for-the-badge)](#)
[![Personas](https://img.shields.io/badge/👥_Personas-15-AD1457?style=for-the-badge)](#)
[![Scenarios](https://img.shields.io/badge/🎬_Scenarios-10-E65100?style=for-the-badge)](#)

</div>

---

> ℹ️ **Deployed vs roadmap.** These docs describe the **target platform**. For what's actually live today across DK/SE/NO — including D365 Customer Service status, Verified ID, the Demo 2 no-handoff mode — see [`../tech/inprogress.md`](../tech/inprogress.md).

---

## 🎯 Start here

| Doc | What it is | Read first if you are… |
|---|---|---|
| 📋 [`case-study-11.md`](./case-study-11.md) | **Immutable case-study brief.** The verbatim prompt the platform answers. | New to the project — read this once. |
| 🎬 [`uses.md`](./uses.md) | **10 demonstration scenarios** (narrative). One persona, one journey each. | Pitching, telling the story, demoing. |
| 👥 [`personas.md`](./personas.md) | **Identity provisioning matrix** — every demo persona, the AD/tenant their account lives in, licences and groups to attach. | Setting up a fresh tenant before a demo run. |
| 🍳 [`recipe.md`](./recipe.md) | **Live walkthrough** (~1 h 15) — 8 directly-executable scenarios with exit gates. | An evaluator with the platform up & running. |

---

## 📡 Channels — How citizens reach the platform

| Doc | Channel | Headline |
|---|---|---|
| 🌐 [`web.md`](./web.md) | **Web portal** | One unified portal replacing 47 country sites. |
| 📱 [`mobile.md`](./mobile.md) | **Mobile app** | One React Native codebase, three countries, same Foundry brain. |
| 💬 [`chat.md`](./chat.md) | **Chat widget** | Conversational front door, embeds the topic-router. |
| 📞 [`voice.md`](./voice.md) | **Voice (PSTN)** | Telephone is a peer of web and mobile, not an afterthought. |
| 📧 [`email.md`](./email.md) | **Email** | Inbound triage + outbound notifications with attachments. |
| 📲 [`sms.md`](./sms.md) | **SMS** | Status updates and OTP flows. |
| 🧑‍💼 [`caseworker.md`](./caseworker.md) | **Caseworker (D365)** | The back-office channel where every escalation lands and AI is supervised. |

---

## 🧠 The brain & the rules

| Doc | What it covers |
|---|---|
| 🧠 [`ai.md`](./ai.md) | The AI architecture — Microsoft Foundry · topic-router · Azure OpenAI · 7 agents · 12 languages. |
| 🛡️ [`datacompliance.md`](./datacompliance.md) | Every regulation we answer to · every control · every piece of evidence (GDPR, AI Act, eIDAS 2.0, NIS2, ePrivacy). |

---

## 🔗 See also

| Where | What |
|---|---|
| ⚙️ [`../tech/`](../tech/) | Technical documentation (architecture, data, install, plans). |
| 🏠 [`../../README.md`](../../README.md) | Repo entry point. |

---

<details>
<summary><h2>🎯 Evaluation Criteria — Case-Study Coverage Matrix</h2></summary>

The table below maps every requirement and outcome stated in the case study to the platform component(s) that deliver it and to the validation method that proves it.

**Legend** — 🟦 Reach / Scale · 🟨 Functional channel · 🟧 AI capability · 🟪 Case management · 🟩 Outcome · 🟥 Compliance · 🟫 Mandatory services

| | # | Case-study requirement / outcome | Delivered by | Validation method |
|:-:|:-:|---|---|---|
| 🟦 | 1 | Consolidate **47 legacy portals** into a unified front door | Static Web Apps + design system + API Management aggregation layer | Inventory mapping in `architecture.md`; portal-decommission tracker |
| 🟦 | 2 | **Cross-border identity federation** for 2.1 M citizens | Microsoft Entra External ID (per country) + Microsoft Entra ID + eIDAS bridge | Federation conformance test against eIDAS sandbox; SSO load test |
| 🟩 | 3 | Reduce processing time **28 d → 4 d** | Logic Apps end-to-end orchestration + Foundry eligibility pre-assessment + D365 queues | Process-mining KPI in Fabric; Power BI SLA dashboard |
| 🟩 | 4 | **+38 % citizen satisfaction** | GenAI assistant (Foundry **`topic-router`** + downstream agents) + omnichannel + WCAG-compliant UI | CSAT survey pipeline → Fabric → Power BI trend |
| 🟧 | 5 | AI **classification & routing in 12 languages** | Foundry classifier agent + AI Translator + Azure OpenAI | Foundry evaluations (accuracy, BLEU, language coverage); golden dataset per language |
| 🟧 | 6 | **GenAI citizen assistant** across web / mobile / phone | Foundry `topic-router` + downstream Foundry agents + AI Speech + Azure Communication Services | Foundry evals + content-safety scorecards + per-channel UAT |
| 🟥 | 7 | **Automated eligibility pre-assessment** before human review | Foundry eligibility model (high-risk under EU AI Act) + business rules in Logic Apps + D365 review queue | Shadow-mode evaluation (model vs. caseworker), bias audit, EU AI Act conformity |
| 🟥 | 8 | **WCAG 2.1 AA** accessibility | Accessible design system + automated axe scans in CI/CD + manual annual audit | axe-core CI gate; third-party accessibility audit report |
| 🟥 | 9 | **GDPR + EU AI Act + sector directives** compliance | Purview classification & policies + AI Act registry + DPIA per use case + Sentinel + Defender for Cloud | DPIA checklist; AI Act high-risk system documentation; Purview compliance report |
| 🟦 | 10 | **National data sovereignty** preserved per country | Three sovereign Azure regions (DK / SE / NO) + per-country Fabric workspaces + per-country External ID tenants + cross-border data-sharing policies in Purview | Network topology review; data-residency tests; Purview policy diff |
| 🟥 | 11 | Different **DPA interpretations** of data-sharing rules | Per-tenant policy packs in Purview + per-country Logic Apps connectors + DPIA per data-flow | Policy unit-tests; legal sign-off per country |
| 🟨 | 12 | **Web, mobile, telephone** channels | Static Web Apps + native mobile shell + **voice orchestrator** (`apps/voice/call-automation/` — ACS Call Automation ↔ gpt-realtime ↔ Foundry topic-router) + **D365 Customer Service voice channel** for PSTN, queues and warm-transfer to human caseworkers | Channel UAT scripts; `apps/voice/scripts/Test-Voice.ps1` (healthz + Event Grid handshake); voice transcription accuracy in Fabric |
| 🟦 | 13 | **Multilingual support across all 12 languages** | ICU i18n in UI; Translator agent in Foundry; Speech STT/TTS in 12 languages; Foundry `topic-router` per-locale topic logic; per-language KPIs | Per-language Foundry eval suites; per-language CSAT slicing in Power BI |
| 🟫 | 14 | Use of **all 9 mandatory Azure services** | External ID + Entra + Foundry (OpenAI) + Fabric + D365 + APIM + Purview + Logic Apps + Power BI Premium — all light up across the 10 demo scenarios in [`uses.md`](./uses.md) | Architecture review; service-inventory CI check |
| 🟧 | 15 | **Auditability** of every AI decision | Foundry tracing + Application Insights + Fabric audit lakehouse + Power BI audit dashboard | Trace replay test; auditor walkthrough |
| 🟪 | 16 | **Caseworker productivity** | D365 Customer Service + Copilot for Service + multilingual knowledge base | D365 KPIs (AHT, FCR); caseworker satisfaction survey |
| 🟦 | 17 | **Synthetic but realistic data** for the three countries (demos, training, evals, audits) | Dedicated synthetic-data agent (A15) producing 12-language personas, applications, documents, conversations and golden eval datasets — GDPR-safe, regenerable | Dataset coverage report; eval baselines green; auditor-ready persona book |
| 🟫 | 18 | **One-shot installable platform** — repeatable, zero-to-running deployment | Dedicated installer agent (A16) producing `scripts/install/Install-UDCSP.ps1` that orchestrates Bicep, Foundry (incl. the `topic-router` agent), D365 and Power Platform assets across the 3 sovereign zones — **25 phases** post-audit | Smoke deployment from a clean Azure tenant in CI; tear-down script verifies idempotency; deployment report archived in `scripts/install/reports/` |

</details>
