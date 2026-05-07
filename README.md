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

- 🌐 **Unifies the front door** for citizens across web, mobile, and telephone in **12 languages**.
- 🔐 **Federates identity** across the three countries while preserving national data sovereignty.
- 🧠 **Puts AI at the center** — a Microsoft Foundry-hosted set of agents and models classifies requests, translates content, pre-determines benefit eligibility, and answers citizen questions in natural language.
- ⚙️ **Automates back-office routing** through Azure Logic Apps and a Dynamics 365 case-management spine.
- 📊 **Closes the loop** with a unified data and governance layer powered by Microsoft Fabric, Power BI, and Microsoft Purview — keeping the platform compliant with **GDPR, the EU AI Act, and sector-specific EU directives** by design.

> [!IMPORTANT]
> **Target outcomes:** applications processed in **4 days instead of 28**, **+38 % citizen satisfaction**, **WCAG 2.1 AA** accessibility, and **2.1 M citizens** served via a single federated front door — without compromising national data sovereignty.

---

## 📈 Before vs After at a Glance

```mermaid
graph LR
    BEFORE["⏳ Today<br/>━━━━━━━━━━━━━<br/>📂 47 disconnected portals<br/>📅 28 days · average decision<br/>🚫 No cross-border identity<br/>🗣️ Patchy language coverage<br/>♿ Accessibility gaps<br/>🧩 Conflicting DPA rules"]
    AFTER["🚀 Tomorrow with UDCSP<br/>━━━━━━━━━━━━━<br/>🏛️ 1 federated platform<br/>📅 4 days · automated triage<br/>🔐 2.1 M citizens federated<br/>🗣️ 12 languages · native parity<br/>♿ WCAG 2.1 AA throughout<br/>🛡️ Per-country sovereign zones<br/>🤖 AI-assisted at every step"]
    BEFORE ==>|UDCSP transformation| AFTER

    classDef before fill:#FFEBEE,stroke:#C62828,stroke-width:3px,color:#B71C1C
    classDef after fill:#E8F5E9,stroke:#2E7D32,stroke-width:3px,color:#1B5E20
    class BEFORE before
    class AFTER after
```

---

## 🏛️ Simplified Architecture

```mermaid
graph TB
    subgraph CITIZENS["👥  Citizens · 2.1 M · 12 languages"]
        direction LR
        DK["🇩🇰 Denmark"]
        SE["🇸🇪 Sweden"]
        NO["🇳🇴 Norway"]
    end

    subgraph CHANNELS["🌐  Omnichannel Front Door"]
        direction LR
        WEB["💻 Web Portal"]
        MOB["📱 Mobile App"]
        VOICE["☎️ Voice / IVR"]
    end

    IDENTITY["🔐  Cross-Border Identity Federation<br/><i>Microsoft Entra ID · Azure AD B2C · eIDAS</i>"]

    GATEWAY["🚪  Unified API Gateway<br/><i>Azure API Management</i>"]

    subgraph BRAIN["🧠  AI Brain — Microsoft Foundry"]
        direction TB
        AOAI["✨ Azure OpenAI"]
        FCLASS["🎯 Classifier"]
        FTRANS["🌍 Translator"]
        FELIG["⚖️ Eligibility Pre-Assessor"]
        FASSIST["🤖 Citizen Assistant"]
        FDOC["📄 Document Extractor"]
    end

    WORKFLOW["⚙️  Workflow Orchestration<br/><i>Azure Logic Apps  ·  28d ➜ 4d</i>"]

    CASES["📋  Case Management<br/><i>Dynamics 365 Customer Service</i>"]

    subgraph DATA["📊  Unified Data & Insights"]
        direction LR
        FABRIC["🗄️ Microsoft Fabric"]
        PBI["📈 Power BI"]
    end

    GOVERNANCE["🛡️  Trust, Privacy & AI Governance<br/><i>Microsoft Purview · GDPR · EU AI Act · WCAG 2.1 AA</i>"]

    DK --> CHANNELS
    SE --> CHANNELS
    NO --> CHANNELS
    CHANNELS --> IDENTITY
    IDENTITY --> GATEWAY
    GATEWAY --> BRAIN
    GATEWAY --> WORKFLOW
    BRAIN --> WORKFLOW
    WORKFLOW --> CASES
    CASES --> FABRIC
    FABRIC --> PBI
    BRAIN -. traces & evals .-> FABRIC

    GOVERNANCE -. policies .-> IDENTITY
    GOVERNANCE -. AI Act registry .-> BRAIN
    GOVERNANCE -. classifications .-> CASES
    GOVERNANCE -. lineage .-> FABRIC

    classDef citizens fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#0D47A1
    classDef channels fill:#E1F5FE,stroke:#0277BD,stroke-width:2px,color:#01579B
    classDef identity fill:#EDE7F6,stroke:#5E35B1,stroke-width:3px,color:#311B92
    classDef gateway fill:#E0F2F1,stroke:#00796B,stroke-width:3px,color:#004D40
    classDef ai fill:#FFF3E0,stroke:#E65100,stroke-width:3px,color:#BF360C
    classDef workflow fill:#FFF9C4,stroke:#F9A825,stroke-width:2px,color:#F57F17
    classDef cases fill:#FCE4EC,stroke:#AD1457,stroke-width:2px,color:#880E4F
    classDef data fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    classDef governance fill:#FFEBEE,stroke:#C62828,stroke-width:3px,color:#B71C1C

    class DK,SE,NO citizens
    class WEB,MOB,VOICE channels
    class IDENTITY identity
    class GATEWAY gateway
    class AOAI,FCLASS,FTRANS,FELIG,FASSIST,FDOC ai
    class WORKFLOW workflow
    class CASES cases
    class FABRIC,PBI data
    class GOVERNANCE governance
```

> 📖 **Reading the diagram:** every citizen interaction flows top-to-bottom through identity, the API gateway, and the Foundry-hosted AI brain before reaching the back-office case spine and the data platform. **Governance is a horizontal concern** that audits and constrains every layer.

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
| 🟦 | 1 | **Azure Active Directory B2C** | Citizen-facing identity store; per-country tenants federated through Entra. |
| 🟦 | 2 | **Microsoft Entra ID** | Workforce identity for caseworkers & administrators; cross-border federation hub (eIDAS bridge). |
| 🟧 | 3 | **Azure OpenAI** *(via Microsoft Foundry)* | Foundation models for the classifier, translator, eligibility reasoner, and citizen assistant. |
| 🟩 | 4 | **Microsoft Fabric** | Lakehouse, real-time intelligence, semantic models, and the federated analytics layer across the 3 countries. |
| 🟪 | 5 | **Dynamics 365 Customer Service** | Case management spine for caseworkers; SLA, queues, knowledge base, omnichannel integration. |
| 🟨 | 6 | **Azure API Management** | Single entry point for all citizen channels and partner agencies; policies, throttling, transformation. |
| 🟥 | 7 | **Microsoft Purview** | Data catalogue, classification, lineage, DLP, and the EU AI Act risk register for AI assets. |
| 🟨 | 8 | **Azure Logic Apps** | Workflow orchestration of the 4-day end-to-end process across agencies. |
| 🟩 | 9 | **Power BI** | Operational, executive, citizen-facing, and auditor dashboards on top of Fabric. |

> 🧰 Additional Azure services (Foundry, Container Apps, Static Web Apps, Functions, Cosmos DB, Key Vault, Communication Services, AI Speech, AI Document Intelligence, AI Translator, Defender for Cloud, Sentinel, Front Door, Service Bus, Event Grid, Monitor, Copilot Studio, etc.) complete the picture and are detailed in [`architecture.md`](./architecture.md).

---

## 📁 Repository Layout

| Path | Purpose |
|---|---|
| 📄 `README.md` | This file — story, simplified architecture, evaluation matrix. |
| 🏗️ `architecture.md` | Deep-dive architecture: layers, sub-systems, data flows, sovereignty zones, multilingual strategy. |
| 🤖 `plan.md` | Multi-agent development plan — work packages, agent profiles, parallel waves. |
| 📚 `case-study-11.md` | Original case study extracted from the source brief. |
| 🏛️ `infra/` *(future)* | Bicep / Terraform landing zone & per-domain modules. |
| 💻 `apps/` *(future)* | Citizen portals, mobile shell, voice bot, Copilot Studio agents. |
| 🔌 `services/` *(future)* | API microservices and Logic Apps definitions. |
| 🧠 `foundry/` *(future)* | Foundry agents, prompts, evaluations, datasets. |
| 📊 `data/` *(future)* | Fabric items, semantic models, Power BI reports, **synthetic personas & cases for DK/SE/NO**. |
| 🛡️ `governance/` *(future)* | Purview policies, AI Act registry entries, DPIAs. |

---

## 🎯 Evaluation Criteria — Case-Study Coverage Matrix

The table below maps every requirement and outcome stated in the case study to the platform component(s) that deliver it and to the validation method that proves it.

**Legend** — 🟦 Reach / Scale · 🟨 Functional channel · 🟧 AI capability · 🟪 Case management · 🟩 Outcome · 🟥 Compliance · 🟫 Mandatory services

| | # | Case-study requirement / outcome | Delivered by | Validation method |
|:-:|:-:|---|---|---|
| 🟦 | 1 | Consolidate **47 legacy portals** into a unified front door | Static Web Apps + design system + API Management aggregation layer | Inventory mapping in `architecture.md`; portal-decommission tracker |
| 🟦 | 2 | **Cross-border identity federation** for 2.1 M citizens | Entra External ID + Azure AD B2C + eIDAS bridge | Federation conformance test against eIDAS sandbox; SSO load test |
| 🟩 | 3 | Reduce processing time **28 d → 4 d** | Logic Apps end-to-end orchestration + Foundry eligibility pre-assessment + D365 queues | Process-mining KPI in Fabric; Power BI SLA dashboard |
| 🟩 | 4 | **+38 % citizen satisfaction** | GenAI assistant (Copilot Studio + Foundry) + omnichannel + WCAG-compliant UI | CSAT survey pipeline → Fabric → Power BI trend |
| 🟧 | 5 | AI **classification & routing in 12 languages** | Foundry classifier agent + AI Translator + Azure OpenAI | Foundry evaluations (accuracy, BLEU, language coverage); golden dataset per language |
| 🟧 | 6 | **GenAI citizen assistant** across web / mobile / phone | Copilot Studio + Foundry agents + AI Speech + Azure Communication Services | Foundry evals + content-safety scorecards + per-channel UAT |
| 🟥 | 7 | **Automated eligibility pre-assessment** before human review | Foundry eligibility model (high-risk under EU AI Act) + business rules in Logic Apps + D365 review queue | Shadow-mode evaluation (model vs. caseworker), bias audit, EU AI Act conformity |
| 🟥 | 8 | **WCAG 2.1 AA** accessibility | Accessible design system + automated axe scans in CI/CD + manual annual audit | axe-core CI gate; third-party accessibility audit report |
| 🟥 | 9 | **GDPR + EU AI Act + sector directives** compliance | Purview classification & policies + AI Act registry + DPIA per use case + Sentinel + Defender for Cloud | DPIA checklist; AI Act high-risk system documentation; Purview compliance report |
| 🟦 | 10 | **National data sovereignty** preserved per country | Three sovereign Azure regions (DK / SE / NO) + per-country Fabric workspaces + per-country B2C tenants + cross-border data-sharing policies in Purview | Network topology review; data-residency tests; Purview policy diff |
| 🟥 | 11 | Different **DPA interpretations** of data-sharing rules | Per-tenant policy packs in Purview + per-country Logic Apps connectors + DPIA per data-flow | Policy unit-tests; legal sign-off per country |
| 🟨 | 12 | **Web, mobile, telephone** channels | Static Web Apps + native mobile shell + AI Speech + Azure Communication Services | Channel UAT scripts; voice bot transcription accuracy |
| 🟦 | 13 | **Multilingual support across all 12 languages** | ICU i18n in UI; Translator agent in Foundry; Speech STT/TTS in 12 languages; multilingual Copilot Studio topics; per-language KPIs | Per-language Foundry eval suites; per-language CSAT slicing in Power BI |
| 🟫 | 14 | Use of **all 9 mandatory Azure services** | See *Mandatory Azure Services* table above | Architecture review; service-inventory CI check |
| 🟧 | 15 | **Auditability** of every AI decision | Foundry tracing + Application Insights + Fabric audit lakehouse + Power BI audit dashboard | Trace replay test; auditor walkthrough |
| 🟪 | 16 | **Caseworker productivity** | D365 Customer Service + Copilot for Service + multilingual knowledge base | D365 KPIs (AHT, FCR); caseworker satisfaction survey |
| 🟦 | 17 | **Synthetic but realistic data** for the three countries (demos, training, evals, audits) | Dedicated synthetic-data agent (A15) producing 12-language personas, applications, documents, conversations and golden eval datasets — GDPR-safe, regenerable | Dataset coverage report; eval baselines green; auditor-ready persona book |

---

## 📚 Where to Go Next

| Audience | Start with |
|---|---|
| 👔 **Citizens / business sponsors** | This README. |
| 🏗️ **Architects** | [`architecture.md`](./architecture.md) — deep-dive across 14 sections. |
| 🤖 **Delivery teams & AI coding agents** | [`plan.md`](./plan.md) — 16 agent profiles, 5 waves, parallelisation graphs. |
| 🛡️ **Auditors / DPOs** | The *Evaluation Criteria* matrix above, then the *Governance* sections of [`architecture.md`](./architecture.md). |
| 📚 **Original case study** | [`case-study-11.md`](./case-study-11.md). |

---

<div align="center">

*UDCSP — built with Microsoft Azure and Microsoft Foundry, for the citizens of Denmark, Sweden, and Norway.* 🇩🇰 🇸🇪 🇳🇴

</div>
