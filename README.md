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

## 🏛️ Simplified Architecture

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 25, 'rankSpacing': 30, 'padding': 6 }, 'themeVariables': { 'fontSize': '12px' } } }%%
graph TB
    Citizens["👥 Citizens — 🇩🇰 🇸🇪 🇳🇴<br/>2.1 M · 12 languages"]
    Channels["🌐 Web · 📱 Mobile · ☎️ Voice"]
    Edge["🔐 Identity Federation + 🚪 API Gateway<br/>Entra ID · External ID · eIDAS · APIM"]
    Foundry["🧠 Microsoft AI Foundry — single AI brain<br/>topic-router · classifier · translator · eligibility ·<br/>citizen assistant · doc extractor · caseworker helper · Azure OpenAI"]
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
> 👉 *Want the full topology?* See [`architecture.md` §2.1 — High-level view](./docs/tech/architecture.md#21-high-level-view-whole-platform) for the same picture with every Foundry agent, identity service and country flag broken out, then §2.2+ for the deep-dive layer breakdown, data flows, AI request lifecycle, deployment topology, and installer flow.

---

## 🧠 AI Brain

A simplified view of the AI architecture detailed in [`docs/biz/ai.md`](./docs/biz/ai.md): **one** Foundry brain, **one** APIM gateway, **one** Content Safety pipeline, **seven** channels, **seven** agents — and an explicit high-risk lane (Eligibility) running in a Trusted Execution Environment with tamper-evident logging.

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 22, 'rankSpacing': 28, 'padding': 6 }, 'themeVariables': { 'fontSize': '12px' } } }%%
graph TB
    subgraph CONV["💬 Conversational channels"]
        Voice["📞 Voice"]
        Web["🌐 Web"]
        Mobile["📱 Mobile"]
        Chat["💬 Chat"]
    end
    subgraph NOTIF["📨 Notification channels"]
        SMS["📲 SMS"]
        Email["📧 Email"]
    end
    Case["🧑‍💼 Caseworker<br/>D365 + Copilot for Service"]

    APIM["🚪 APIM — single gateway<br/><i>auth · throttle · audit · /agents/topic-router</i>"]
    Safety["🛡️ Content Safety<br/><i>input + output scan, every call</i>"]
    Logic["⚙️ Logic Apps<br/><i>outbound SMS / email</i>"]

    subgraph FOUNDRY["🧠 Microsoft AI Foundry — single AI brain"]
        TR["🗣️ <b>topic-router</b><br/>orchestrator · slots · escalation"]
        CL["🤖 Classifier<br/>intent · language · urgency"]
        CA["🤖 Citizen Assistant<br/>RAG-grounded answers"]
        DE["🤖 Doc Extractor<br/>OCR + verify"]
        EL["⚠️ Eligibility<br/><b>HIGH-RISK · TEE</b>"]
        TX["🤖 Translator<br/>12 languages"]
        CW["🤖 Caseworker Helper<br/>RAG + summaries"]
    end

    RAG["📚 RAG knowledge<br/>SharePoint · agency sites · Fabric"]
    Trace["🔍 Tracing — App Insights → Purview lineage"]
    Ledger["🔒 Confidential Ledger<br/>AI Act Art. 26(6) tamper-evident log"]

    CONV --> APIM
    Case --> APIM
    NOTIF --> Logic --> APIM

    APIM --> Safety --> TR
    TR --> CL
    TR --> CA
    TR --> DE
    TR --> EL
    TR --> TX
    APIM --> CW

    CA -. RAG .-> RAG
    CW -. RAG .-> RAG
    EL -. evidence .-> RAG

    FOUNDRY ==> Trace
    EL ==> Ledger

    classDef chan fill:#2ea44f,stroke:#238636,color:#fff
    classDef ws fill:#1565c0,stroke:#0d47a1,color:#fff
    classDef gw fill:#8957e5,stroke:#6e40c9,color:#fff
    classDef agent fill:#e36209,stroke:#c24e00,color:#fff
    classDef hi fill:#d73a49,stroke:#b31d28,color:#fff
    classDef gov fill:#6e40c9,stroke:#553098,color:#fff

    class Voice,Web,Mobile,Chat,SMS,Email chan
    class Case,Logic ws
    class APIM,Safety gw
    class TR,CL,CA,DE,TX,CW agent
    class EL hi
    class RAG,Trace,Ledger gov
```

> 📖 **Reading the diagram.** Every conversational channel (voice, web, mobile, chat) and every workforce action (caseworker via D365 Copilot for Service) hits the **same APIM endpoint** `/agents/topic-router`. Notification channels (SMS, email) bypass conversational routing — they only need the **Translator** agent for outbound 12-language localisation. Inside Foundry, the `topic-router` is the only orchestrator: it owns slots, escalation rules, and dispatches to the six worker agents. **Content Safety runs on every input and every output**, no exceptions. The **Eligibility** agent is the platform's only EU AI Act high-risk component — it runs inside a **Trusted Execution Environment** (Confidential Compute, SEV-SNP) and every decision is appended to **Azure Confidential Ledger** for cryptographic, tamper-evident proof (AI Act Art. 26(6)). RAG-grounded agents cite their sources back to SharePoint, public agency sites and Fabric. The whole conversation is traced through App Insights and indexed in Purview.
>
> 🔗 **Concrete wiring.** The Eligibility agent's three tools (`deterministic-rules-engine`, `case-history-lookup`, `lineage-writer`) and the topic-router's six connections / knowledge sources are declared as real OpenAPI contracts under [`foundry/agents/`](./foundry/agents/) — APIM endpoints, managed-identity auth, per-tool rate limits, AI-Act compliance refs. The installer substitutes the per-tenant `${VAR}` placeholders at deploy time.
>
> 👉 *Want the full picture?* See [`docs/biz/ai.md`](./docs/biz/ai.md) — mental model, agent catalogue, per-channel AI footprint, RAG strategy, safety + eval pipelines, EU AI Act registry, end-to-end conversation flow, anti-patterns.

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
| 🤖 | **Conversational AI** | Microsoft **Foundry `topic-router` agent** owns the multi-turn dialog logic in 12 languages, with slot-filling state in **Azure Cache for Redis**; topics are reviewed per locale; falls through to specialised Foundry agents (classifier, citizen-assistant, doc-extractor, eligibility, translator). |
| 🧠 **AI Brain (Foundry)** | The **Translator agent** chains Azure OpenAI with **Azure AI Translator** to preserve administrative terminology; the **Classifier** and **Citizen Assistant** are evaluated per language with golden datasets. |
| 📄 **Documents** | **Azure AI Document Intelligence** + LLM verification handle multilingual passports, payslips, leases, and forms. |
| 📋 **Case management** | **D365 Customer Service** multilingual knowledge base; outbound communications translated and edited by a caseworker before sending. |
| 📊 **Data & insights** | Per-language tagging in Fabric; Power BI semantic models slice satisfaction, accuracy, and SLA KPIs **by language** to surface inequity. |

> [!NOTE]
> **Accessibility is non-negotiable.** axe-core gates every web build in CI/CD, and an annual third-party WCAG 2.1 AA audit is part of the operating contract.

The 12 supported languages cover the **official** and **most common minority** languages of Denmark, Sweden, and Norway, plus the cross-border working languages required by the **EU Single Digital Gateway**.

---

## 🤖 Built by an Agent Swarm

UDCSP was built **end-to-end by AI coding agents**, in three distinct campaigns: an initial 17-agent build (`plan.md`), a 7-agent post-audit refactor (`plan_post_audit.md` §1-§6), and 19 cycles of iterative audit hardening (`plan_post_audit.md` §7).

### 🗺️ End-to-end timeline

```mermaid
timeline
    title Three campaigns, one platform
    section Campaign 1 — Initial build (plan.md)
      W0 Foundation : A0 Architect : A1 LandingZone+DevOps
      W1 Horizontals (parallel) : A2 Identity : A3 Security : A4 Fabric : A5 Observability : A15 SyntheticData
      W2 Verticals (parallel) : A6 Foundry+AI : A7 APIM+LogicApps : A8 D365 : A9 Web+Mobile : A10 Voice+Channels
      W3 Intelligence (parallel) : A11 Topic-router : A12 i18n+a11y : A13 Purview
      W4 Qualification : A14 QA+Evals : A16 One-shot installer
    section Campaign 2 — Post-audit refactor (plan_post_audit.md §1-§6)
      7 sub-agents (parallel, strict folder boundaries) : SA-1 PostgreSQL+Redis : SA-2 ConfLedger+ConfCompute+DDoS+Backup+Chaos+DefenderAPIs : SA-3 VerifiedID+Bastion+CIEM : SA-4 Copilot Studio→Foundry topic-router : SA-5 PBI Embedded→HTML+Chart.js : SA-6 Priva (GDPR DSR) : SA-7 docs/biz refresh
    section Campaign 3 — Iterative audit (plan_post_audit.md §7)
      19 audit cycles (r6 → r24) : 3 parallel Haiku agents per cycle : 57 sub-agent runs total : 19 fix commits : ~28 P0 + ~30 P1 + ~5 P2 defects : ~25 hallucinations rejected : r24 = first fully-CLEAN round → stop
```

### 🏗️ Campaign 1 — Initial build (17 agents · 5 waves)

```mermaid
flowchart LR
    classDef wave fill:#0e639c,color:#fff,stroke:#0a4d7a
    classDef arch fill:#7e57c2,color:#fff,stroke:#5e35b1
    W0["W0 · Foundation<br/>A0 Architect → A1 LandingZone"]:::wave
    W1["W1 · Horizontals (∥)<br/>A2 Identity · A3 Security · A4 Fabric<br/>A5 Observability · A15 SyntheticData"]:::wave
    W2["W2 · Verticals (∥)<br/>A6 Foundry+AI · A7 APIM+LogicApps<br/>A8 D365 · A9 Web+Mobile · A10 Voice"]:::wave
    W3["W3 · Intelligence (∥)<br/>A11 Topic-router · A12 i18n+a11y · A13 Purview"]:::wave
    W4["W4 · Qualification<br/>A14 QA+Evals · A16 One-shot installer"]:::wave
    W0 --> W1 --> W2 --> W3 --> W4
```

Two agents are highlighted because they make the case study **demonstrable end-to-end**:

| | Agent | What it produces | Why it matters |
|:-:|---|---|---|
| 🎲 | **A15 · Synthetic Data & Personas** | GDPR-safe personas, applications, documents, multilingual conversations and golden eval datasets for **DK · SE · NO** in **all 12 languages**, regenerable. | Realistic multi-country dataset for cross-border journeys, agent training/eval, accessibility audits — without ever touching real PII. |
| 🛠️ | **A16 · Installer & Developer Experience** | One-shot **PowerShell installer** (`Install-UDCSP.ps1`) — landing zone → identity → security → data → Foundry → integration → D365 → frontends → voice → governance — plus tear-down + dev onboarding. | Goes **from a clean Azure tenant to a running federated platform in one command**. Repeatable, idempotent, CI-validated. |

> Full agent catalogue, dependency graph, per-wave sub-diagrams and risk register: [`plan.md`](./docs/tech/plan.md).

### 🔄 Campaign 2 — Post-audit refactor (7 sub-agents · parallel · strict folder boundaries)

| SA | Mission | Net stack diff |
|:-:|---|---|
| **SA-1** | Data refactor | `−` Cosmos · `+` PostgreSQL Flexible (×3 countries) · `+` Redis Enterprise |
| **SA-2** | Security additions | `+` Confidential Ledger · Confidential Compute · DDoS Std · Backup+ASR · Chaos Studio · Defender for APIs |
| **SA-3** | Identity additions | `+` Verified ID · Bastion · CIEM (Permissions Management) |
| **SA-4** | Copilot Studio → Foundry | `−` Copilot Studio · `+` Foundry `topic-router` agent (12 langs absorbed) |
| **SA-5** | Power BI Embedded → HTML | `−` PBI Embedded *citizen-facing* · `+` Chart.js + React wrappers |
| **SA-6** | Priva (GDPR DSR) | `+` Microsoft Priva (industrialises Subject Rights Requests) |
| **SA-7** | docs/biz refresh | All 10 channel/biz `.md` files re-aligned to the new stack |

**Net result:** 4 services suppressed · 9 services added · installer phases **15 → 25** · 2 future swaps documented but **not implemented** ([`§Future Recommendations`](#-future-recommendations-not-implemented-in-this-repository)).

> Full diff, DAG, sub-agent boundaries: [`plan_post_audit.md`](./docs/tech/plan_post_audit.md) §1-§6.

### 🔁 Campaign 3 — Iterative audit hardening (19 cycles · stop on CLEAN)

The commanditaire's instruction: *« on va faire ça jusqu'à ne plus rien trouver. »* Each cycle launched **3 parallel Haiku sub-agents**, with each prompt embedding the cumulative ALREADY-FIXED + hallucination-filter list from prior rounds. Stop condition: first round CLEAN on all 3 surfaces.

```mermaid
flowchart LR
    classDef agent fill:#26a69a,color:#fff,stroke:#00897b
    classDef stop fill:#43a047,color:#fff,stroke:#2e7d32
    Cycle["Cycle r<sub>n</sub>"] --> Code["code-audit<br/>apps/ + services/"]:::agent
    Cycle --> Docs["docs-audit<br/>docs/ + README.md"]:::agent
    Cycle --> Inst["installer-audit<br/>scripts/install/ + infra/"]:::agent
    Code --> Triage["Triage + verify cited lines"]
    Docs --> Triage
    Inst --> Triage
    Triage -->|defect found| Fix["Apply fix<br/>+ TestOnly 25/25<br/>+ commit + push"]
    Fix --> Cycle
    Triage -->|all 3 CLEAN| Stop["✅ r24 — STOP"]:::stop
```

| Métrique | Valeur |
|---|---|
| Cycles d'audit total (r6 → r24) | **19** |
| Sous-agents Haiku lancés | **57 runs** (3 × 19) |
| Commits de correction | **19** |
| Defects appliqués | **~28 P0 · ~30 P1 · ~5 P2** |
| Hallucinations rejetées | **~25** (7 patterns persistants filtrés à chaque round) |
| Wall-clock total (3ᵉ campagne) | **~2 h** |
| Équivalent séquentiel | **~5-6 h** |
| Première manche CLEAN | **r24** |
| Validation finale | `pwsh Install-UDCSP.ps1 -TestOnly -Environment dev` → **25/25 ✅** |

> Tableau cycle-par-cycle, patterns d'erreurs récurrents, leçons apprises : [`plan_post_audit.md`](./docs/tech/plan_post_audit.md) §7.

> [!TIP]
> **From zero to running platform in one command.** Once Wave 4 closed (and after 24 audit cycles polished every edge), an evaluator can clone the repo, run `./scripts/install/Install-UDCSP.ps1 -Environment dev -SeedSyntheticData`, sign in to Azure, and watch the federated platform — populated with realistic DK/SE/NO data in 12 languages — come up.

---

## 📚 Where to Go Next

| Audience | Start with |
|---|---|
| 📋 **The original case study** | [`docs/biz/case-study-11.md`](./docs/biz/case-study-11.md) — the immutable brief this repo answers. |
| 📚 **Business documentation** | [`docs/biz/`](./docs/biz/) — channels, AI architecture, data-compliance, demo scenarios, acceptance recipe. |
| ⚙️ **Technical documentation** | [`docs/tech/`](./docs/tech/) — deep-dive architecture, data model, install guide, build & refactor history, DR runbook. |
| 🗂️ **Both at once** | [`docs/`](./docs/) — the documentation hub. |

---

## 🚧 Future Recommendations (not implemented in this repository)

An internal architecture audit surfaced two larger replacements that would meaningfully reduce vendor lock-in but were **deliberately not implemented** in this case-study scaffolding (the case study mandates D365 and Logic Apps as part of the 9 Microsoft services). They are documented here as a forward-looking note for any team taking UDCSP into production:

| Current | Proposed replacement | Why it would be considered |
|---|---|---|
| Dynamics 365 Customer Service | Camunda 8 (BPMN/DMN) + a custom caseworker UI on Container Apps + Dataverse-free Power Apps **or** ServiceNow GovCloud | D365 is the platform's largest single vendor lock-in and is priced per-seat. The Nordic public sector is actively standardising on **BPMN 2.0** for case lifecycles. Camunda handles long-running stateful workflows and exposes **DMN** decision tables that are first-class auditable artefacts — exactly what the high-risk Eligibility Pre-Assessor (AI Act) demands. |
| Azure Logic Apps | Camunda 8 / Zeebe (chosen consistently with the D365 → Camunda move) | The headline "28 d → 4 d" SLO is a textbook BPMN case. Logic Apps remains a JSON black box; **BPMN diagrams are directly readable by lawyers and Data Protection Authorities** — a meaningful audit advantage at every renewal. |

These are forward-looking recommendations only; the implemented platform keeps Dynamics 365 Customer Service and Azure Logic Apps exactly as the case study requires.

---

<div align="center">

*UDCSP — built with Microsoft Azure and Microsoft Foundry, for the citizens of Denmark, Sweden, and Norway.* 🇩🇰 🇸🇪 🇳🇴

</div>
