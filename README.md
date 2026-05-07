<div align="center">

# 🌍 UDCSP

### Unified Digital Citizen Services Platform

*A federated, AI-first citizen services platform for the Scandinavian public administrations of **Denmark · Sweden · Norway***

[![Citizens](https://img.shields.io/badge/👥_Citizens-2.1M-1565C0?style=for-the-badge)](#)
[![Countries](https://img.shields.io/badge/🌐_Countries-3-2E7D32?style=for-the-badge)](#)
[![Languages](https://img.shields.io/badge/🗣️_Languages-12-AD1457?style=for-the-badge)](#)
[![Processing](https://img.shields.io/badge/⚡_Processing-28d_→_4d-E65100?style=for-the-badge)](#)
[![Portals](https://img.shields.io/badge/🏛️_Portals-47_→_1-5E35B1?style=for-the-badge)](#)
[![Accessibility](https://img.shields.io/badge/♿_Accessibility-WCAG_2.1_AA-00796B?style=for-the-badge)](#)

[![Compliance](https://img.shields.io/badge/🛡️_Compliance-GDPR_·_EU_AI_Act-C62828?style=flat-square)](#)
[![AI Core](https://img.shields.io/badge/🧠_AI_Core-Microsoft_Foundry-FF6F00?style=flat-square)](#)
[![Cloud](https://img.shields.io/badge/☁️_Cloud-Microsoft_Azure-0078D4?style=flat-square)](#)

</div>

---

## ✨ The Story in One Page

Three Nordic governments collectively serve **2.1 million citizens** through **47 disconnected legacy portals**. A citizen who moves from Copenhagen to Stockholm has to re-submit identity documents, wait **28 days** for a residency decision, navigate a portal that may not speak their language, and which may not be accessible to them at all.

UDCSP is **one** federated platform that:

- 🌐 **Unifies the front door** — the 47 national portals are rationalised into a single citizen experience across web, mobile and telephone in **12 languages**, **multilingual and inclusive by design** (voice, screen-reader, plain language) — while each country keeps its sovereign back-office systems intact.
- 🔐 **Federates identity** across the three countries while preserving national data sovereignty.
- 🧠 **Puts AI at the center, under human control** — a Microsoft Foundry-hosted set of agents and models classifies requests, translates content, pre-determines benefit eligibility and answers citizen questions in natural language. **Every model recommendation is traceable, explainable and systematically validated or adjusted by a human caseworker** before any final decision (AI-first, but supervised).
- ⚙️ **Automates back-office routing** through Azure Logic Apps and a Dynamics 365 case-management spine.
- 📊 **Closes the loop** with a unified data and governance layer powered by Microsoft Fabric, Power BI and **Microsoft Purview** — a single governance fabric (catalog, AI Act registry, end-to-end traceability) that makes cross-border data sharing strictly compliant with **GDPR, the EU AI Act and sector-specific EU directives — by design, not as an afterthought**.

> [!IMPORTANT]
> **Target outcomes:** applications processed in **4 days instead of 28**, **+38 % citizen satisfaction**, **WCAG 2.1 AA** accessibility, and **2.1 M citizens** served via a single federated front door — without compromising national data sovereignty.

---

## 📈 Before vs After at a Glance

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 25, 'rankSpacing': 35, 'padding': 6 }, 'themeVariables': { 'fontSize': '12px' } } }%%
graph LR
    Before["⏳ <b>Today</b><br/>━━━━━━━━━━━<br/>📂 47 portals<br/>📅 28-day decisions<br/>🚫 No federation<br/>🗣️ Partial languages<br/>♿ A11y gaps<br/>🧩 Conflicting DPA rules"]
    UDCSP(["🇩🇰 🇸🇪 🇳🇴<br/><b>UDCSP</b>"])
    After["🚀 <b>Tomorrow</b><br/>━━━━━━━━━━━<br/>🏛️ 1 platform · 3 zones<br/>📅 4-day decisions<br/>🔐 2.1 M federated<br/>🗣️ 12 languages<br/>♿ WCAG 2.1 AA<br/>🤖 AI at every step"]

    Before ==> UDCSP ==> After

    style Before fill:#d73a49,stroke:#b31d28,color:#fff
    style UDCSP fill:#8957e5,stroke:#6e40c9,color:#fff
    style After fill:#2ea44f,stroke:#238636,color:#fff
```

---

## 🏛️ Simplified Architecture

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 25, 'rankSpacing': 30, 'padding': 6 }, 'themeVariables': { 'fontSize': '12px' } } }%%
graph TB
    Citizens["👥 Citizens — 🇩🇰 🇸🇪 🇳🇴<br/>2.1 M · 12 languages"]
    Channels["🌐 Web · 📱 Mobile · ☎️ Voice"]
    Edge["🔐 Identity Federation + 🚪 API Gateway<br/>Entra ID · External ID · eIDAS · APIM"]
    Foundry["🧠 Microsoft AI Foundry<br/>classifier · translator · eligibility ·<br/>citizen assistant · doc extractor · Azure OpenAI"]
    Process["⚙️ Logic Apps  ➜  📋 Dynamics 365"]
    Data["📊 Microsoft Fabric  ➜  📈 Power BI"]
    Governance["🛡️ Trust &amp; Governance<br/>Purview · GDPR · EU AI Act · WCAG 2.1 AA"]

    Citizens --> Channels --> Edge --> Foundry --> Process --> Data
    Governance -. governs every layer .-> Edge
    Governance -.-> Foundry
    Governance -.-> Data

    style Citizens fill:#2ea44f,stroke:#238636,color:#fff
    style Channels fill:#2ea44f,stroke:#238636,color:#fff
    style Edge fill:#8957e5,stroke:#6e40c9,color:#fff
    style Foundry fill:#8957e5,stroke:#6e40c9,color:#fff
    style Process fill:#e36209,stroke:#c24e00,color:#fff
    style Data fill:#1565c0,stroke:#0d47a1,color:#fff
    style Governance fill:#d73a49,stroke:#b31d28,color:#fff
```

Green = citizens / channels, purple = identity & AI, orange = backend & process, blue = data, red = governance.

> 📖 **Reading the diagram:** citizens enter through web, mobile or voice; identity is federated and gated by API Management; requests are routed to the **Microsoft AI Foundry brain** and to Logic Apps; cases land in Dynamics 365 and analytics flow into Fabric + Power BI. **Microsoft Purview wraps every layer.**
>
> 👉 *Want the full topology?* See [`architecture.md` §2.1 — High-level view](./docs/architecture.md#21-high-level-view-whole-platform) for the same picture with every Foundry agent, identity service and country flag broken out, then §2.2+ for the deep-dive layer breakdown, data flows, AI request lifecycle, deployment topology, and installer flow.

---

## 🌟 What Makes the Platform Distinctive

| | Pillar | Highlights |
|:-:|---|---|
| 🧠 | **AI-first** | Microsoft Foundry hosts the agents (classifier, translator, eligibility, citizen assistant, document extractor) with built-in evaluation, tracing, content safety, and the EU AI Act registry. **Azure OpenAI is only accessed through Foundry.** |
| 🌐 | **Federated, not centralised** | Each country keeps its sovereign data zone; identity, AI, and orchestration meet in the middle through standards (eIDAS, OpenID Connect, OAuth 2.0). |
| ♿ | **Inclusive by design** | WCAG 2.1 AA baked into the design system; voice channel for citizens who cannot or will not use a screen; **12 official languages with native parity**, not a translation pass. |
| 🛡️ | **Compliance by design** | Purview classifies and labels every dataset; Logic Apps enforces approval gates; AI agents are registered, evaluated, and monitored under the EU AI Act. |
| 🔍 | **Auditable end-to-end** | Every agent decision and every case action is traced into Fabric and made visible in Power BI dashboards for citizens, caseworkers, and auditors. |

---

## 🌍 Multilingual & Inclusive by Design

UDCSP treats **language and accessibility as platform invariants**, not as an end-of-project translation pass.

| Layer | How the 12 languages are handled |
|---|---|
| 🌐 **Channels (web · mobile · voice)** | Locale-aware UI built on a shared design system using **ICU MessageFormat**; per-country branded portals; voice IVR with **Azure AI Speech** STT/TTS in all 12 languages. |
| 🤖 **Conversational AI** | Microsoft **Copilot Studio** topics authored in 12 languages with native review per locale; fall-through to multilingual Foundry agents. |
| 🧠 **AI Brain (Foundry)** | The **Translator agent** chains Azure OpenAI with **Azure AI Translator** to preserve administrative terminology; the **Classifier** and **Citizen Assistant** are evaluated per language with golden datasets. |
| 📄 **Documents** | **Azure AI Document Intelligence** + LLM verification handle multilingual passports, payslips, leases, and forms. |
| 📋 **Case management** | **D365 Customer Service** multilingual knowledge base; outbound communications translated and edited by a caseworker before sending. |
| 📊 **Data & insights** | Per-language tagging in Fabric; Power BI semantic models slice satisfaction, accuracy, and SLA KPIs **by language** to surface inequity. |

> [!NOTE]
> **Accessibility is non-negotiable.** axe-core gates every web build in CI/CD, and an annual third-party WCAG 2.1 AA audit is part of the operating contract.

The 12 supported languages cover the **official** and **most common minority** languages of Denmark, Sweden, and Norway, plus the cross-border working languages required by the **EU Single Digital Gateway**.

---

## 🧩 Mandatory Azure Services (from the case study)

All nine services from the case study are first-class citizens of the platform — none can be removed.

| | # | Service | Role in UDCSP |
|:-:|:-:|---|---|
| 🟦 | 1 | **Microsoft Entra External ID** ¹ | Citizen-facing identity store; per-country tenants federated through Entra. |
| 🟦 | 2 | **Microsoft Entra ID** | Workforce identity for caseworkers & administrators; cross-border federation hub (eIDAS bridge). |
| 🟧 | 3 | **Azure OpenAI** *(via Microsoft Foundry)* | Foundation models for the classifier, translator, eligibility reasoner, and citizen assistant. |
| 🟩 | 4 | **Microsoft Fabric** | Lakehouse, real-time intelligence, semantic models, and the federated analytics layer across the 3 countries. |
| 🟪 | 5 | **Dynamics 365 Customer Service** | Case management spine for caseworkers; SLA, queues, knowledge base, omnichannel integration. |
| 🟨 | 6 | **Azure API Management** | Single entry point for all citizen channels and partner agencies; policies, throttling, transformation. |
| 🟥 | 7 | **Microsoft Purview** | Data catalogue, classification, lineage, DLP, and the EU AI Act risk register for AI assets. |
| 🟨 | 8 | **Azure Logic Apps** | Workflow orchestration of the 4-day end-to-end process across agencies. |
| 🟩 | 9 | **Power BI** | Operational, executive, citizen-facing, and auditor dashboards on top of Fabric. |

> ¹ **Substitution note** — the case study lists *Azure AD B2C* as the citizen-identity service. **Azure AD B2C is no longer available to new customers as of 1 May 2025**; Microsoft's official successor is **Microsoft Entra External ID**, which UDCSP adopts. Full rationale and feature-by-feature mapping in [`docs/architecture.md` § 14.0 — Identity deviation](./docs/architecture.md#identity-deviation-from-the-case-studys-b2c-mandate).

> 🧰 Additional Azure services (Foundry, Container Apps, Static Web Apps, Functions, Cosmos DB, Key Vault, Communication Services, AI Speech, AI Document Intelligence, AI Translator, Defender for Cloud, Sentinel, Front Door, Service Bus, Event Grid, Monitor, Copilot Studio, etc.) complete the picture and are detailed in [`architecture.md`](./docs/architecture.md).

---

## 🤖 Built by an Agent Swarm

UDCSP is delivered by a swarm of **17 specialised AI coding agents**, organised in **5 waves** with explicit parallelisation. Two agents are highlighted up front because they make this case study **demonstrable end-to-end**:

| | Agent | What it produces | Why it matters for the case study |
|:-:|---|---|---|
| 🎲 | **A15 · Synthetic Data & Personas** | GDPR-safe personas, applications, documents, multilingual conversations and golden eval datasets for **DK · SE · NO** in **all 12 languages**, with regenerable pipelines. | Provides the realistic, multi-country dataset needed to demo cross-border journeys, train and evaluate the Foundry agents, prove accessibility, and run audits — without ever using real PII. |
| 🛠️ | **A16 · Installer & Developer Experience** | A single **PowerShell one-shot installer** (`scripts/install/Install-UDCSP.ps1`) that stands up the entire platform end-to-end (landing zone → identity → security → data → Foundry → integration → D365 → frontends → voice → governance), plus a tear-down counterpart and developer-onboarding scripts. | Lets an evaluator (or a new developer) go **from a clean Azure tenant to a running federated platform in one command**. Repeatable, idempotent, CI-validated. |

> [!TIP]
> **From zero to running platform in one command.** Once Wave 4 closes, an evaluator can clone the repo, run `./scripts/install/Install-UDCSP.ps1 -Environment dev -SeedSyntheticData`, sign in to Azure, and watch the federated platform — populated with realistic DK/SE/NO data in 12 languages — come up.

The full agent catalogue, dependency graph, per-wave sub-diagrams and risk register live in [`plan.md`](./docs/plan.md).

---

## 📁 Repository Layout

| Path | Purpose |
|---|---|
| 📄 `README.md` | This file — story, simplified architecture, evaluation matrix. |
| 🏗️ `architecture.md` | Deep-dive architecture: layers, sub-systems, data flows, sovereignty zones, multilingual strategy, deployment. |
| 🤖 `plan.md` | Multi-agent development plan — work packages, agent profiles, parallel waves. |
| 🎬 `uses.md` | **10 demonstration scenarios** an evaluator can run, each mapped to the evaluation matrix rows below. |
| 📚 `case-study-11.md` | Original case study extracted from the source brief. |
| 🏛️ `infra/` | Bicep landing zone, Microsoft Entra External ID + Microsoft Entra ID + custom user flows, Defender + Sentinel baseline, Log Analytics + App Insights observability stack. |
| 💻 `apps/` | React web portal, Expo mobile shell, ACS + AI Speech voice bot (6 languages), Copilot Studio bot, D365 model-driven apps + Power Platform solutions. |
| 🔌 `services/` | API Management (8 OpenAPI APIs), Logic Apps (6 workflows), Functions / Container Apps, Power Automate flows. |
| 🧠 `foundry/` | 6 Foundry agents (eligibility, classifier, citizen-assistant, translator, doc-extractor, caseworker-helper), prompts, evaluations, datasets. |
| 📊 `data/` | Fabric capacities + 3 sovereign workspaces (DK / SE / NO) + 9 lakehouses + notebooks + Power BI items, **synthetic personas & cases for DK/SE/NO** (A15). |
| 🛡️ `governance/` | Purview classifications & policies, EU AI Act registry entries, DPIAs, sovereignty test packs. |
| 🧪 `tests/` | Playwright e2e (10 scenarios), Foundry eval pipelines, axe accessibility gate, k6 load, OWASP ZAP, eIDAS / GDPR / AI Act conformance suites. |
| 🛠️ `scripts/install/` | **One-shot PowerShell installer** `Install-UDCSP.ps1` (A16) + 15 phase modules + `Remove-UDCSP.ps1` tear-down + `Bootstrap-DevEnv.ps1`. See [`installation.md`](./docs/installation.md). |
| ⚙️ `.github/workflows/` | CI for installer validation, repo checks, e2e tests, evals, accessibility, load, security, conformance. |
| 📑 `agents.md` · `installation.md` · `recipe.md` | Build execution log · install procedure · acceptance walk-through. |

---

## 🎯 Evaluation Criteria — Case-Study Coverage Matrix

The table below maps every requirement and outcome stated in the case study to the platform component(s) that deliver it and to the validation method that proves it.

**Legend** — 🟦 Reach / Scale · 🟨 Functional channel · 🟧 AI capability · 🟪 Case management · 🟩 Outcome · 🟥 Compliance · 🟫 Mandatory services

| | # | Case-study requirement / outcome | Delivered by | Validation method |
|:-:|:-:|---|---|---|
| 🟦 | 1 | Consolidate **47 legacy portals** into a unified front door | Static Web Apps + design system + API Management aggregation layer | Inventory mapping in `architecture.md`; portal-decommission tracker |
| 🟦 | 2 | **Cross-border identity federation** for 2.1 M citizens | Microsoft Entra External ID (per country) + Microsoft Entra ID + eIDAS bridge | Federation conformance test against eIDAS sandbox; SSO load test |
| 🟩 | 3 | Reduce processing time **28 d → 4 d** | Logic Apps end-to-end orchestration + Foundry eligibility pre-assessment + D365 queues | Process-mining KPI in Fabric; Power BI SLA dashboard |
| 🟩 | 4 | **+38 % citizen satisfaction** | GenAI assistant (Copilot Studio + Foundry) + omnichannel + WCAG-compliant UI | CSAT survey pipeline → Fabric → Power BI trend |
| 🟧 | 5 | AI **classification & routing in 12 languages** | Foundry classifier agent + AI Translator + Azure OpenAI | Foundry evaluations (accuracy, BLEU, language coverage); golden dataset per language |
| 🟧 | 6 | **GenAI citizen assistant** across web / mobile / phone | Copilot Studio + Foundry agents + AI Speech + Azure Communication Services | Foundry evals + content-safety scorecards + per-channel UAT |
| 🟥 | 7 | **Automated eligibility pre-assessment** before human review | Foundry eligibility model (high-risk under EU AI Act) + business rules in Logic Apps + D365 review queue | Shadow-mode evaluation (model vs. caseworker), bias audit, EU AI Act conformity |
| 🟥 | 8 | **WCAG 2.1 AA** accessibility | Accessible design system + automated axe scans in CI/CD + manual annual audit | axe-core CI gate; third-party accessibility audit report |
| 🟥 | 9 | **GDPR + EU AI Act + sector directives** compliance | Purview classification & policies + AI Act registry + DPIA per use case + Sentinel + Defender for Cloud | DPIA checklist; AI Act high-risk system documentation; Purview compliance report |
| 🟦 | 10 | **National data sovereignty** preserved per country | Three sovereign Azure regions (DK / SE / NO) + per-country Fabric workspaces + per-country External ID tenants + cross-border data-sharing policies in Purview | Network topology review; data-residency tests; Purview policy diff |
| 🟥 | 11 | Different **DPA interpretations** of data-sharing rules | Per-tenant policy packs in Purview + per-country Logic Apps connectors + DPIA per data-flow | Policy unit-tests; legal sign-off per country |
| 🟨 | 12 | **Web, mobile, telephone** channels | Static Web Apps + native mobile shell + AI Speech + Azure Communication Services | Channel UAT scripts; voice bot transcription accuracy |
| 🟦 | 13 | **Multilingual support across all 12 languages** | ICU i18n in UI; Translator agent in Foundry; Speech STT/TTS in 12 languages; multilingual Copilot Studio topics; per-language KPIs | Per-language Foundry eval suites; per-language CSAT slicing in Power BI |
| 🟫 | 14 | Use of **all 9 mandatory Azure services** | See *Mandatory Azure Services* table above | Architecture review; service-inventory CI check |
| 🟧 | 15 | **Auditability** of every AI decision | Foundry tracing + Application Insights + Fabric audit lakehouse + Power BI audit dashboard | Trace replay test; auditor walkthrough |
| 🟪 | 16 | **Caseworker productivity** | D365 Customer Service + Copilot for Service + multilingual knowledge base | D365 KPIs (AHT, FCR); caseworker satisfaction survey |
| 🟦 | 17 | **Synthetic but realistic data** for the three countries (demos, training, evals, audits) | Dedicated synthetic-data agent (A15) producing 12-language personas, applications, documents, conversations and golden eval datasets — GDPR-safe, regenerable | Dataset coverage report; eval baselines green; auditor-ready persona book |
| 🟫 | 18 | **One-shot installable platform** — repeatable, zero-to-running deployment | Dedicated installer agent (A16) producing `scripts/install/Install-UDCSP.ps1` that orchestrates Bicep, Foundry, D365, Power Platform and Copilot Studio assets across the 3 sovereign zones | Smoke deployment from a clean Azure tenant in CI; tear-down script verifies idempotency; deployment report archived in `scripts/install/reports/` |

---

## 📚 Where to Go Next

| Audience | Start with |
|---|---|
| 👔 **Citizens / business sponsors** | This README. |
| 🎬 **Evaluators / demo audiences** | [`uses.md`](./docs/uses.md) — **10 scenarios** that exercise every row of the evaluation matrix. |
| 🧠 **Anyone reading the AI story** | [`ai.md`](./docs/ai.md) — why Foundry **and** Copilot Studio, the agent catalogue, safety, evals, EU AI Act registry, end-to-end conversation flow. |
| 🏗️ **Architects** | [`architecture.md`](./docs/architecture.md) — deep-dive across 15 sections. |
| 🤖 **Delivery teams & AI coding agents** | [`plan.md`](./docs/plan.md) — 17 agent profiles, 5 waves, parallelisation graphs. |
| 🛠️ **Operators / DevOps** | [`installation.md`](./docs/installation.md) + [`scripts/install/Install-UDCSP.ps1`](./scripts/install/Install-UDCSP.ps1) — the one-shot installer with 15 phase modules. |
| 🛡️ **Auditors / DPOs** | The *Evaluation Criteria* matrix above, then the *Governance* sections of [`architecture.md`](./docs/architecture.md). |
| 📚 **Original case study** | [`case-study-11.md`](./docs/case-study-11.md). |

---

## 🗂️ All Documentation

Every markdown lives under [`docs/`](./docs/). One file per concern, each readable on its own.

| 📄 File | 🎯 Purpose | 👤 Best for |
|---|---|---|
| [`docs/case-study-11.md`](./docs/case-study-11.md) | The verbatim case study brief — the source of truth for what UDCSP must deliver. | Everyone (read first to understand the constraints). |
| [`docs/architecture.md`](./docs/architecture.md) | Full platform deep-dive — 15 sections covering principles, logical architecture, sovereignty topology, identity federation, AI architecture, integration, case management, data, governance, security, observability, multilingual strategy, end-to-end flows, service inventory, deployment. | Architects, tech leads. |
| [`docs/ai.md`](./docs/ai.md) | The AI story end-to-end — why **both** Microsoft Foundry and Copilot Studio, the 6-agent catalogue, RAG strategy, safety + eval pipelines, EU AI Act registry, the canonical Anna conversation flow, anti-patterns. | Anyone reading the AI rationale. |
| [`docs/uses.md`](./docs/uses.md) | The 10 demonstration scenarios with the evaluation criteria each one satisfies. | Evaluators, demo presenters. |
| [`docs/recipe.md`](./docs/recipe.md) | Step-by-step acceptance recipe — the single guided walkthrough that exercises every layer of the platform. | Acceptance testers, hands-on reviewers. |
| [`docs/installation.md`](./docs/installation.md) | End-to-end install procedure — prerequisites, secrets, the 15 phases, dependency DAG, troubleshooting, teardown. | DevOps, operators. |
| [`docs/plan.md`](./docs/plan.md) | The multi-agent delivery plan — 17 agent profiles, 5 waves of parallel execution, scope per agent, exit gates, risk register. | Delivery managers, AI coding agents. |
| [`docs/agents.md`](./docs/agents.md) | The actual development log — per-agent timings, parallel execution evidence, models used, requests consumed, deliverables produced. | Anyone reviewing how the platform was built. |

> All eight files are kept in sync; cross-links are validated by the `markdown-link-check` GitHub Action.

---

<div align="center">

*UDCSP — built with Microsoft Azure and Microsoft Foundry, for the citizens of Denmark, Sweden, and Norway.* 🇩🇰 🇸🇪 🇳🇴

</div>
