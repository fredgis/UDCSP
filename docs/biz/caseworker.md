<div align="center">

# 🧑‍💼 UDCSP — The Caseworker Channel

### The back-office channel where every escalation lands and AI is supervised

*How a government caseworker opens the current model-driven Power App on shared Dataverse, reviews AI pre-assessment context, makes the final call, and prepares the future D365 Customer Service cutover.*

[![Channel](https://img.shields.io/badge/🧑‍💼_Channel-Caseworker_·_Power_App_today-1565C0?style=for-the-badge)](#)
[![Stack](https://img.shields.io/badge/🛠️_Stack-Dataverse_·_Foundry_·_D365_target-FF6F00?style=for-the-badge)](#)
[![Co‑pilot](https://img.shields.io/badge/🤖_Co‑pilot-Foundry_agents_in‑context-8957E5?style=for-the-badge)](#)
[![SLA](https://img.shields.io/badge/⏱️_SLA-28d_→_4d_·_EU_AI_Act_Art._14-2E7D32?style=for-the-badge)](#)

[![Sovereignty](https://img.shields.io/badge/🛡️_Per_country-DK_·_SE_·_NO_Dataverse-00796B?style=flat-square)](#)
[![Compliance](https://img.shields.io/badge/⚖️_GDPR_·_EU_AI_Act_·_WCAG-Human_oversight-C62828?style=flat-square)](#)
[![Mirror](https://img.shields.io/badge/🔁_Mirror-Dataverse_→_Fabric-5E35B1?style=flat-square)](#)
[![Status](https://img.shields.io/badge/🧱_Scaffold-26_files_under_apps/d365-E65100?style=flat-square)](#)

</div>

---

_Last verified: 2026-08-11 · commit f0bd850 + pending security remediation (not deployed)_

> [!IMPORTANT]
> **TL;DR.** 🟡 **Partially deployed** today: the caseworker workspace is a model-driven Power App on the shared Dataverse environment `<your-dataverse-env>` in the DK system tenant. The artefact is `apps/d365/solutions/UDCSP_Core/customizations/apps/caseworker-app.xml`, with operator notes in `apps/powerapps/caseworker/README.md`, and imports through `pac solution import`. The Logic App `application-intake` still writes live submissions to standard Dataverse `tasks`. 🗺️ **Roadmap**: per-country D365 Customer Service environments, Copilot for Service runtime, SLA timers and writes to canonical `udcsp_application`.
>
> | Field | Value |
> |---|---|
> | 🗄️ **Where stored** | 🟢 **Live** intake rows are Dataverse `tasks` in `<your-dataverse-env>`. 🟡 **Partially deployed** canonical table: `udcsp_application` is provisioned and matched by the Power App design, but the Logic App has not been repointed. 🔵 **In repo**: `udcsp_caseworker_decision` scaffold. 🗺️ **Roadmap**: D365 CS `case`, Copilot for Service chat persistence, persisted override table and Confidential Ledger write. |

| Capability | Status | Current fact |
|---|---|---|
| Caseworker workspace | 🟡 **Partially deployed** | Model-driven Power App on shared Dataverse `<your-dataverse-env>`; `pac solution import` is still pending there. |
| Per-country D365 Customer Service | 🗺️ **Roadmap** | DK, SE and NO Customer Service environments are not provisioned. |
| Current intake storage | 🟢 **Live** | `application-intake` writes standard Dataverse `tasks`. |
| Canonical target storage | 🟡 **Partially deployed** | `udcsp_application` schema and Power Fx names match the future D365 CS deployment, but the Logic App has not been repointed. |
| Caseworker helper AI | 🟡 **Partially deployed** | Foundry `caseworker-helper` agent is deployed and APIM routes to it; Copilot for Service panel is not proven live. |
| Override persistence | 🔵 **In repo** | `udcsp_caseworker_decision` is scaffolded but not persisted. No Confidential Ledger write is active. |
| Document-derived fields | 🔵 **In repo**, not deployed | The document endpoint does not read the uploaded bytes. It invents synthetic values from the filename. The pending policy labels every response with `"synthetic": true` and `"provenance": "inferred-from-filename"`. Real extraction requires Azure AI Document Intelligence. |

---

> [!CAUTION]
> **Case-detail fields are not documentary evidence.** The current deployed endpoint can show invented values without the new provenance labels. A caseworker must open the attached payslip, lease or identity document and verify it directly. EU AI Act Art. 14 oversight cannot rely on synthetic filename-derived values.

> [!NOTE]
> 🗺️ **Roadmap.** D365 Customer Service, Copilot for Service, per-country Bastion administration, CIEM checks and Confidential Ledger-backed evidence remain target architecture unless separately deployed and validated.

## 📑 Table of contents

1. [Why a caseworker channel at all](#1-why-a-caseworker-channel-at-all)
2. [The mental model in one picture](#2-the-mental-model-in-one-picture)
3. [The case lifecycle, step by step](#3-the-case-lifecycle-step-by-step)
4. [The seven building blocks](#4-the-seven-building-blocks)
5. [The AI co-pilot for caseworkers](#5-the-ai-co-pilot-for-caseworkers)
6. [The eligibility AI — recommendation, not decision](#6-the-eligibility-ai--recommendation-not-decision)
7. [Multilingual — caseworker and citizen can speak different languages](#7-multilingual--caseworker-and-citizen-can-speak-different-languages)
8. [Accessibility — caseworker workflow accessibility](#8-accessibility--caseworker-workflow-accessibility)
9. [Sovereignty — one Dataverse environment per country](#9-sovereignty--one-dataverse-environment-per-country)
10. [SLOs, risks, and mitigations](#10-slos-risks-and-mitigations)
11. [🎯 Onboarding a caseworker (training + sandbox)](#11--onboarding-a-caseworker-training--sandbox)
12. [The activation runbook](#12-the-activation-runbook)
13. [How to test it (three levels)](#13-how-to-test-it-three-levels)
14. [The demo script for a jury](#14-the-demo-script-for-a-jury)
15. [Anti-patterns we avoid](#15-anti-patterns-we-avoid)
16. [Where the caseworker activity is stored](#16-where-the-caseworker-activity-is-stored)

---

## 1. Why a caseworker channel at all

The case study (`docs/biz/case-study-11.md` § AI Infusion Point) is explicit:

> *"An **automated eligibility determination model** pre-assesses benefit entitlements **before human review**."*

That human review is not a checkbox — it is a structural requirement enforced at three levels:

- ⚖️ **Regulatory.** EU AI Act Art. 14 mandates meaningful human oversight for high-risk AI systems that produce or influence decisions on citizens' welfare, residency, and social benefits. An automated AI verdict without a human caseworker validating it is a conformity violation. Every `udcsp_eligibility_assessment` row must have a corresponding caseworker approval or override action before it becomes a citizen-facing decision.
- 🤝 **Trust.** Citizens whose residency permit or income-supplement benefit is being assessed want a human to make that call. AI speeds the preparation; the caseworker holds the pen. Casework-study satisfaction target: **+38 % CSAT** — not achievable if citizens distrust the channel that closes their case.
- 🔄 **Resolution.** Voice, web, mobile, chat, SMS-reply, and email-reply are all *front-stage* channels. They are optimised for speed and self-service. But every one of them has an "escape to human" hatch (`foundry/agents/topic-router/escalation-rules.json`), and all those hatches lead **here**. Without the caseworker channel, every complex or sensitive case becomes a dead end.
- 🔐 **Accountability.** Public sector decisions carry legal weight. A citizen denied a benefit can appeal. The caseworker channel is where the legally accountable record is created, stored, and made auditable — not the bot, not the model, but the caseworker's explicit action in D365.

The design principle, visible in the BPF (`apps/d365/solutions/UDCSP_Core/customizations/businessprocessflows/application-intake-bpf.xml`):

> *Receive → Classify → Pre-assess → **Caseworker review** → Decide*

The `Caseworker review` stage is not optional and cannot be skipped by configuration.

> [!NOTE]
> **AI-first, but supervised.** This is the phrase the case study team coined in the planning sessions. The AI does the preparation work — classification, pre-assessment, KB lookup, draft replies — so the caseworker can focus entirely on the judgment call. The caseworker is not a rubber stamp; they are the decision maker. The AI is the analyst. This distinction is the foundation of UDCSP's EU AI Act conformity argument.

The escalation rules (`foundry/agents/topic-router/escalation-rules.json`) define four paths that reach the caseworker channel: low-confidence classifier output (`classifierConfidence < 0.70`), high-risk topics requiring a formal decision (`social-benefit`, `residency-application`), explicit citizen request (`userIntent == 'escalate-to-human'`), and accessibility-flagged cases routed to the `accessibility-help` priority queue. All four paths converge on D365.

The `escalate-to-human` Foundry `topic-router` topic (`foundry/agents/topic-router/topics/escalate-to-human.yaml`) is localised across all 12 languages — a citizen can trigger the escalation in any supported language and the handover context is preserved verbatim in that language inside the D365 case.

---

## 2. The mental model in one picture

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 28, 'rankSpacing': 35, 'padding': 6 }, 'themeVariables': { 'fontSize': '13px' } } }%%
flowchart TB
    subgraph FRONT["📡 Front-stage channels"]
        VOICE["📞 Voice<br/><i>ACS + Foundry `topic-router`</i>"]
        WEB["🌐 Web<br/><i>Static Web App</i>"]
        MOBILE["📱 Mobile<br/><i>iOS · Android</i>"]
        CHAT["💬 Chat<br/><i>Foundry `topic-router` chat</i>"]
        SMS["📩 SMS-reply"]
        EMAIL["📧 Email-reply"]
    end

    subgraph ESC["⚡ Escalation layer"]
        RULES["Escalation rules<br/><i>foundry/agents/topic-router/<br/>escalation-rules.json</i>"]
        FLOW["Power Automate<br/><i>escalation-to-human.json</i>"]
    end

    subgraph D365["🏢 D365 Customer Service per country (roadmap)<br/>· today: model-driven Power App on shared Dataverse <code><your-dataverse-env></code> ·"]
        CASE["Case row<br/><i>tasks today · udcsp_application target</i>"]
        QUEUE["Caseworker queue<br/><i>country · language · service-type</i>"]
        UI["Caseworker UI<br/><i>Power App today · D365 web client target</i>"]
        CFS["Copilot for Service<br/><i>in-context AI panel (roadmap)</i>"]
    end

    subgraph BACK["📊 Back-office outcomes"]
        NOTIFY["citizen-status-notify<br/><i>SMS + email + push</i>"]
        FABRIC["Fabric mirror<br/><i>per-country lakehouse</i>"]
        AUDIT["AI Act audit row<br/><i>Purview + Foundry trace</i>"]
    end

    VOICE & WEB & MOBILE & CHAT & SMS & EMAIL --> RULES
    RULES --> FLOW --> CASE --> QUEUE --> UI --> CFS
    CFS --> UI
    UI -->|resolve| NOTIFY
    UI --> FABRIC
    UI --> AUDIT

    classDef front fill:#0078d4,stroke:#004578,color:#fff
    classDef esc fill:#e36209,stroke:#c24e00,color:#fff
    classDef d365 fill:#8957e5,stroke:#6e40c9,color:#fff
    classDef back fill:#1565c0,stroke:#0d47a1,color:#fff

    class VOICE,WEB,MOBILE,CHAT,SMS,EMAIL front
    class RULES,FLOW esc
    class CASE,QUEUE,UI,CFS d365
    class NOTIFY,FABRIC,AUDIT back
```

> 📖 **Reading the picture.** Blue = front-stage channels. Orange = escalation layer (the bridge). Purple = D365 caseworker stack. Dark blue = back-office outcomes. **The caseworker channel is the convergence point — every escalation path leads here.**

The voice channel (`docs/biz/voice.md`) does not end with a live warm transfer today. Demo 2 v1 offers a callback because D365 Customer Service NO is not provisioned. In the future transfer path, the case should carry a purpose-built summary, detected locale, citizen intent and relevant slot-fill data. It must not depend on a transcript copied from monitoring telemetry. The pending voice logger keeps transcript lengths only.

The Foundry `topic-router` `escalate-to-human` topic (`foundry/agents/topic-router/topics/escalate-to-human.yaml`) invokes the `d365-escalation` connector (`foundry/agents/topic-router/connections/d365-escalation.json`) to create the case before the agent hands off. By the time a caseworker picks up the case, the AI context is already there.

---

## 3. The case lifecycle, step by step

```mermaid
%%{ init: { 'sequence': { 'mirrorActors': false, 'actorMargin': 30 }, 'themeVariables': { 'fontSize': '12px' } } }%%
sequenceDiagram
    autonumber
    actor BOT as 🤖 Foundry `topic-router` bot
    participant PA as ⚙️ Logic App / Power Automate
    participant D365 as 🏢 Dataverse task today
    participant ELI as 🧠 Eligibility model
    participant CW as 🧑‍💼 Caseworker
    participant CFS as 🤖 Foundry helper today<br/>Copilot target
    participant ACS as 📩 ACS notify
    participant FAB as 📊 Fabric mirror

    BOT->>PA: escalation trigger (full context + traceparent)
    PA->>D365: create task row today<br/>udcsp_application target
    D365->>D365: parse task description today<br/>dedicated columns target
    D365->>ELI: ai-pre-assessment-on-create.json fires
    ELI-->>D365: recommendation + confidence + reasoning + KB citations
    Note over D365: case sits in queue with AI pre-assessment attached
    CW->>D365: opens model-driven Power App view
    CW->>CFS: "Summarise this case for me"
    CFS-->>CW: one-paragraph summary in caseworker language
    CW->>CFS: "What does the policy say about X?"
    CFS-->>CW: cited KB article + policy paragraph
    CW->>D365: approves AI recommendation (or overrides with justification)
    D365->>PA: status change triggers citizen-status-notify.json
    PA->>ACS: SMS + email to citizen in citizen's language
    ACS-->>BOT: outbound notification sent
    D365->>FAB: dataverse-to-fabric-mirror syncs resolution row
    FAB->>FAB: Foundry eval trace + AI Act audit row appended
```

**Time budget** (target: case resolved in ≤ 4 business days p95):

| Phase | Budget | How we hit it |
|---|---|---|
| Escalation → case creation | < 30 s | 🟢 **Live** citizen intake uses Logic App to Dataverse `tasks`; D365 case creation is 🗺️ **Roadmap** |
| AI pre-assessment attached | < 2 min | `ai-pre-assessment-on-create` fires on Dataverse `Create` event |
| Queue routing to caseworker | < 1 business hour | SLA KPI `FirstResponse` = `P1D`; sla-risk-alert fires at 75 % |
| Caseworker review + decision | ≤ 4 business days | 🗺️ **Roadmap** SLA KPI `ResolveBy` = `P4D` once D365 CS is installed |
| Citizen notification | < 5 min after resolve | `citizen-status-notify` triggered on case status change |
| Fabric mirror sync | < 15 min | 🗺️ **Roadmap** near-real-time Dataverse Link to Fabric |
| AI Act audit row | < 15 min | 🟡 **Partially deployed** Foundry trace exists for exercised paths; Confidential Ledger override write is not active |

The sequence also covers the **failure path**: if the eligibility model returns a confidence below the 0.70 threshold, the `escalation-to-human` flow skips the pre-assessment step and routes directly to a caseworker with a flag on the case — no citizen waits for a model that can't decide.

---

## 4. The seven building blocks

| # | Block | What it does | Where it lives |
|:-:|---|---|---|
| **1** | **`UDCSP_Core` solution + 4 entities** | 🟡 **Partially deployed** target schema: `udcsp_application`, `udcsp_consent_record`, `udcsp_country_zone`, `udcsp_eligibility_assessment`. Live intake still writes `tasks`. | `apps/d365/solutions/UDCSP_Core/solution.xml`, `customizations/entities/` |
| **2** | **Per-country solutions `UDCSP_DK / SE / NO`** | 🗺️ **Roadmap** country-specific queue names, local terminology and dependency on Core after per-country D365 CS exists. | `apps/d365/solutions/UDCSP_{DK,SE,NO}/country-overrides.json` |
| **3** | **Business process flow `application-intake-bpf`** | 🔵 **In repo** five locked stages: Receive → Classify → Pre-assess → Caseworker review → Decide. D365 runtime activation is 🗺️ **Roadmap**. | `customizations/businessprocessflows/application-intake-bpf.xml` |
| **4** | **Caseworker views + queues** | 🔵 **In repo** views and queues. Per-country D365 queue activation is 🗺️ **Roadmap**. | `customizations/views/caseworker-views.xml`, `customizations/queues/case-queues.xml` |
| **5** | **SLA `four-day-sla`** | 🗺️ **Roadmap** D365 CS SLA: `FirstResponse` KPI fails after `P1D`, `ResolveBy` after `P4D`. | `customizations/sla/four-day-sla.xml` |
| **6** | **Caseworker helper prompts** | 🟡 **Partially deployed** Foundry `caseworker-helper` agent exists and APIM routes to it. Copilot for Service prompt import is 🗺️ **Roadmap**. | `customizations/copilot-for-service/prompts.xml`, `foundry/agents/caseworker-helper/` |
| **7** | **Power Automate flows × 5** | 🔵 **In repo** target flows for escalation, AI pre-assessment, citizen notification, SLA risk and Fabric mirror. Live citizen intake currently uses Logic App `application-intake`. | `apps/d365/power-automate-flows/` |
| **8** | **Dataverse → Fabric mirror** | 🗺️ **Roadmap** tables `udcsp_application`, `udcsp_eligibility_assessment`, `udcsp_country_zone`, `udcsp_consent_record` mirrored to per-country Fabric. Purview lineage is not live while the endpoint is `placeholder.local`. | `apps/d365/dataverse-to-fabric-mirroring/mirror-config.json` |

The eight blocks divide naturally into two layers: **Foundation** (blocks 1–2, the Dataverse schema and country customisations — must be deployed first) and **Orchestration** (blocks 3–8, the runtime behaviour — deployable incrementally after foundation).

Two cross-cutting concerns:

| | Concern | Where |
|:-:|---|---|
| 📜 | **Correlation thread** — every case carries a `udcsp_traceparent` (W3C trace context) that links the Foundry `topic-router` conversation, the Power Automate flows, the Foundry eligibility trace, and the Fabric mirror row into a single observable request chain. | `apps/d365/solutions/UDCSP_Core/customizations/entities/udcsp_application.xml` |
| 🔐 | **Consent gating** — citizen consent for data processing is modelled in `udcsp_consent_record` and checked by `citizen-status-notify` before any outbound communication. Notifications are suppressed if consent has expired or been withdrawn. | `apps/d365/solutions/UDCSP_Core/customizations/entities/udcsp_consent_record.xml` |

## 5. The AI co-pilot for caseworkers

🟡 **Partially deployed** today: the `udcsp-caseworker-helper` Foundry agent is deployed and APIM routes to it. 🗺️ **Roadmap**: a persistent Copilot for Service panel docked inside a D365 Customer Service case form. Do not describe Copilot for Service as live until the repo or tenant evidence proves that runtime.

> ⚠️ **Today's caseworker surface is a shared model-driven Power App on Dataverse `<your-dataverse-env>`** — the per-country D365 Customer Service envs are not yet provisioned. The `udcsp_application` schema, Power Fx form and column logical names match what the future D365 deployment will use, so the artefact is a drop-in. See [`../tech/inprogress.md`](../tech/inprogress.md) § "Caseworker UI strategy".

🟢 **Live storage constraint.** `application-intake` writes to the standard `tasks` activity entity today. The task `description` field creates a 2000-character practical truncation issue, so the SPA carries a 3-tier `descriptionParser.ts` compatibility layer to recover fields from old rows. Repointing the Logic App to `udcsp_applications` after D365 CS is installed removes that truncation path because the target table has dedicated columns.

The five runtime prompts (two scaffolded in `prompts.xml`, three added at import time):

| Prompt | What the caseworker types | What the AI returns |
|---|---|---|
| **summarize-application** | *(auto-triggered on case open)* | One paragraph: citizen situation, AI pre-assessment verdict, evidence gaps, SLA risk |
| **draft-citizen-reply** | "Draft an update for this citizen" | Accessible plain-language reply in the citizen's preferred language; caseworker edits before sending |
| **suggest-next-action** | "What should I do next?" | Prioritised action list: missing documents, related cases, policy citation |
| **explain-eligibility** | "Why did the model say ineligible?" | Step-by-step reasoning trace from `udcsp_eligibility_assessment` — confidence, features, KB citations |
| **cite-policy** | "What does Article X say?" | Verbatim policy paragraph + source URL from the multilingual knowledge base |

The agent's knowledge sources are the same Foundry KB indices used by the citizen-assistant. 🔵 **In repo** caseworker prompts add the `d365-case-reader` tool so the agent can read the target case record, and the `draft-response-writer` tool so it can propose outbound messages.

Content safety is applied on both input and output (`azure-ai-content-safety-standard`). The `blockCategories` list includes `pii_exfiltration` — the co-pilot cannot be prompted into leaking citizen data outside the case context. The evaluation suite (`foundry/evaluations/eval-suites/caseworker-helper.yaml`) is run on every Foundry agent release to guarantee non-regression on summary quality, draft accuracy, and policy citation precision.

> [!NOTE]
> **Every AI suggestion is opt-in.** The caseworker accepts, edits, or rejects each AI output. 🗺️ **Roadmap** Copilot for Service and D365 send controls are activated after the per-country Customer Service environments exist.

---

## 6. The eligibility AI — recommendation, not decision

The **Eligibility Pre-Assessor** (`foundry/agents/eligibility/agent.yaml`) is classified as a **high-risk AI system** under the EU AI Act (`governance/ai-act/registry/eligibility-model.yaml`). Its role is strictly advisory:

🟡 **Partially deployed** today: eligibility pre-assessment is invoked from the citizen portal and the verdict travels in the submit payload. The caseworker disposal surface is the model-driven Power App. The Logic App still writes `tasks`, so reads from `udcsp_application` and linked `udcsp_eligibility_assessment` rows are target architecture until the repoint is done.

1. On case creation, the `ai-pre-assessment-on-create` Power Automate flow invokes the eligibility model via APIM.
2. The model reads the `udcsp_application` record, retrieves validated policy reference data from Fabric silver, and produces:
   - `udcsp_recommendation` (Eligible / Ineligible / Needs more information)
   - `udcsp_confidence` (decimal 0–1)
   - Reasoning trace (step-by-step feature attribution)
   - Cited policy articles (from the multilingual KB)
3. All four fields are written to a new `udcsp_eligibility_assessment` row, which is linked to the case and immediately visible in the caseworker view.
4. The caseworker reviews, and **must** take one of: approve / override / request more information. The BPF `Caseworker review` stage does not advance until this action is recorded.
5. Every override captures a justification text plus a classification code (missing document / new evidence / policy interpretation / other) — these become training signal for the next evaluation cycle.

From the AI Act registry (`governance/ai-act/registry/eligibility-model.yaml`):

> `humanOversight: "Caseworker must review and can override every recommendation before a citizen-facing decision."`

Fairness metrics enforced quarterly: equal opportunity difference by country ≤ 0.05, language accuracy variance ≤ 3 pp, override rate reviewed monthly. Severe incidents escalated within 72 hours.

An override record in Dataverse looks like this (simplified):

```json
{
  "udcsp_name": "Override-2026-05-08-NO-1234",
  "udcsp_applicationid": "<case-guid>",
  "udcsp_recommendation": "Eligible",
  "udcsp_confidence": 0.71,
  "udcsp_aiActRegistryId": "eligibility-model/v3",
  "udcsp_lineageId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

The `udcsp_lineageId` is the W3C `traceparent` carried from the original Foundry `topic-router` conversation — it is the thread that makes every AI decision replay-able by an auditor a year later (see Demo 7 in [`uses.md`](./uses.md#️-demo-7--hans-the-dpo-audits-a-six-month-old-ai-decision)).

> [!IMPORTANT]
> **Override = training data.** Caseworker overrides are not exceptions — they are the most valuable signal in the system. Override rate by case type is a live KPI on the executive dashboard, not a hidden metric.

---

## 7. Multilingual — caseworker and citizen can speak different languages

The case carries two language fields: `citizenLanguage` (set at escalation time from the Foundry `topic-router` conversation locale) and `caseworkerLanguage` (set from the caseworker's Entra ID profile locale). These can differ — and often do.

| Scenario | What happens |
|---|---|
| Citizen in PL, caseworker in SV | 🗺️ **Roadmap** Copilot for Service auto-presents the case narrative in SV; draft citizen reply is proposed in PL |
| Citizen in AR, caseworker in DA | KB search returns DA articles for the caseworker; outbound draft is in AR with RTL formatting |
| Citizen and caseworker both in NB | No translation required; native pass-through |
| Citizen in UK, caseworker in EN | Foundry translator bridges UK → EN for the case narrative |

The Foundry `translator` agent (`foundry/agents/translator/`) handles the translation pipeline. All 12 case-study languages are supported: Danish (DA), Swedish (SV), Norwegian Bokmål (NB), Norwegian Nynorsk (NN), Northern Sámi (SE), German (DE), French (FR), Polish (PL), Arabic (AR), Ukrainian (UK), Finnish (FI), and English (EN).

The `caseworker-helper` agent (`agent.yaml`) lists all 12 locales in its `languages` field — the co-pilot is language-neutral from the caseworker's perspective. Outbound citizen notifications (`citizen-status-notify.json`) are rendered from the citizen's language template, regardless of which country queue resolved the case.

> [!NOTE]
> **Civic-term awareness.** The Foundry KB is indexed with country-specific civic terminology (`personnummer` for SE, `CPR-nummer` for DK, `fødselsnummer` for NO) so that caseworker queries using national terms hit the right KB chunks. The same lexical awareness that powers the voice channel STT is present in the caseworker co-pilot knowledge search.

---

## 8. Accessibility — caseworker workflow accessibility

Caseworkers themselves may have disabilities. UDCSP is built to that bar:

- ♿ **WCAG 2.1 AA** — 🗺️ **Roadmap** D365 web client accessibility applies after Customer Service is installed. The current Power App should be tested in `<your-dataverse-env>` after import.
- ⌨️ **Keyboard-only case navigation** — 🔵 **In repo** queue views, case forms and BPF stage controls are standard Dataverse metadata; Copilot for Service panel validation is 🗺️ **Roadmap**.
- 🔊 **Screen-reader-friendly queue views** — the `My Open Cases`, `SLA-Risk`, and `AI Pre-assessed` saved queries in `caseworker-views.xml` are implemented as standard Dataverse grids with proper ARIA roles and column headers.
- 🎯 **Focus-visible on AI suggestions panel** — 🗺️ **Roadmap** Copilot for Service panel controls are validated after runtime activation.
- 🎞️ **Reduced-motion respected** — the BPF stage-progress animation respects `prefers-reduced-motion: reduce` via the D365 theming layer.
- 🖋️ **High-contrast mode** — D365's built-in high-contrast theme is tested in CI against the three custom entities and the Copilot panel via axe-core.

The `accessibility-help` queue (`case-queues.xml`) is 🔵 **In repo** as a cross-country priority queue for cases where the citizen has signalled an accessibility need. Copilot for Service plain-language drafting is 🗺️ **Roadmap**.

Accessibility is not just a citizen concern — caseworkers with low vision, motor impairments, or cognitive load differences use this channel all day, every day. UDCSP is designed to the same bar for both sides of the service window.

---

## 9. Sovereignty — one Dataverse environment per country, one mirror per country, one queue tree per country

🗺️ **Roadmap.** This is the target country-split model. 🟡 **Partially deployed** today, the shared DK system tenant Dataverse environment `<your-dataverse-env>` hosts the model-driven Power App stance until per-country D365 Customer Service environments exist.

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 25, 'rankSpacing': 30 }, 'themeVariables': { 'fontSize': '12px' } } }%%
flowchart LR
    subgraph DK["🇩🇰 Denmark"]
        DV_DK["Dataverse DK<br/><i>UDCSP_Core + UDCSP_DK</i>"]
        Q_DK["Queues: residency-DK<br/>tax-DK"]
        AAD_DK["Entra group<br/><i>CaseworkersDK</i>"]
        FAB_DK["Fabric DK workspace<br/><i>mirror + analytics</i>"]
        SLA_DK["SLA DK<br/><i>P1D / P4D</i>"]
    end
    subgraph SE["🇸🇪 Sweden"]
        DV_SE["Dataverse SE<br/><i>UDCSP_Core + UDCSP_SE</i>"]
        Q_SE["Queues: residency-SE<br/>tax-SE"]
        AAD_SE["Entra group<br/><i>CaseworkersSE</i>"]
        FAB_SE["Fabric SE workspace<br/><i>mirror + analytics</i>"]
        SLA_SE["SLA SE<br/><i>P1D / P4D</i>"]
    end
    subgraph NO["🇳🇴 Norway"]
        DV_NO["Dataverse NO<br/><i>UDCSP_Core + UDCSP_NO</i>"]
        Q_NO["Queues: residency-NO<br/>social-NO"]
        AAD_NO["Entra group<br/><i>CaseworkersNO</i>"]
        FAB_NO["Fabric NO workspace<br/><i>mirror + analytics</i>"]
        SLA_NO["SLA NO<br/><i>P1D / P4D</i>"]
    end

    DV_DK --> FAB_DK
    DV_SE --> FAB_SE
    DV_NO --> FAB_NO

    classDef dk fill:#C8102E,stroke:#7a0a1c,color:#fff
    classDef se fill:#006AA7,stroke:#003d61,color:#fff
    classDef no fill:#BA0C2F,stroke:#7a081e,color:#fff

    class DV_DK,Q_DK,AAD_DK,FAB_DK,SLA_DK dk
    class DV_SE,Q_SE,AAD_SE,FAB_SE,SLA_SE se
    class DV_NO,Q_NO,AAD_NO,FAB_NO,SLA_NO no
```

What stays in-country: **all case data, eligibility assessments, consent records, AI traces, and Fabric mirror**. What is shared cross-country: **the `UDCSP_Core` solution definition** (schema) and **the Foundry agent definitions** (the brain). The data never crosses the border.

Cross-border collaboration is **forbidden by default**. A DK caseworker cannot query an SE case. Any cross-country lookup goes through APIM with an explicit `cross-border-consent` claim validated against `udcsp_consent_record`.

The per-country queue trees (`apps/d365/solutions/UDCSP_{DK,SE,NO}/country-overrides.json`) define not just queue names but also localised terminology: DK calls it *Bopæl*, SE calls it *Folkbokföring*, NO calls it *Folkeregister*. These terminology overrides surface in BPF stage labels and caseworker view column headers — a Norwegian caseworker never sees a Swedish term. This is not cosmetic; it is a compliance requirement under each country's administrative law.

---

## 10. SLOs, risks, and mitigations

| | SLO | Target | How we measure |
|:-:|---|---|---|
| ⚡ | **Time-to-first-touch** (case assigned → caseworker opens it) | ≤ **1 business hour** p95 | 🗺️ **Roadmap** SLA KPI `FirstResponse` in D365; `sla-risk-alert` fires at 75 % |
| 🎯 | **Case resolution** | ≤ **4 business days** p95 | 🗺️ **Roadmap** SLA KPI `ResolveBy`; Power BI per-country KPI tile |
| 🤖 | **AI-suggestion acceptance rate** | Track; guarantee non-degradation | `caseworker-helper` eval suite in `foundry/evaluations/eval-suites/caseworker-helper.yaml` |
| 😊 | **Caseworker satisfaction with co-pilot** | ≥ **4 / 5** CSAT | Post-session survey embedded in D365 (A15 synthetic baseline; prod live survey) |
| 📋 | **AI Act audit completeness** | **100 %** of eligibility decisions have an `udcsp_eligibility_assessment` row with caseworker action | 🗺️ **Roadmap** Purview compliance dashboard + automated nightly check |
| 🔁 | **Fabric mirror lag** | ≤ 15 min p95 | 🗺️ **Roadmap** Dataverse Link to Fabric latency metric in Fabric monitoring |
| 🛡️ | **Cross-border data isolation** | Zero cross-country data reads without explicit consent claim | APIM policy audit log scanned nightly for `cross-border-consent` violations |

Risks tracked in `docs/tech/plan.md` (A8 / A11 risk register):

| Risk | Mitigation |
|---|---|
| **AI overreliance** — caseworker rubber-stamps without reading | Override-rate KPI visible on exec dashboard; EU AI Act Art. 14 training mandatory at onboarding; BPF `Caseworker review` stage requires explicit action field |
| **Case-data sprawl** — PII leaking across country boundaries | Purview sensitivity labels on all four core entities; per-country Dataverse environment; APIM cross-border guard |
| **Training drift** — eligibility model degrades over time | Foundry eval pipeline runs monthly against caseworker-labelled gold set per country and language; severe drift triggers model rollback |
| **SLA breach cascade** — a queue surge breaches all SLAs at once | `sla-risk-alert.json` fires at 75 % of the window; Power Automate re-routes overflow cases to a standby queue; supervisor dashboard shows real-time SLA heat map |

---

## 11. 🎯 Onboarding a caseworker (training + sandbox)

A new caseworker goes live through six concrete steps:

1. **AAD group membership** — the caseworker's work account is added to the correct country group (`CaseworkersDK`, `CaseworkersSE`, or `CaseworkersNO`) in Entra ID. This is the only step required to grant D365 environment access.
2. **D365 security role assignment** — 🗺️ **Roadmap** the `UDCSP Caseworker` security role is assigned in the target Dataverse environment. The role grants read/write on the four core entities, queue access to the country queues, and read-only access to `udcsp_eligibility_assessment`.
3. **Sandbox environment with synthetic cases** — the caseworker logs in to the DEV or UAT environment seeded with `Install-UDCSP.ps1 -SeedSyntheticData`. The `data/synthetic/` dataset includes ~200 realistic cases across all case types and all 12 languages — enough to rehearse every BPF path.
4. **Copilot for Service trial week with shadowing** — 🗺️ **Roadmap** after Copilot for Service is activated, the caseworker spends the first five working days processing synthetic cases alongside a senior colleague.
5. **AI Act registry briefing + EU AI Act Art. 14 training** — mandatory 45-minute module covering: what the eligibility model does, what `riskLevel: high` means for the caseworker's legal responsibility, how to complete an override record correctly, and how to read the AI Act audit dashboard.
6. **Production go-live with progressive case load** — first week: 10 cases / day (monitored); second week: 30 cases / day; third week: full queue. Override rates and CSAT are tracked per caseworker during the ramp period.

The ramp schedule is tracked in the per-country Dataverse environment. A supervisor Power BI tile shows each new caseworker's daily throughput, override rate, and CSAT score during the ramp, with automated alerts if any metric is out of band.

> [!TIP]
> **The sandbox is seeded with adversarial cases.** The A15 synthetic data generator (`data/synthetic/`) deliberately includes edge cases designed to trigger the override path — low-confidence eligibility verdicts, cases with missing documents, cross-language cases. New caseworkers are encouraged to override freely during training; every override is a learning opportunity for both the caseworker and the model.

---

## 12. The activation runbook

🗺️ **Roadmap** for per-country D365 Customer Service. 🟡 **Partially deployed** current action is to import the model-driven Power App XML into `<your-dataverse-env>`, then keep the same schema for drop-in replacement later.

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 25, 'rankSpacing': 30 }, 'themeVariables': { 'fontSize': '12px' } } }%%
flowchart TB
    P0["✅ Pre-reqs<br/><i>Foundry + APIM + Foundry `topic-router` bot live</i>"]
    P1["1️⃣ Import current Power App<br/><i>pac solution import into <your-dataverse-env></i>"]
    P2["2️⃣ Deploy per-country solutions<br/><i>UDCSP_DK · UDCSP_SE · UDCSP_NO</i>"]
    P3["3️⃣ Import Power Automate flows × 5<br/><i>wire dataverseConnection + fabricWorkspaceId</i>"]
    P4["4️⃣ Wire D365 ↔ APIM ↔ Foundry<br/><i>Connection references + shared_commondataserviceforapps</i>"]
    P5["5️⃣ Activate Dataverse-to-Fabric mirror<br/><i>mirror-config.json per country</i>"]
    P6["6️⃣ Import Copilot for Service prompts<br/><i>prompts.xml + caseworker-helper agent registration</i>"]
    P7["7️⃣ Assign caseworker security roles<br/><i>UDCSP Caseworker role × 3 country AAD groups</i>"]
    P8["8️⃣ Smoke-test<br/><i>pwsh apps/d365/scripts/Test-D365.ps1</i>"]
    P9["✅ Phase complete — cases can land and be resolved"]

    P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8 --> P9

    style P0 fill:#1565c0,stroke:#0d47a1,color:#fff
    style P9 fill:#2ea44f,stroke:#238636,color:#fff
    style P4 fill:#e36209,stroke:#c24e00,color:#fff
```

All steps P1–P7 are automated by `scripts/install/modules/Install-D365.psm1` (phase 8 of the master installer). The only decision point is **step P4** — connection references require a human to select the correct Dataverse environment URL and Fabric workspace ID for each country (`Config.D365EnvironmentUrls[DK/SE/NO]`).

The installer logs each step to `install-d365.log`:

```
[scaffold] pac solution import --path apps/d365/solutions/UDCSP_Core --environment https://org-dk.crm4.dynamics.com/
[scaffold] pac solution import --path apps/d365/solutions/UDCSP_DK --environment https://org-dk.crm4.dynamics.com/
[scaffold] pac solution import --path apps/d365/solutions/UDCSP_Core --environment https://org-se.crm4.dynamics.com/
[scaffold] pac solution import --path apps/d365/solutions/UDCSP_SE --environment https://org-se.crm4.dynamics.com/
[scaffold] pac solution import --path apps/d365/solutions/UDCSP_Core --environment https://org-no.crm4.dynamics.com/
[scaffold] pac solution import --path apps/d365/solutions/UDCSP_NO --environment https://org-no.crm4.dynamics.com/
```

Core is always imported before the country solution — `UDCSP_DK/SE/NO` each have `"dependsOn": "UDCSPCore"` in their `country-overrides.json`.

---

## 13. How to test it (three levels)

| Level | Command | What it proves | Lead time |
|---|---|---|---|
| **🚦 Smoke (isolated)** | `pwsh apps/d365/scripts/Test-D365.ps1 -EnvironmentUrl $url -AccessToken $token` | 🔵 **In repo** target D365 smoke. Current shared Power App import into `<your-dataverse-env>` should be validated manually after `pac solution import`. | < 60 s |
| **🧪 E2E (Playwright)** | `npx playwright test tests/e2e/tests/scenario-05-astrid-caseworker.spec.ts` | Escalates a synthetic chat to the SE caseworker queue; asserts the D365 case appears with AI pre-assessment; asserts Copilot summary is rendered; asserts override action is logged to Foundry trace. | ~ 3 min |
| **👤 Live (real caseworker)** | Real caseworker logs in to the model-driven Power App in `<your-dataverse-env>` | 🟡 **Partially deployed** human experience: Power App caseworker workspace over the shared Dataverse environment. Copilot panel, D365 SLA and Fabric mirror are 🗺️ **Roadmap**. | Manual, ~20 min |

The smoke script (`apps/d365/scripts/Test-D365.ps1`) requires `-EnvironmentUrl` and `-AccessToken`. Both are emitted by `Deploy-D365.ps1` into the install log so the test-run can be chained immediately after deployment without manual credential gathering.

The E2E spec (`tests/e2e/tests/scenario-05-astrid-caseworker.spec.ts`) maps to eval-matrix rows 3, 7, 9, 13, 14, 15, 16, and 17. It uses the `personas` fixture (Astrid Lindgren, SE) and the `signInWithExternalIdTestToken` helper — no production credentials are needed in CI. The `traceparent` propagated through the test binds the Playwright span to the Foundry trace, enabling full observability of the test run in Application Insights.

> [!NOTE]
> The Playwright scenario covers the **happy path** (approval). A separate adversarial spec (`scenario-06-eligibility-human-loop`) exercises the override path and is also in `tests/e2e/tests/`.

---

## 14. The demo script for a jury

5 beats, ~7 minutes. Use the 🟡 **Partially deployed** Power App stance for current demos and keep the D365 CS flow below as target narration.

| Beat | Action | What the jury sees | Eval-matrix rows hit |
|:-:|---|---|---|
| 1 | Open a seeded NO case representing Demo 2 aftermath, with a purpose-built intake summary and AI pre-assessment verdict "likely eligible, confidence 0.82". Do not present an ACS transcript from monitoring. | `social-NO` queue; SLA countdown started; AI assessment panel visible | #3 (28d→4d) · #16 (caseworker) |
| 2 | Caseworker opens the workspace; Foundry caseworker helper can provide the summary path today, while Copilot for Service is 🗺️ **Roadmap** | One-paragraph summary target; evidence checklist target; SLA risk target | #6 (GenAI assist) · #13 (multilingual) |
| 3 | Caseworker asks: *"Hva sier loven om inntektsgrensen?"* (NB) | Copilot cites the correct NAV policy article in NB, with a direct link | #6 · #15 (audit) |
| 4 | Caseworker clicks **Approve** — one click, one confirmation | Outbound SMS + email sent to Lars in NB; BPF advances to **Decide** | #3 · #4 (CSAT) · #13 |
| 5 | Jury switches to Power BI / Fabric NO workspace | Resolution row in Fabric bronze; Foundry trace visible; AI Act audit row appended with `action: approved` | #10 (sovereignty) · #15 · #9 (GDPR/AI Act) |

This corresponds to **Demo 5** and **Demo 6** in [`uses.md`](./uses.md#️-demo-5--astrid-the-caseworker-triages-a-queue-with-copilot-for-service).

#### 💡 Talking points for the jury

- 💬 *"Lars submitted by voice. The case carries a purpose-built intake summary, the AI assessment and a countdown. It does not rely on a transcript harvested from monitoring."*
- 💬 *"Copilot drafts; the caseworker disposes. **No outbound message leaves D365 without a human in the loop** — this is not a configuration option, it is an architectural constraint."*
- 💬 *"Switch to the Power BI audit tile — the AI Act audit row is there in real time. That is what 'meaningful human oversight' looks like under EU AI Act Art. 14."*

> [!TIP]
> For maximum jury impact, run beat 3 twice: once where the caseworker **approves** (normal path) and once where they **override** with a justification. The second run makes the AI Act compliance story tangible — the override is written to the AI Act registry in real time.

---

## 15. Anti-patterns we avoid

| ❌ Anti-pattern | ✅ What we do instead |
|---|---|
| Let the AI auto-decide (skip caseworker review) | `Caseworker review` BPF stage is mandatory; `udcsp_eligibility_assessment` requires a caseworker action field before `Decide` stage |
| Share one D365 environment across countries | One Dataverse environment per country, enforced by `Install-D365.psm1` and AAD group separation |
| Ignore the override signal | Override rate is a live exec KPI; every override feeds the Foundry monthly eval cycle |
| Put the AI co-pilot outside the case context | 🔵 **In repo** `d365-case-reader` target tool keeps assistance tied to the case record; Copilot for Service panel is 🗺️ **Roadmap** |
| Email-to-case without classification | `escalation-to-human.json` routes to `accessibility-help` or the correct country/skill queue — no unclassified inbox |
| Let citizen-language drift from caseworker reply | Copilot drafts the outbound reply in the **citizen's** language; caseworker cannot inadvertently reply in their own language without editing the draft |
| No SLA timer | `four-day-sla.xml` starts the SLA KPI the moment the case is created; `sla-risk-alert.json` fires at 75 % of the failure window |
| No AI Act audit row | Every `udcsp_eligibility_assessment` is mirrored to Fabric and tagged in the Purview AI Act registry; completeness is checked nightly |
| Caseworker training without adversarial cases | The sandbox is seeded with adversarial synthetic cases that force override decisions; caseworkers who never override in training are flagged for a follow-up session |
| Deploy country solutions without Core | `country-overrides.json` declares `"dependsOn": "UDCSPCore"`; the installer enforces this order for all three countries |

---

## 16. Where the caseworker activity is stored

The caseworker channel is the legally accountable system of record. 🟢 **Live** today, intake data lands in Dataverse `tasks`. 🟡 **Partially deployed** target schema, the `udcsp_application` table and Power App logical names are aligned for the D365 CS repoint. 🔵 **In repo** `udcsp_caseworker_decision` is scaffolded but not persisted. Copilot for Service conversations and Confidential Ledger override evidence are 🗺️ **Roadmap**.

| What | Where | Retention |
|---|---|---|
| Current intake state | 🟢 **Live** Dataverse `tasks` in `<your-dataverse-env>` | 10 years target |
| Target case state + actions | 🗺️ **Roadmap** Dataverse `case` + `case_audit` in per-country D365 CS | 10 years |
| Human override | 🔵 **In repo** `udcsp_caseworker_decision` scaffold; no persisted override or Confidential Ledger write yet | 10 years / case retention target |
| Copilot for Service chat | 🗺️ **Roadmap** Dataverse `bot_session` | 6 months hot; 6 years OneLake |
| AI traces + precedents | 🟡 **Partially deployed** App Insights traces for exercised paths; OneLake Gold precedents are target | Traces 180 days hot; precedents anonymised |

For the full retention matrix, use [`../tech/data.md`](../tech/data.md) § 5.

> 📖 Full storage architecture and retention rules: see [`../tech/data.md`](../tech/data.md).

---

<div align="center">

*The caseworker channel is where AI meets accountability — every recommendation supervised, every decision audited.*  🇩🇰 🇸🇪 🇳🇴

[![Demo](https://img.shields.io/badge/▶_Live_demo-Demo_5_·_Astrid_caseworker-1565C0?style=for-the-badge)](./uses.md#️-demo-5--astrid-the-caseworker-triages-a-queue-with-copilot-for-service)
[![Build agent](https://img.shields.io/badge/🤖_Build-A8_·_apps/d365/-FF6F00?style=for-the-badge)](../tech/agents.md)
[![Install phase](https://img.shields.io/badge/⚙️_Install-Phase_8_·_Install--D365.psm1-2E7D32?style=for-the-badge)](../tech/installation.md)

</div>
