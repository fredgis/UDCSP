# UDCSP — Deep-Dive Architecture

> Companion document to the [README](../../README.md). This document describes **what is built and how it fits together** — every layer, every sovereignty zone, every AI agent, every governance control. No source code is presented here; this is the platform definition that the development plan ([`plan.md`](./plan.md)) will execute.

> [!TIP]
> **Companion documents.** This file describes *the entire platform* at the architecture level. Two deeper dives extend it:
> - [`ai.md`](../biz/ai.md) — every AI decision, every agent, every safety control, every channel pattern.
> - [`data.md`](./data.md) — every storage zone, every retention period, every compliance article.

---

## Table of Contents

1. [Architecture Principles](#1-architecture-principles)
2. [Logical Architecture](#2-logical-architecture)
3. [Sovereignty & Federation Topology](#3-sovereignty--federation-topology)
4. [Identity Federation Detail](#4-identity-federation-detail)
5. [AI Architecture — Microsoft Foundry at the Core](#5-ai-architecture--microsoft-foundry-at-the-core)
6. [Integration & Workflow Architecture](#6-integration--workflow-architecture)
7. [Case Management Architecture (Dynamics 365)](#7-case-management-architecture-dynamics-365)
8. [Data & Analytics Architecture (Microsoft Fabric)](#8-data--analytics-architecture-microsoft-fabric) — *see also [`data.md`](./data.md)*
9. [Governance, Compliance & EU AI Act](#9-governance-compliance--eu-ai-act)
10. [Security & Network Architecture](#10-security--network-architecture)
11. [Observability & Operations](#11-observability--operations)
12. [Multilingual & Inclusivity Strategy](#12-multilingual--inclusivity-strategy)
13. [End-to-End Flow Examples](#13-end-to-end-flow-examples)
14. [Service Inventory](#14-service-inventory)
15. [Deployment & Developer Experience](#15-deployment--developer-experience)
16. [Compliance & Resilience Hardening](#16-compliance--resilience-hardening)

---

## 1. Architecture Principles

| # | Principle | Implication |
|---|---|---|
| P1 | **Federated, not centralised** | Each country owns its sovereign data zone; cross-border services are mediated, never co-mingled. UDCSP is a **unified citizen platform** in front of the existing national authorities — not a replacement of them. |
| P2 | **AI-first, but supervised** | Every AI decision is registered, traced, evaluated and overridable by a caseworker. |
| P3 | **Compliance by design** | GDPR + EU AI Act + WCAG 2.1 AA are platform-level invariants, not project-level afterthoughts. |
| P4 | **Single front door, many back doors** | One citizen experience; many integration points to existing agency systems (CPR / borger.dk · Skatteverket / Försäkringskassan · Skatteetaten / NAV / Altinn / UDI) and to national eIDs (MitID, BankID, Freja+, ID-porten). |
| P5 | **Event-driven over batch** | Logic Apps + Service Bus + Event Grid, with Fabric Real-Time Intelligence for analytics. |
| P6 | **Open standards** | OpenID Connect, OAuth 2.0, eIDAS, FHIR (where applicable), OpenAPI 3, JSON-LD, SCIM. |
| P7 | **Infrastructure as code** | Bicep modules + GitHub Actions; no click-ops in any environment above DEV. |
| P8 | **Zero trust** | Private endpoints, managed identities, no shared secrets in code, Defender for everything. |
| P9 | **Multilingual from the first commit** | 12 languages are a model and content invariant, not a translation pass at the end. |
| P10 | **Auditable end-to-end** | Every channel, every API call, every prompt, every decision is correlatable through a single trace ID. |

---

## 2. Logical Architecture

### 2.1 High-level view (whole-platform)

This is the same diagram surfaced in [`README.md`](../../README.md), kept here as the canonical entry point for architects who want to drill down into the layered view below.

```mermaid
graph TB
    subgraph Citizens[" 👥 Citizens · 2.1 M · 12 languages "]
        DK["🇩🇰 Denmark"]
        SE["🇸🇪 Sweden"]
        NO["🇳🇴 Norway"]
    end

    subgraph Channels[" 🌐 Omnichannel front door "]
        Web["Web Portal"]
        Mobile["Mobile App"]
        Voice["Voice / IVR"]
    end

    subgraph Identity[" 🔐 Cross-border identity "]
        Entra["Microsoft Entra ID"]
        EXTID["Microsoft Entra External ID"]
        eIDAS["eIDAS bridge"]
    end

    APIM["🚪 Azure API Management"]

    subgraph Foundry[" 🧠 Microsoft AI Foundry "]
        OpenAI["Azure OpenAI<br/>(via Foundry only)"]
        Classifier["Classifier"]
        Translator["Translator"]
        Eligibility["Eligibility"]
        Assistant["Citizen Assistant"]
        DocExtractor["Doc Extractor"]
    end

    subgraph Process[" ⚙️ Workflow + cases "]
        LogicApps["Azure Logic Apps<br/>28d ➜ 4d"]
        D365["Dynamics 365<br/>Customer Service"]
    end

    subgraph DataPlatform[" 📊 Data & insights "]
        Fabric[("Microsoft Fabric")]
        PowerBI["Power BI"]
    end

    subgraph National[" 🏛️ National authorities (third-party systems) "]
        DKAuth["🇩🇰 borger.dk · CPR · MitID · SKAT · Udbetaling DK"]
        SEAuth["🇸🇪 Skatteverket · Försäkringskassan · BankID · Freja+"]
        NOAuth["🇳🇴 Skatteetaten · NAV · Altinn · UDI · ID-porten"]
    end

    subgraph Governance[" 🛡️ Trust & governance "]
        Purview["Microsoft Purview"]
        GDPR["GDPR"]
        AIAct["EU AI Act"]
        WCAG["WCAG 2.1 AA"]
    end

    DK & SE & NO --> Web & Mobile & Voice
    Web & Mobile & Voice --> Entra
    Web & Mobile & Voice --> EXTID
    eIDAS --> Entra
    Entra --> APIM
    EXTID --> APIM
    APIM --> OpenAI
    APIM --> LogicApps
    Foundry --> LogicApps
    LogicApps --> D365
    D365 --> Fabric
    Fabric --> PowerBI
    Foundry -.->|traces + evals| Fabric
    LogicApps -.->|pre-fill / submit / status| DKAuth
    LogicApps -.->|pre-fill / submit / status| SEAuth
    LogicApps -.->|pre-fill / submit / status| NOAuth
    Purview -.->|governs| APIM
    Purview -.->|governs| Foundry
    Purview -.->|governs| Fabric
    Purview -.->|governs| D365

    style Citizens fill:transparent,stroke:#2ea44f,stroke-width:2px,color:#2ea44f
    style Channels fill:transparent,stroke:#2ea44f,stroke-dasharray:4,color:#555
    style Identity fill:transparent,stroke:#8957e5,stroke-width:2px,color:#8957e5
    style Foundry fill:transparent,stroke:#8957e5,stroke-width:2px,color:#8957e5
    style Process fill:transparent,stroke:#e36209,stroke-width:2px,color:#e36209
    style DataPlatform fill:transparent,stroke:#1565c0,stroke-width:2px,color:#1565c0
    style Governance fill:transparent,stroke:#d73a49,stroke-width:2px,color:#d73a49

    style DK fill:#2ea44f,stroke:#238636,color:#fff
    style SE fill:#2ea44f,stroke:#238636,color:#fff
    style NO fill:#2ea44f,stroke:#238636,color:#fff
    style Web fill:#2ea44f,stroke:#238636,color:#fff
    style Mobile fill:#2ea44f,stroke:#238636,color:#fff
    style Voice fill:#2ea44f,stroke:#238636,color:#fff

    style Entra fill:#8957e5,stroke:#6e40c9,color:#fff
    style External ID fill:#8957e5,stroke:#6e40c9,color:#fff
    style eIDAS fill:#8957e5,stroke:#6e40c9,color:#fff

    style APIM fill:#e36209,stroke:#c24e00,color:#fff

    style OpenAI fill:#8957e5,stroke:#6e40c9,color:#fff
    style Classifier fill:#8957e5,stroke:#6e40c9,color:#fff
    style Translator fill:#8957e5,stroke:#6e40c9,color:#fff
    style Eligibility fill:#8957e5,stroke:#6e40c9,color:#fff
    style Assistant fill:#8957e5,stroke:#6e40c9,color:#fff
    style DocExtractor fill:#8957e5,stroke:#6e40c9,color:#fff

    style LogicApps fill:#e36209,stroke:#c24e00,color:#fff
    style D365 fill:#e36209,stroke:#c24e00,color:#fff

    style Fabric fill:#1565c0,stroke:#0d47a1,color:#fff
    style PowerBI fill:#1565c0,stroke:#0d47a1,color:#fff

    style Purview fill:#d73a49,stroke:#b31d28,color:#fff
    style GDPR fill:#d73a49,stroke:#b31d28,color:#fff
    style AIAct fill:#d73a49,stroke:#b31d28,color:#fff
    style WCAG fill:#d73a49,stroke:#b31d28,color:#fff

    style National fill:transparent,stroke:#0d47a1,stroke-width:2px,color:#0d47a1
    style DKAuth fill:#1565c0,stroke:#0d47a1,color:#fff
    style SEAuth fill:#1565c0,stroke:#0d47a1,color:#fff
    style NOAuth fill:#1565c0,stroke:#0d47a1,color:#fff
```

Blue = data, green = citizens / channels, orange = backend & process, purple = AI / identity, red = governance.

### 2.2 Layered detail

The full 8-layer breakdown used by build teams: it splits the platform into Citizens & Channels, Edge & Identity, API & Integration, AI Brain, Business Services, Data & Insights, Governance & Trust, and Security & Platform.

```mermaid
graph TB
    subgraph L0["Layer 0 — Citizens & Channels"]
        C["Citizens (DK · SE · NO) — 12 languages"]
        WEB["Web Portal — Azure Static Web Apps"]
        MOB["Mobile App — native shell + Static Web Apps backend"]
        VOICE["Voice / IVR — ACS Call Automation + voice orchestrator + GPT-4o Realtime"]
        WAGENT["Web Chat Widget — APIM → Foundry topic-router"]
    end

    subgraph L1["Layer 1 — Edge & Identity"]
        FD["Azure Front Door + WAF"]
        EXTID["Microsoft Entra External ID (per country)"]
        ENTRA["Microsoft Entra ID + eIDAS bridge"]
    end

    subgraph L2["Layer 2 — API & Integration"]
        APIM["Azure API Management (multi-region)"]
        SB["Azure Service Bus"]
        EG["Azure Event Grid"]
        LA["Azure Logic Apps (Standard, single-tenant)"]
    end

    subgraph L3["Layer 3 — AI Brain (Microsoft Foundry)"]
        FOUNDRY["Foundry Project + Hub"]
        AOAI["Azure OpenAI deployments"]
        AGENTS["Foundry Agents:<br/>Topic-Router · Classifier · Translator · Eligibility · Assistant · DocExtractor · CaseworkerHelper"]
        EVAL["Foundry Evaluations + Tracing + Content Safety"]
        TEE["Confidential Compute (TEE)<br/>for Eligibility (high-risk)"]
        AISPEECH["Azure AI Speech<br/>(D365 IVR menus + post-call analytics only<br/>— not in the live audio path)"]
        AITRANS["Azure AI Translator"]
        AIDOC["Azure AI Document Intelligence"]
    end

    subgraph L4["Layer 4 — Business Services"]
        D365["Dynamics 365 Customer Service<br/>+ Copilot for Service"]
        FUNC["Domain microservices — Azure Container Apps + Functions"]
        PG["Azure Database for PostgreSQL Flexible Server<br/>reference data · rules · drafts (JSONB) · glossaries"]
        REDIS["Azure Cache for Redis Enterprise<br/>slot-filling · session · in-flight drafts"]
        STORAGE["Azure Storage / ADLS Gen2 — documents"]
    end

    subgraph L5["Layer 5 — Data & Insights"]
        FABRIC["Microsoft Fabric:<br/>OneLake · Lakehouse · Warehouse · Real-Time Intelligence"]
        POWERBI["Power BI semantic models + reports"]
    end

    subgraph L6["Layer 6 — Governance & Trust"]
        PURVIEW["Microsoft Purview — catalog · classification · lineage · DLP · AI Act registry"]
        DPIA["DPIA & ROPA repository"]
    end

    subgraph L7["Layer 7 — Security & Platform"]
        KV["Azure Key Vault"]
        DEF["Microsoft Defender for Cloud<br/>+ Defender for APIs (post-audit)"]
        SENT["Microsoft Sentinel"]
        MON["Azure Monitor + Log Analytics + Application Insights"]
        POL["Azure Policy + Blueprints"]
        ACR["Azure Container Registry"]
        DDOS["Azure DDoS Protection Standard (post-audit)"]
        BAS["Azure Bastion (post-audit)"]
        CIEM["Entra Permissions Management — CIEM (post-audit)"]
        BKP["Azure Backup + Site Recovery (post-audit)"]
        CHA["Azure Chaos Studio (post-audit)"]
        CL["Azure Confidential Ledger (post-audit)<br/>AI Act Art. 26(6) tamper-evident registry"]
        VID["Microsoft Entra Verified ID (post-audit)<br/>EUDI Wallet bridge"]
        PRV["Microsoft Priva (post-audit)<br/>GDPR DSR orchestrator"]
    end

    C --> WEB
    C --> MOB
    C --> VOICE
    C --> WAGENT
    WEB --> FD
    MOB --> FD
    VOICE --> FD
    WAGENT --> FD
    FD --> EXTID
    EXTID --> ENTRA
    ENTRA --> APIM
    APIM --> AGENTS
    APIM --> LA
    APIM --> D365
    APIM --> FUNC
    AGENTS --> AOAI
    AGENTS --> AITRANS
    AGENTS --> AIDOC
    AGENTS --> TEE
    AGENTS -. AI Act log .-> CL
    AISPEECH --> AGENTS
    LA --> SB
    LA --> EG
    LA --> D365
    LA --> FUNC
    FUNC --> PG
    FUNC --> REDIS
    FUNC --> STORAGE
    D365 --> PG
    D365 --> STORAGE
    FUNC -.events.-> EG
    EG --> FABRIC
    AGENTS -.tracing.-> MON
    MON --> FABRIC
    FABRIC --> POWERBI
    PURVIEW -. scans .-> PG
    PURVIEW -. scans .-> REDIS
    PURVIEW -. scans .-> STORAGE
    PURVIEW -. scans .-> FABRIC
    PURVIEW -. registers .-> AGENTS
    PRV -. DSR .-> PG
    PRV -. DSR .-> STORAGE
    PRV -. DSR .-> D365
    BKP -. backs up .-> PG
    BKP -. backs up .-> STORAGE
    KV -.secrets.-> APIM
    KV -.secrets.-> FUNC
    KV -.secrets.-> LA
    DEF -. posture .-> APIM
    DEF -. posture .-> FUNC
    SENT -. SIEM .-> MON
    POL -. guardrails .-> APIM
    DDOS -. L3/L4 .-> FD
    BAS -. admin access .-> FUNC
    CIEM -. continuous posture .-> ENTRA
    CHA -. resilience .-> APIM
    VID -. VC issuance .-> EXTID

    classDef l0 fill:#E3F2FD,stroke:#1565C0,color:#0D47A1
    classDef l1 fill:#EDE7F6,stroke:#5E35B1,color:#311B92
    classDef l2 fill:#E0F2F1,stroke:#00796B,color:#004D40
    classDef l3 fill:#FFF3E0,stroke:#E65100,color:#BF360C
    classDef l4 fill:#FCE4EC,stroke:#AD1457,color:#880E4F
    classDef l5 fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef l6 fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef l7 fill:#ECEFF1,stroke:#455A64,color:#263238

    class C,WEB,MOB,VOICE,WAGENT l0
    class FD,EXTID,ENTRA l1
    class APIM,SB,EG,LA l2
    class FOUNDRY,AOAI,AGENTS,EVAL,TEE,AISPEECH,AITRANS,AIDOC l3
    class D365,FUNC,PG,REDIS,STORAGE l4
    class FABRIC,POWERBI l5
    class PURVIEW,DPIA l6
    class KV,DEF,SENT,MON,POL,ACR,DDOS,BAS,CIEM,BKP,CHA,CL,VID,PRV l7
```

### 2.3 National-authority integration map (the unified-platform bridge)

UDCSP is **a unified citizen platform that connects to the existing national authorities** — it does not replace them. The Logic Apps + APIM tier is the integration plane: every cross-border or country-specific case is pre-filled from the citizen's eID profile, validated against country-specific rules (residence, tax-residence, social-insurance coordination), then submitted to (or downloaded from) the **competent national authority**. Each country's registers, eIDs and case systems remain the source of truth.

Wording rule used across the citizen UI, the assistant prompt and this documentation: never describe UDCSP as "one single application across DK/SE/NO" or promise "signed and verifiable in minutes" universally — issuance, decision and SLA always come from the relevant national authority.

```mermaid
graph LR
    subgraph UDCSP[" 🌐 UDCSP — Unified citizen platform "]
        WEB["Web · Mobile · Voice · Chat"]
        APIMHUB["APIM + Logic Apps<br/>(per country, sovereign zone)"]
    end

    subgraph DK[" 🇩🇰 Denmark — competent authorities "]
        DK_CPR["CPR<br/>Population register"]
        DK_BORGER["borger.dk / lifeindenmark.dk<br/>Citizen portal"]
        DK_MITID["MitID<br/>National eID"]
        DK_SKAT["SKAT<br/>Tax authority (form 02.050)"]
        DK_UDB["Udbetaling Danmark<br/>Family benefits"]
    end

    subgraph SE[" 🇸🇪 Sweden — competent authorities "]
        SE_SKV["Skatteverket<br/>Folkbokföring · Hemvistintyg<br/>(e-service since Feb 2026 / SKV 2734)"]
        SE_FK["Försäkringskassan<br/>Barnbidrag (auto) · EU family benefits"]
        SE_BANKID["BankID · Freja+ · AB Svenska Pass<br/>National eID"]
    end

    subgraph NO[" 🇳🇴 Norway — competent authorities "]
        NO_SKE["Skatteetaten<br/>Folkeregisteret · Tax residence"]
        NO_NAV["NAV<br/>Barnetrygd · Utvidet barnetrygd"]
        NO_ALT["Altinn<br/>Forms portal (RF-1306 …)"]
        NO_UDI["UDI<br/>Permits (non-Nordic)"]
        NO_IDP["ID-porten<br/>eID gateway (MinID/BankID/Buypass/Commfides)"]
    end

    subgraph CB[" 🤝 Cross-border guidance "]
        INFO["Info Norden — Nordic Council"]
        ORE["Øresunddirekt — DK ↔ SE"]
        GRE["Grensetjänsten — NO ↔ SE"]
        SDG["EU Single Digital Gateway / OOTS / eIDAS"]
    end

    WEB --> APIMHUB
    APIMHUB -. residency .-> DK_CPR & DK_BORGER
    APIMHUB -. eID .-> DK_MITID
    APIMHUB -. tax cert .-> DK_SKAT
    APIMHUB -. child benefit .-> DK_UDB

    APIMHUB -. residency · tax cert .-> SE_SKV
    APIMHUB -. child benefit .-> SE_FK
    APIMHUB -. eID .-> SE_BANKID

    APIMHUB -. residency · tax residence .-> NO_SKE
    APIMHUB -. child benefit .-> NO_NAV
    APIMHUB -. forms .-> NO_ALT
    APIMHUB -. permits .-> NO_UDI
    APIMHUB -. eID .-> NO_IDP

    APIMHUB -. eligibility rules .-> CB

    classDef hub fill:#0d47a1,stroke:#0d47a1,color:#fff
    classDef dk fill:#c8102e,stroke:#a30b22,color:#fff
    classDef se fill:#006aa7,stroke:#004f7c,color:#fff
    classDef no fill:#ba0c2f,stroke:#8c0824,color:#fff
    classDef cb fill:#8957e5,stroke:#6e40c9,color:#fff

    class WEB,APIMHUB hub
    class DK_CPR,DK_BORGER,DK_MITID,DK_SKAT,DK_UDB dk
    class SE_SKV,SE_FK,SE_BANKID se
    class NO_SKE,NO_NAV,NO_ALT,NO_UDI,NO_IDP no
    class INFO,ORE,GRE,SDG cb
```

**Routing matrix.** What gets sent where, per service:

| Service | Denmark 🇩🇰 | Sweden 🇸🇪 | Norway 🇳🇴 |
|---|---|---|---|
| Residency transfer | CPR + borger.dk + MitID. *CPR cannot be issued before the citizen has actually moved.* | Skatteverket Folkbokföring + BankID/Freja+. *Required if stay ≥ 1 year.* | Skatteetaten Folkeregisteret + (UDI for non-Nordic) + ID-porten. *Required if stay > 6 months. Nordic citizens don't need a permit but must notify.* |
| Tax residency certificate | SKAT form 02.050 (request workflow — **not** instant download). | Skatteverket Hemvistintyg — new e-service since Feb 2026, fallback form SKV 2734. | Altinn form RF-1306 + Skatteetaten. *Tax residence rule: > 183 days / 12 mo OR > 270 days / 36 mo.* |
| Child & family benefit | Udbetaling Danmark / lifeindenmark.dk. *Income-based; specific EU/EEA cross-border path; apply-without-MitID flow exists for new arrivals.* | Försäkringskassan barnbidrag — **generally automatic** for resident children; cross-border EU/EEA cases coordinated. | NAV barnetrygd — **automatic for born-in-NO**; application required for EEA / cross-border / complex family. NAV utvidet barnetrygd is a separate single-parent flow. |
| My cases | Status mirrored from D365 + the relevant national authority case system. | Same. | Same. |

Cross-border eID interoperability via the **EU Single Digital Gateway / Once Only Technical System / eIDAS** is improving but many services still require a national identifier (CPR / personnummer / D-number). The Danish eID Gateway accepts some EU/EEA eIDs but identity matching is still required for most flows. UDCSP surfaces this constraint to the citizen rather than promising seamless cross-border eID.

---

## 3. Sovereignty & Federation Topology

Each country runs its own **sovereign zone** in the closest Azure region; cross-border services flow through a thin **federation hub** that never persists national data outside its zone.

```mermaid
graph TB
    subgraph DK["🇩🇰 Sovereign Zone — Denmark (Azure North Europe)"]
        DK_EXTID["External ID tenant DK"]
        DK_FAB["Fabric workspace DK"]
        DK_D365["D365 environment DK"]
        DK_LA["Logic Apps DK"]
        DK_DATA["Citizen data DK"]
    end

    subgraph SE["🇸🇪 Sovereign Zone — Sweden (Azure Sweden Central)"]
        SE_EXTID["External ID tenant SE"]
        SE_FAB["Fabric workspace SE"]
        SE_D365["D365 environment SE"]
        SE_LA["Logic Apps SE"]
        SE_DATA["Citizen data SE"]
    end

    subgraph NO["🇳🇴 Sovereign Zone — Norway (Azure Norway East)"]
        NO_EXTID["External ID tenant NO"]
        NO_FAB["Fabric workspace NO"]
        NO_D365["D365 environment NO"]
        NO_LA["Logic Apps NO"]
        NO_DATA["Citizen data NO"]
    end

    subgraph HUB["🌐 Federation Hub (multi-region active-active)"]
        ENTRA["Microsoft Entra ID<br/>eIDAS bridge"]
        APIM["API Management — global"]
        FOUNDRY["Microsoft Foundry — multi-region"]
        PURVIEW["Microsoft Purview — federated catalog"]
        FAB_DOMAIN["Fabric Domain federating the 3 workspaces"]
    end

    DK_EXTID -->|OIDC federation| ENTRA
    SE_EXTID -->|OIDC federation| ENTRA
    NO_EXTID -->|OIDC federation| ENTRA

    ENTRA --> APIM
    APIM --> DK_LA
    APIM --> SE_LA
    APIM --> NO_LA
    APIM --> FOUNDRY

    DK_FAB -.shortcut.-> FAB_DOMAIN
    SE_FAB -.shortcut.-> FAB_DOMAIN
    NO_FAB -.shortcut.-> FAB_DOMAIN

    PURVIEW -. scans .-> DK_DATA
    PURVIEW -. scans .-> SE_DATA
    PURVIEW -. scans .-> NO_DATA

    classDef dk fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef se fill:#FFF9C4,stroke:#F9A825,color:#F57F17
    classDef no fill:#E3F2FD,stroke:#1565C0,color:#0D47A1
    classDef hub fill:#FFF3E0,stroke:#E65100,color:#BF360C

    class DK_EXTID,DK_FAB,DK_D365,DK_LA,DK_DATA dk
    class SE_EXTID,SE_FAB,SE_D365,SE_LA,SE_DATA se
    class NO_EXTID,NO_FAB,NO_D365,NO_LA,NO_DATA no
    class ENTRA,APIM,FOUNDRY,PURVIEW,FAB_DOMAIN hub
```

**Key sovereignty rules**

- Citizen PII is stored **only** in the citizen's country zone.
- Cross-border services (e.g. residency transfer DK → SE) are mediated by **claims-based, purpose-bound** tokens issued by the federation hub — no raw PII crosses the border.
- The Fabric domain federates **metrics and lineage**, not raw data, by default; data product sharing is opt-in and requires Purview-enforced data-sharing policies.
- Each country's DPA can audit its own zone independently.

---

## 4. Identity Federation Detail

Two layers separate the citizen-facing portal from the national eID hubs:

1. **Microsoft Entra External ID (CIAM)** is the per-country tenant the SPA talks to (one tenant per country: DK, SE, NO). Each tenant exposes a `SignUpSignIn` user flow that supports email + password (returning users) **and** a federated *External Identity Provider* — the citizen's national eID.
2. **OIDC Broker (Criipto / Signicat / Nets eID)** is what bridges External ID and the eID hubs. The eID hubs (MitID, BankID, BankID Norge / MinID) are not exposed as public OIDC providers; a certified broker handles the contracts, certificates, eIDAS assurance levels, and exposes a single OIDC endpoint to External ID.

```mermaid
graph TB
    CITIZEN["Citizen — Anna in Copenhagen"]
    SPA["UDCSP SPA — Static Web App"]
    EXTID_DK["Entra External ID — DK tenant<br/><i>SignUpSignIn user flow</i>"]
    BROKER["OIDC Broker — Criipto / Signicat<br/><i>certified national eID gateway</i>"]
    MITID["🆔 MitID — DK national eID<br/><i>app push · face ID</i>"]
    BANKID_SE["🆔 BankID — SE national eID"]
    BANKID_NO["🆔 BankID Norge / MinID — NO"]
    APIM["APIM — JWT validation, country claim"]
    APP["Backend services"]

    CITIZEN --> SPA
    SPA -->|OIDC redirect| EXTID_DK
    EXTID_DK -->|email + password<br/>returning users| EXTID_DK
    EXTID_DK -->|External Identity Provider — OIDC| BROKER
    BROKER -->|SAML / OIDC| MITID
    BROKER -.->|same broker, different flow| BANKID_SE
    BROKER -.->|same broker, different flow| BANKID_NO
    EXTID_DK -->|id_token + access_token<br/>cpr / pid claim| SPA
    SPA -->|Bearer access_token| APIM
    APIM -->|country claim, scopes| APP

    subgraph WORKFORCE["Caseworker workforce identity"]
        WUSER["Caseworker"]
        ENTRA_WF["Entra ID — workforce tenant"]
        PIM["Privileged Identity Management"]
        WUSER --> ENTRA_WF
        ENTRA_WF --> PIM
        PIM --> APIM
    end

    classDef cit fill:#E3F2FD,stroke:#1565C0,color:#0D47A1
    classDef ident fill:#EDE7F6,stroke:#5E35B1,color:#311B92
    classDef eid fill:#FFF3E0,stroke:#E65100,color:#BF360C
    classDef gw fill:#E0F2F1,stroke:#00796B,color:#004D40
    classDef wf fill:#FCE4EC,stroke:#AD1457,color:#880E4F

    class CITIZEN,SPA cit
    class EXTID_DK,BROKER ident
    class MITID,BANKID_SE,BANKID_NO eid
    class APIM,APP gw
    class WUSER,ENTRA_WF,PIM wf
```

### How a citizen actually signs in (Anna, DK example — Demo 1 step 1)

1. Anna opens `udcsp.dk` (Static Web App) and clicks **Sign in / Create account**.
2. The SPA picks her country (DK) and redirects to `udcspdk.ciamlogin.com` (External ID DK).
3. The hosted page offers two methods:
   - **Email & password** — for returning users who registered without an eID (used by the prototype today).
   - **Sign in with MitID** — federates to the OIDC broker (`broker.criipto.id` or equivalent), which redirects Anna to her **MitID app** (face ID + code).
4. The broker returns an OIDC `id_token` to External ID containing Anna's `pid` (pseudonymised CPR) and assurance level (eIDAS High).
5. External ID maps the broker claims onto its CIAM user object (creating it on first sign-in) and issues its own `access_token` to the SPA.
6. The SPA calls APIM with that `access_token`; APIM validates the JWT, extracts the `country` claim (`dk`), and routes to the DK backend.

### Choice of OIDC broker (production)

| Broker | Coverage | Why we picked it for the platform reference design |
|--------|----------|----------------------------------------------------|
| **Criipto Verify** | MitID, BankID SE, BankID Norge, NemLog-in, Vipps, eIDAS | Single contract covers all three Nordic countries; OpenID Connect out of the box; sandbox with test users included. |
| Signicat | All Nordic + ~20 EU eIDs | Equivalent feature set, larger footprint outside Nordics. |
| Nets eID Broker | DK / SE / NO Nordic-only | Nets-operated, narrower scope. |

The platform documents Criipto as the default integration. Switching brokers is a configuration change inside External ID (External Identity Provider definition) — no SPA code change.

### Why not call MitID / BankID directly?

The national eID hubs are not exposed as public OIDC providers. They require:
- A signed contract with the operator (Nets, Finansiell ID-Teknik, Vipps).
- Service certificates issued per environment.
- Per-country eIDAS conformance audits.
- SAML 2.0 (DK MitID) or proprietary protocol (BankID NO/SE) on the wire.

A certified broker absorbs all of that and exposes a single OIDC interface. This is the same approach used by `borger.dk`, `skatteverket.se` and `nav.no` for any third-party that integrates a national eID.

### Caseworker identity (separate plane)

Caseworkers do **not** use External ID. They authenticate against the workforce **Entra ID** tenant with **PIM** for sensitive actions (eligibility override, AI Act registry write). This is why the diagram has two distinct subgraphs.

### Cross-border claim mapping

When Anna initiates a residency transfer DK → SE, the SPA does **not** ask her to sign in to SE. Instead, the cross-border Logic App takes Anna's DK access token, mints a **signed claims-only token** (Key Vault), posts it to the SE-side Logic App, which then writes the case into the SE Dataverse environment. No DK PII crosses the border — only the signed claims (`citizenPidHash`, `intent`, `destinationAddress`, `eligibilityVerdict`, `traceId`).

- **Per-country IdP wiring** is documented in [`governance/identity/identity-providers.md`](../../governance/identity/identity-providers.md) (MitID for DK, BankID for SE, BankID Norge for NO).
- **EUDI Wallet readiness** (eIDAS-2, Reg. (EU) 2024/1183) is captured in [`governance/identity/eudi-wallet-readiness.md`](../../governance/identity/eudi-wallet-readiness.md): the platform accepts OpenID4VP `vp_token` once member-state wallets land, with no back-end code change.

---

## 5. AI Architecture — Microsoft Foundry at the Core

> 📘 **For the dedicated AI deep-dive** (single brain — Foundry only — `topic-router` agent, decision tree, agent catalogue, safety, evals, EU AI Act registry, end-to-end conversation flow), see [`ai.md`](../biz/ai.md). This section is the architecture-level summary.

Azure OpenAI is **never accessed directly**. Every model call is mediated by **Microsoft Foundry**, which provides agent orchestration, evaluation, tracing, content safety, and the EU AI Act registry.

> ℹ️ **Agent runtime — Foundry Agents v1 API.** All seven UDCSP agents are registered through the **new Foundry Agents API (v1)** (not the legacy Assistants/Classic API). Consequences for the rest of the architecture:
>
> - **Identity = name + version.** Each agent has a stable name (e.g. `udcsp-classifier`) with auto-incrementing versions (`:1`, `:2`, …). Re-deploying an updated definition appends a new version; the previous version stays addressable. There are **no `asst_*` IDs** anywhere in the platform.
> - **Entra-only auth, no API keys.** Every callable (Logic App, Function, container, caseworker copilot) talks to Foundry via Entra-issued bearer tokens for the audience `https://ai.azure.com`. This is the only authentication scheme the new agents accept; key auth is not supported.
> - **Per-agent managed identity.** Foundry provisions a managed identity per agent version (`instance_identity.principal_id`); RBAC against downstream resources (Search, Storage, Key Vault, knowledge bases) is granted to that identity, not to the calling service.
> - **Invocation depends on agent kind.** New-format Foundry agents come in three kinds (`prompt`, `hosted`, `workflow`); UDCSP currently uses `prompt` agents only. **Prompt agents are a registry entry, not an HTTP endpoint** — they store `{model, instructions, model_options, tools}` in the project but do **not** auto-mount at `{projectEndpoint}/openai/v1/responses` (that path returns `DeploymentNotFound` for `kind=prompt`). The caller is expected to read the agent definition then perform the inference itself against the model deployment named in the definition. UDCSP uses two call patterns on top of this contract:
>   - **APIM operation policies (SPA-facing path)** — the citizen ChatWidget / Apply forms hit APIM `/agent-classifier`, `/agent-citizen-assistant`, `/agent-doc-extractor`, `/eligibility-checks/assessments`. Each operation policy authenticates with APIM's system MI on `https://ai.azure.com`, then **on each request** does (a) `GET {projectEndpoint}/api/projects/{project}/agents/{name}?api-version=2025-05-15-preview` to fetch the agent envelope (cached 5 min in APIM via `cache-lookup-value`), extracts `versions.latest.definition.{instructions, model, model_options}`, and (b) `POST {aoaiEndpoint}/openai/deployments/{model}/chat/completions?api-version=2024-10-21` with `{messages:[{role:system, content:instructions},{role:user, content:payload}], …model_options}` against the AOAI deployment using a second MI auth on `https://cognitiveservices.azure.com`. **Result:** updating the agent in Foundry (instructions, temperature, response_format, max_completion_tokens) propagates to runtime within 5 minutes without an APIM redeploy. JWT validation runs first; the policy returns a structured fallback verdict on any 5xx so the SPA never blocks the form.
>   - **Logic App direct (back-office path)** — the `application-intake` workflow uses its own system MI on `https://ai.azure.com`. Each `Call_X_agent` HTTP action POSTs `{model, instructions, input}` straight to the Foundry endpoint (instructions/model live as workflow parameters, synced from the same `foundry/agents/*` sources). No wrapper is needed because the LA path is internal.
>   When the agent registry grows multi-version semantics (canary, A/B), the LA path can move behind the same APIM ops via a non-JWT internal route or a Function wrapper — for the current single-version deployments the inline pattern keeps the workflow declarative and avoids an extra hop.
>   **Hosted agents (kind=hosted)** are containerised — they expose a real `agent_endpoint.protocols=[activity,responses]` on `https://agents.{region}.hyena.infra.ai.azure.com/...` and can be invoked through the Responses API. UDCSP does not run any hosted agent today; if a future agent needs custom code (multi-step orchestration, tool execution beyond what APIM can express) it would be packaged as a hosted agent with the same `{name}:{version}` identity contract.
> - **APIM named-value convention.** Foundry agent endpoints are stored as `<projectEndpoint>|<agentName>` (e.g. `https://udcspai.services.ai.azure.com/api/projects/udcsp|udcsp-classifier`). The wrapper parses the pipe.

```mermaid
graph TB
    subgraph CHANNELS["Channels"]
        WEB_AI["Web chat"]
        MOB_AI["Mobile chat"]
        IVR_AI["Voice IVR"]
        BO["Caseworker (D365 Copilot)"]
    end

    subgraph APIM_FACADE["API Management"]
        APIM_RT["/agents/topic-router"]
    end

    subgraph FOUNDRY["Microsoft Foundry — Hub & Project"]
        AG_TR["Agent — Topic Router<br/>(12 languages · multi-turn · slot-filling)"]
        AG_CLASS["Agent — Request Classifier<br/>(intent, agency, language)"]
        AG_TRANS["Agent — Translator orchestrator"]
        AG_ELIG["Agent — Eligibility Pre-Assessor<br/>(EU AI Act: high-risk · runs in TEE)"]
        AG_ASSIST["Agent — Citizen Assistant<br/>(RAG over knowledge base)"]
        AG_DOC["Agent — Document Extractor"]
        AG_CASE["Agent — Caseworker Copilot helper"]
        MODELS["Model Catalog<br/>Azure OpenAI · open-source · fine-tuned"]
        EVALS["Evaluations<br/>(accuracy · groundedness · safety · bias)"]
        TRACE["Tracing & Observability"]
        SAFETY["Azure AI Content Safety"]
        REGISTRY["AI Act Risk Registry<br/>+ Confidential Ledger (immutable)"]
    end

    subgraph TEE_BOX["Azure Confidential Compute"]
        TEE_HOST["Confidential Container App<br/>SEV-SNP · TEE attestation"]
    end

    subgraph KB["Knowledge Bases"]
        SP["SharePoint / docs"]
        FAB_KB["Fabric lakehouse — case history (anonymised)"]
        WEB_KB["Public agency websites"]
    end

    subgraph DATA_AI["Data services for AI"]
        TRANS["Azure AI Translator"]
        DOCINT["Azure AI Document Intelligence"]
        SPEECH["Azure AI Speech (D365 IVR menus + post-call analytics only — not in live audio path)"]
    end

    subgraph SESSION["Conversational session state"]
        REDIS_S["Azure Cache for Redis<br/>(slot-filling · session)"]
    end

    WEB_AI --> APIM_RT
    MOB_AI --> APIM_RT
    IVR_AI --> SPEECH
    SPEECH --> APIM_RT
    BO --> AG_CASE
    APIM_RT --> AG_TR
    AG_TR --> AG_CLASS
    AG_TR --> AG_ASSIST
    AG_TR --> AG_DOC
    AG_TR --> AG_TRANS
    AG_TR <--> REDIS_S

    AG_CLASS --> MODELS
    AG_TRANS --> MODELS
    AG_TRANS --> TRANS
    AG_ELIG --> TEE_HOST
    TEE_HOST --> MODELS
    AG_ASSIST --> MODELS
    AG_ASSIST -. RAG .-> SP
    AG_ASSIST -. RAG .-> FAB_KB
    AG_ASSIST -. RAG .-> WEB_KB
    AG_DOC --> DOCINT
    AG_DOC --> MODELS

    AG_TR --> SAFETY
    AG_CLASS --> SAFETY
    AG_ASSIST --> SAFETY
    AG_ELIG --> SAFETY

    AG_TR -. trace .-> TRACE
    AG_CLASS -. trace .-> TRACE
    AG_ASSIST -. trace .-> TRACE
    AG_ELIG -. trace .-> TRACE
    AG_DOC -. trace .-> TRACE

    AG_ELIG -. registered .-> REGISTRY
    AG_CLASS -. registered .-> REGISTRY
    AG_ASSIST -. registered .-> REGISTRY
    AG_TR -. registered .-> REGISTRY

    EVALS -. continuous .-> AG_TR
    EVALS -. continuous .-> AG_CLASS
    EVALS -. continuous .-> AG_ELIG
    EVALS -. continuous .-> AG_ASSIST

    classDef chan fill:#E3F2FD,stroke:#1565C0,color:#0D47A1
    classDef apim fill:#E0F2F1,stroke:#00796B,color:#004D40
    classDef fnd fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C
    classDef tee fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C
    classDef kb fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef dai fill:#FFF9C4,stroke:#F9A825,color:#F57F17
    classDef ses fill:#EDE7F6,stroke:#5E35B1,color:#311B92

    class WEB_AI,MOB_AI,IVR_AI,BO chan
    class APIM_RT apim
    class AG_TR,AG_CLASS,AG_TRANS,AG_ELIG,AG_ASSIST,AG_DOC,AG_CASE,MODELS,EVALS,TRACE,SAFETY,REGISTRY fnd
    class TEE_HOST tee
    class SP,FAB_KB,WEB_KB kb
    class TRANS,DOCINT,SPEECH dai
    class REDIS_S ses
```

### 5.1 Agent Catalogue

| Agent | Purpose | Model strategy | EU AI Act class | Human-in-the-loop |
|---|---|---|---|---|
| **Topic Router** | Multi-turn conversational orchestrator. Detects intent, manages slot-filling state in Redis, routes to the appropriate downstream skill (classifier, citizen-assistant, doc-extractor, eligibility, translator). Owns 12-language topic logic. | Small low-latency model with tool-use; topics versioned per locale; eval per language. | Limited risk | Caseworker can override routing; transcripts visible in caseworker copilot. |
| **Request Classifier** | Detect intent, target agency, language, urgency. | Small, low-latency model; periodically fine-tuned on labelled traces. | Limited risk | Caseworker can re-route. |
| **Translator orchestrator** | Translate citizen content and outbound communications across the 12 languages, preserving administrative terminology. | OpenAI + AI Translator hybrid. | Limited risk | Caseworker can edit translation before sending. |
| **Eligibility Pre-Assessor** | Compute likelihood of benefit eligibility from structured + unstructured inputs; output a recommendation, never a decision. **Inference orchestration runs inside Azure Confidential Compute (TEE / SEV-SNP)**; every decision is hashed and appended to **Azure Confidential Ledger** for AI Act Art. 26(6) tamper-evident logging. **Invoked twice per application**: (1) synchronously from the citizen SPA at the *Eligibility criteria* step via APIM `POST /eligibility-checks/assessments` so the citizen sees the rule-by-rule verdict + missing evidence + caseworker summary BEFORE consenting; (2) asynchronously from the application-intake Logic App after submission for the AI Act art. 14 audit registry write. The SPA carries the verdict in `payload.eligibilityPreflight` so the LA records it on `udcsp_application` without re-running. | Tool-using LLM with deterministic rule plug-ins; full lineage. | **High risk** | Always reviewed by a caseworker; never auto-approves. |
| **Citizen Assistant** | Answer citizen questions in natural language; perform safe actions on behalf of the citizen. | RAG over public knowledge bases + grounded prompting. | Limited risk | Escalation to human caseworker on demand. |
| **Document Extractor** | Extract structured data from uploaded documents (passport, payslip, lease). | AI Document Intelligence + LLM verification. | Limited risk | Caseworker validates extraction. |
| **Caseworker Copilot Helper** | Summarise cases, draft replies, suggest knowledge articles, propose next-best-action. | OpenAI grounded on the case record + knowledge base. | Limited risk | Caseworker is the operator. |

### 5.2 Foundry Operating Model

- **Hub** per region (3) sharing model deployments where compliant; **Project** per agent or agent family.
- **Evaluations** are versioned, run in CI/CD on every prompt or model change, and gate promotion to PROD.
- **Tracing** is continuous and stored in a dedicated Application Insights workspace exported to Fabric.
- **Content Safety** filters every input and output; high-risk events are sent to Sentinel.
- **AI Act Registry** in Foundry + Purview holds the risk classification, the technical documentation, the post-market monitoring plan, and the conformity declaration for every agent. **Post-audit refactor:** every high-risk decision (Eligibility) is also written to **Azure Confidential Ledger** (CCF-backed, tamper-evident) for cryptographic proof of integrity beyond what App Insights / Fabric can offer.
- **Confidential Computing** wraps the Eligibility inference orchestration in a TEE (SEV-SNP-attested Confidential Container App), so citizen PII is encrypted in memory during the cross-border DK→SE / SE→NO scenarios documented in §13.1.

---

## 6. Integration & Workflow Architecture

```mermaid
graph TB
    APIM["API Management"]
    LA["Logic Apps Standard"]
    SB["Service Bus"]
    EG["Event Grid"]
    FUNC["Container Apps / Functions"]
    PARTNER["Partner agency systems<br/>(legacy SOAP / REST / SFTP)"]
    D365["Dynamics 365"]
    FOUNDRY["Foundry Agents"]
    NOTIF["Azure Communication Services<br/>(SMS · email · voice)"]

    APIM --> LA
    APIM --> FUNC
    LA --> FOUNDRY
    LA --> D365
    LA --> PARTNER
    LA --> SB
    LA --> NOTIF
    FUNC --> SB
    FUNC --> PG
    FUNC --> REDIS
    FUNC -.events.-> EG
    SB --> LA
    EG --> FUNC
    EG --> LA
    AGENTS --> TEE
    AGENTS -. AI Act log .-> CL
    PRV --> LA
    PRV --> PG
    BKP -. backs up .-> PG
    BKP -. backs up .-> STORAGE

    classDef gw fill:#E0F2F1,stroke:#00796B,color:#004D40
    classDef wf fill:#FFF9C4,stroke:#F9A825,color:#F57F17
    classDef msg fill:#EDE7F6,stroke:#5E35B1,color:#311B92
    classDef ext fill:#FCE4EC,stroke:#AD1457,color:#880E4F

    class APIM,FUNC gw
    class LA wf
    class SB,EG msg
    class PARTNER,D365,FOUNDRY,NOTIF ext
```

**Patterns**

- **API Management** policies enforce: country routing, OAuth scope checks, rate limiting per channel, request transformation, body redaction for logs.
- **Logic Apps** orchestrates long-running, human-in-the-loop processes (eligibility review, multi-agency coordination).
- **Service Bus** carries reliable commands (e.g. *create case*, *issue payment*).
- **Event Grid** carries domain events (e.g. *application submitted*, *eligibility recomputed*) for analytics & cross-service reactions.
- Each integration to a partner legacy system is wrapped in a **dedicated Logic App + Function** and exposed through API Management with its own facade contract.

### Logic Apps tier choice — Standard (prod) vs Consumption (dev/test)

| Tier | When | Quota requirement | Reason |
|---|---|---|---|
| **Standard** (Workflow Standard WS1+) | `env=prod` | App Service `Total VMs ≥ 1` per region | VNet integration, stateful workflows, no cold start, in-app Service Bus / SQL connectors (data stays inside the trust boundary). Required for the EU data-residency guarantee. |
| **Consumption** (`Microsoft.Logic/workflows`) | `env=dev` / `env=test` | None | Multitenant Azure runtime, no VM quota — works in MCAPS sandbox subs that have `Total VMs = 0`. Pay-per-execution, ~€5/month for demos. Trade-off: cold start (1–2 s on first execution), no native VNet, managed connectors only. |

The installer chooses the tier from the `-Environment` flag
(`scripts/install/Install-UDCSP.ps1`). The same `workflow.json` files in
`services/logic-apps/workflows/<name>/` feed both tiers; the installer
strips `_comment` keys, rewrites the `$schema` to the 2016-06-01
Consumption schema, and converts Service Bus `ServiceProvider` triggers
(in-app connector, Standard only) to HTTP `Request` triggers before
PUT-ing the resource via `az rest` against
`Microsoft.Logic/workflows@2019-05-01`. The original Service Bus queue
name is preserved in workflow metadata (`x-udcsp-original-sb-queue`) so
prod migration can wire a managed Service Bus connection without
re-authoring the workflow.

**Production deployment requires App Service quota.** Before promoting
to `env=prod`, open a quota ticket on the target subscription requesting
`Workflow Standard – Total VMs ≥ 1` per regional resource group
(`udcsp-{dk,se,no}-logicapps-rg`). Without it, the workspace bicep
deploy in `Install-LogicApps.psm1` fails with
`InternalSubscriptionIsOverQuotaForSku`, and the platform falls back to
Consumption with the cold-start and VNet caveats above.

**Lifecycle workflows.** Two symmetric *closed-loop* Logic Apps pairs cover the
end-of-data-life journey:

| Concern | Workflow | Trigger | Notes |
|---|---|---|---|
| GDPR right-to-erasure (Art. 17) | [`services/logic-apps/workflows/gdpr-data-erase/`](../../services/logic-apps/workflows/gdpr-data-erase/workflow.json) | HTTP from citizen self-service | Tags records under archive-law hold as `pending-archive-release` instead of physically deleting them. |
| National-archive handover (DK Arkivloven · SE Arkivlagen · NO Arkivlova) | [`services/logic-apps/workflows/archive-handover-{dk,se,no}/`](../../services/logic-apps/workflows/) | Daily 02:00 CET / WET | Picks up records flagged by the erase workflow when their statutory hold expires; packages METS + PDF/A-3 (`Bevaring og Aflevering` for DK, `FGS-PSI` for SE, `Noark 5 SIP` for NO) and pushes via SFTP to the national archive. |

**Inbound document virus-scan.** Defender for Storage emits an Event Grid
event for every uploaded blob; the
[`services/functions/func-document-virus-scan/`](../../services/functions/func-document-virus-scan/index.js)
Function tags the blob `VirusScanStatus=Clean` or moves a malicious blob to
the `quarantine/` container and raises a Sentinel incident. NIS2 Art. 21(2)(d).

---

## 7. Case Management Architecture (Dynamics 365)

| Capability | D365 component |
|---|---|
| Case lifecycle | Customer Service Hub, BPF for residency / tax / social-benefit application types. |
| Queues & SLAs | Per-country, per-agency queues with SLAs aligned to the 4-day target. |
| Knowledge base | Multilingual KB shared across channels and consumed by the Citizen Assistant via RAG. |
| Caseworker AI | Copilot for Service for case summarisation, draft replies, and similar-case suggestions. |
| Omnichannel | Inbound from web chat, voice, email, SMS via Azure Communication Services connector. |
| Custom logic | Plugins / PCF controls only when out-of-the-box configuration is insufficient; otherwise Power Automate flows. |
| Data residency | One D365 environment per country, in the country's geo. |
| Integration | Dataverse → Fabric mirroring (no copy, low latency). |

---

## 8. Data & Analytics Architecture (Microsoft Fabric)

**Cross-reference.** Section 8 covers the **analytics destination** (Microsoft Fabric / OneLake) of every dataset the platform produces. The **operational and conversational sources** that feed Fabric — including the new "Conversations" zone introduced for AI Act Art. 26(6) compliance (≥ 6 months log retention) — are documented in [`data.md`](./data.md). This section deliberately stays focused on the analytics layer; for the per-zone storage decisions, retention matrix, and right-to-erasure playbook, read `data.md` first.

```mermaid
graph TB
    subgraph SOURCES["Sources"]
        SRC_D365["Dataverse (D365)"]
        SRC_LA["Logic Apps run history"]
        SRC_AI["Foundry traces & evaluations"]
        SRC_APIM["APIM telemetry"]
        SRC_PARTNER["Partner agency feeds"]
        SRC_TR["Foundry topic-router transcripts<br/>(via App Insights, post-audit)"]
        SRC_ACS["ACS event capture<br/>(SMS/Email/Voice events)"]
        SRC_ADLS_CONV["ADLS conversation blobs<br/>(voice .wav, email attachments)"]
        SRC_CL["Confidential Ledger<br/>(AI Act high-risk decisions, post-audit)"]
        SRC_PRV["Priva audit log<br/>(DSR fulfilment, post-audit)"]
    end

    subgraph FABRIC["Microsoft Fabric — OneLake"]
        BRONZE["Bronze — raw, append-only, per country"]
        SILVER["Silver — cleansed, conformed, per country"]
        GOLD["Gold — domain marts<br/>(citizen, case, eligibility, satisfaction)"]
        RTI["Real-Time Intelligence — KQL DB for live KPIs"]
        SEMANTIC["Semantic models (DirectLake)"]
    end

    subgraph FED["Federated Domain"]
        DOMAIN["Fabric Domain federating 3 workspaces"]
    end

    subgraph CONS["Consumers"]
        PBI_OPS["Power BI Premium — operational (internal)"]
        PBI_EXEC["Power BI Premium — executive cross-country (internal)"]
        WEB_HTML["apps/web — HTML/JS Chart.js components<br/>(citizen-facing, post-audit · replaces PBI Embedded)"]
        PBI_AUD["Power BI Premium — auditor (internal)"]
        AI_FB["Feedback to Foundry training datasets"]
    end

    SRC_D365 --> BRONZE
    SRC_LA --> BRONZE
    SRC_AI --> BRONZE
    SRC_APIM --> BRONZE
    SRC_PARTNER --> BRONZE
    SRC_TR --> BRONZE
    SRC_ACS --> BRONZE
    SRC_ADLS_CONV --> BRONZE
    SRC_CL --> BRONZE
    SRC_PRV --> BRONZE

    BRONZE --> SILVER --> GOLD --> SEMANTIC
    SILVER --> RTI
    GOLD --> DOMAIN
    SEMANTIC --> PBI_OPS
    SEMANTIC --> PBI_EXEC
    GOLD --> WEB_HTML
    SEMANTIC --> PBI_AUD
    GOLD --> AI_FB

    classDef src fill:#FCE4EC,stroke:#AD1457,color:#880E4F
    classDef fab fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef dom fill:#E0F2F1,stroke:#00796B,color:#004D40
    classDef cons fill:#E3F2FD,stroke:#1565C0,color:#0D47A1

    class SRC_D365,SRC_LA,SRC_AI,SRC_APIM,SRC_PARTNER,SRC_TR,SRC_ACS,SRC_ADLS_CONV,SRC_CL,SRC_PRV src
    class BRONZE,SILVER,GOLD,RTI,SEMANTIC fab
    class DOMAIN dom
    class PBI_OPS,PBI_EXEC,WEB_HTML,PBI_AUD,AI_FB cons
```

**Highlights**

- Each country owns its **Fabric workspace**; the **Fabric Domain** federates curated gold-layer products without copying raw data.
- **OneLake shortcuts** allow zero-copy access where a country has explicitly published a data product.
- **Real-Time Intelligence** powers live SLA dashboards (e.g. queues, average processing time).
- **Power BI Premium semantic models** are the only analytics surface for **internal** users (ops / exec / auditor); citizen-facing portal insights moved to lightweight **HTML/JS Chart.js** components in `apps/web/src/components/insights/` (post-audit refactor — Power BI Embedded eliminated to reduce dependency surface).
- A **feedback loop** anonymises closed cases and pushes them back to Foundry as training/evaluation datasets.
- New conversation sources (Foundry topic-router transcripts via App Insights, ACS event capture for SMS/Email/Voice, ADLS conversation blobs, Confidential Ledger high-risk decisions, Priva DSR audit trail) feed Bronze nightly — this is what makes the platform AI Act Art. 26(6) compliant (≥ 6 months log retention) **with cryptographic tamper-evidence** (Confidential Ledger).

---

## 9. Governance, Compliance & EU AI Act

```mermaid
graph TB
    subgraph PURV["Microsoft Purview"]
        CAT["Unified Catalog"]
        CLASS["Classifications & Sensitivity Labels"]
        LIN["Lineage"]
        DLP["Data Loss Prevention"]
        POL["Data-sharing policies"]
        AIREG["AI Asset Registry"]
    end

    subgraph DOCS["Compliance Artefacts"]
        DPIA["DPIA per use case"]
        ROPA["Record of Processing Activities"]
        AIACT["EU AI Act technical documentation"]
        DECL["Conformity declarations"]
    end

    subgraph FOUNDRY_GOV["Foundry"]
        FAGENTS["Agents"]
        FEVAL["Evaluations"]
        FSAFETY["Content Safety reports"]
    end

    subgraph PLATFORM["Platform"]
        D365G["D365 audit"]
        APIMG["APIM logs"]
        FABG["Fabric data products"]
    end

    PURV -. catalogues .-> D365G
    PURV -. catalogues .-> FABG
    PURV -. catalogues .-> APIMG
    PURV -. registers .-> FAGENTS
    AIREG --> AIACT
    AIREG --> DECL
    FEVAL --> AIACT
    FSAFETY --> AIACT
    DPIA --> ROPA

    classDef p fill:#FFEBEE,stroke:#C62828,color:#B71C1C
    classDef d fill:#FFF3E0,stroke:#E65100,color:#BF360C
    classDef f fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef pl fill:#E0F2F1,stroke:#00796B,color:#004D40

    class CAT,CLASS,LIN,DLP,POL,AIREG p
    class DPIA,ROPA,AIACT,DECL d
    class FAGENTS,FEVAL,FSAFETY f
    class D365G,APIMG,FABG pl
```

**Key controls**

| Regulation / standard | Control(s) |
|---|---|
| **GDPR** | Lawful basis registered per use case; ROPA in Purview *and* in [`governance/gdpr/ropa.md`](../../governance/gdpr/ropa.md); data minimisation enforced via API Management redaction policies; subject-rights workflow in Logic Apps; DPIA per high-risk processing. |
| **GDPR Art. 28 (sub-processors)** | Public sub-processor register at [`governance/gdpr/sub-processors.md`](../../governance/gdpr/sub-processors.md) with 30-day citizen pre-notice and an append-only change log. EU Data Boundary for Microsoft Cloud is the master transfer mechanism. |
| **GDPR Art. 33-34 + NIS2 Art. 23 (breach)** | Operational playbook with the 24h / 72h / 30d clocks at [`governance/security/breach-notification.md`](../../governance/security/breach-notification.md). |
| **EU AI Act** | Risk classification per agent, technical documentation, post-market monitoring plan ([`governance/ai-act/procedures/post-market-monitoring.md`](../../governance/ai-act/procedures/post-market-monitoring.md)), serious-incident procedure with 15/10/2-day deadlines ([`governance/ai-act/procedures/serious-incident-reporting.md`](../../governance/ai-act/procedures/serious-incident-reporting.md)), human oversight, logging of inputs/outputs (Foundry tracing), conformity assessment for high-risk (Eligibility Pre-Assessor). |
| **Sector EU directives** (e.g. eIDAS 2.0, EUDI Wallet, SDG / Single Digital Gateway, Once-Only Technical System) | eIDAS bridge in Entra ([`governance/identity/identity-providers.md`](../../governance/identity/identity-providers.md)); EUDI-Wallet readiness ([`governance/identity/eudi-wallet-readiness.md`](../../governance/identity/eudi-wallet-readiness.md)); SDG-compliant API contracts in APIM; OOTS connectors for evidence exchange. |
| **National DPA differences** | Per-country Purview policy packs; per-country Logic Apps orchestrations; per-country sensitivity label sets. |
| **WCAG 2.1 AA** | Design system with audited components; axe-core in CI/CD; manual annual audit; accessibility statements per portal. |
| **ePrivacy Directive (2002/58/EC, art. 5(1))** | Cookie banner with a per-purpose consent log; non-essential cookies (Microsoft Clarity, product analytics) are gated behind explicit opt-in. |
| **ISO 27001 / SOC 2** *(operational baseline)* | Defender for Cloud, Sentinel, Key Vault, managed identities, Azure Policy initiatives at [`infra/security/azure-policy/baseline-initiative.json`](../../infra/security/azure-policy/baseline-initiative.json) (MCSB + NIST 800-53 + ISO 27001:2013 built-in initiatives). |

**Storage retention and right-to-erasure operational playbook**: documented in [`data.md`](./data.md) §§ 5, 6, and 9.

---

## 10. Security & Network Architecture

- **Network** — Hub-and-spoke per sovereign zone, peered via the federation hub VNet. **Private Endpoints** on every PaaS service. No public ingress except via **Azure Front Door + WAF** and APIM's external gateway. **Azure DDoS Protection Standard** is bound to every VNet that fronts a public IP (NIS2 Art. 21(2)(c) — defence in depth at L3/L4 in addition to the L7 protection from Front Door).
- **Identity** — Managed identities everywhere; no service principals with secrets in code; PIM for elevated access; Conditional Access on the workforce tenant. **Microsoft Entra Permissions Management (CIEM)** continuously inventories effective entitlements across the 3 sovereign tenants and produces drift alerts; **Azure Bastion (Standard)** is the only path for caseworker / SRE shell access — no jump boxes, no public RDP/SSH.
- **Verifiable credentials** — **Microsoft Entra Verified ID** is the issuer + verifier surface for the EUDI Wallet bridge (eIDAS 2.0). The OpenID4VP / OpenID4VCI flows live in `infra/identity/verified-id/`; see [`governance/identity/eudi-wallet-readiness.md`](../../governance/identity/eudi-wallet-readiness.md) for the rollout matrix per country.
- **Secrets** — **Azure Key Vault** with RBAC and Private Endpoint; secrets accessed via managed identity references; no plain-text secrets in app settings.
- **Threat protection** — **Microsoft Defender for Cloud** (CSPM + workload protection), **Microsoft Defender for APIs** plugged into APIM (runtime protection on the only ingress point of the 47 consolidated portals — discovers shadow APIs, detects anomalies in token use, sensitive-data leakage), **Microsoft Sentinel** as SIEM/SOAR, with playbooks for AI-specific incidents (e.g. prompt injection, model exfiltration). Defender for Storage scans every inbound document and emits an Event Grid event consumed by `func-document-virus-scan` (Clean → tag · Malicious → tag + quarantine + Sentinel incident · Unknown → manual-review queue).
- **Confidential computing for high-risk AI** — The Eligibility Pre-Assessor (AI Act high-risk) inference orchestration runs inside an **Azure Confidential Container App** (SEV-SNP attested TEE). The citizen prompt and the data fetched from cross-border partners are encrypted in memory during inference; attestation evidence is stored alongside the decision in **Azure Confidential Ledger** (CCF-backed, tamper-evident) for AI Act Art. 26(6) compliance.
- **Audit retention** — Sentinel + Log Analytics retain audit and security telemetry for **180 days hot** then 7 years in cold archive (NIS2 Art. 21(2)(g) + Art. 23 evidence baseline). **Confidential Ledger** holds the cryptographic ledger of every high-risk AI decision indefinitely (append-only, hardware-attested).
- **BCDR — Backup & Site Recovery** — **Azure Backup** vaults are deployed per country (Postgres + Redis + critical Storage accounts + VMs hosting agent runtimes); **Azure Site Recovery** replicates to a paired in-EU region within the same sovereign zone. RPO ≤ 15 min, RTO ≤ 4 h documented in `infra/security/backup-asr/`. Mandatory for ISO 27001:2022 A.5.30 + NIS2 Art. 21(2)(c) audit.
- **Resilience proof — Chaos engineering** — **Azure Chaos Studio** experiments target the citizen-facing path (Front Door → APIM → Container Apps → Postgres) on a monthly cadence. The 99.9 % SLO announced in §11 is empirically validated through experiments that inject region failover, NSG isolation and Postgres failover.
- **Citizen-side privacy controls** — ePrivacy-compliant **cookie consent banner** with per-purpose toggles; Microsoft Clarity and any product analytics are gated behind explicit opt-in. Mobile push notifications (`apps/mobile/src/notifications/registerPushToken.ts`) require an in-app consent flag *before* the OS-level prompt is requested.
- **Subject Rights Requests** — **Microsoft Priva** industrialises the GDPR DSR fulfilment pipeline (right of access, erasure, portability, rectification). The legacy `gdpr-data-erase` and `gdpr-data-export` Logic Apps still run as the *executor*, but Priva is the **system of record** for SLA tracking and DPA evidence. See [`governance/priva/`](../../governance/priva/) for the operating model.
- **Container supply chain** — Images signed and scanned; **ACR** with content trust; SBOM generated and stored.
- **Data protection** — At-rest encryption with customer-managed keys (per country); TLS 1.3 in transit; field-level encryption for the most sensitive PII (e.g. national ID). Operational stores are now **Azure Database for PostgreSQL Flexible Server** + **Azure Cache for Redis** (post-audit consolidation; Azure SQL and Cosmos DB removed — see [`plan_post_audit.md`](./plan_post_audit.md)).
- **API security** — OAuth 2.0 + PKCE on all citizen flows; mutual TLS for partner integrations; APIM rate-limiting and IP filtering; OWASP Top 10 + LLM Top 10 controls; Defender for APIs runtime detection on every published API.
- **Sovereignty enforcement (policy-as-code)** — Five Azure Policy initiatives in [`infra/landing-zone/azure-policy/`](../../infra/landing-zone/azure-policy/) and [`infra/security/azure-policy/`](../../infra/security/azure-policy/) deny non-EU regions, public IPs on data resources, missing tags, missing encryption-at-rest, and missing CMK; covered end-to-end by the conformance test pack at [`tests/conformance/sovereignty/`](../../tests/conformance/sovereignty/).

---

## 11. Observability & Operations

| Concern | Tool |
|---|---|
| Metrics & logs | **Azure Monitor + Log Analytics** (per zone) federated into a shared workspace, **180-day** hot retention. |
| Distributed tracing | **Application Insights** with a unified `correlation-id` propagated from APIM through Logic Apps, Functions, D365 plugins, and Foundry traces. |
| Dashboards | **Power BI** for business KPIs; Azure Workbooks for SRE; Foundry built-in dashboards for AI quality. |
| Alerting | Azure Monitor alerts → Action Groups → on-call rotation in PagerDuty / Teams. |
| AI quality | Foundry **Evaluations** (continuous) + drift monitors; alerts on safety / accuracy regressions. |
| Document virus-scan telemetry | Defender-for-Storage scan results emit Event Grid events consumed by `func-document-virus-scan`; outcomes (`Clean` / `Malicious` / `Unknown`) carry the `traceparent` and the country tag and surface in the same App Insights dashboard. |
| SLOs | Citizen-facing channels: 99.9 %; AI agent latency p95 < 2 s; case-creation latency p95 < 5 s. |

---

## 12. Multilingual & Inclusivity Strategy

UDCSP treats **language and accessibility as first-class platform invariants**. Every layer is designed to behave correctly in the **12 supported languages** and to be usable by citizens with disabilities.

### 12.1 Language Coverage Matrix

| Layer | Component | How multilingualism is implemented |
|---|---|---|
| Channels — Web | Static Web Apps + design system | **ICU MessageFormat** for plurals/genders; per-locale resource bundles; language switcher; locale-aware date/number formatting; right-to-left support where applicable. |
| Channels — Mobile | Mobile shell | Same i18n pipeline; OS-level locale propagation. |
| Channels — Voice | ACS Call Automation + voice orchestrator (`apps/voice/call-automation/`) + GPT-4o Realtime | Voice channel runs on a custom Container App that bridges ACS bidirectional audio to GPT-4o Realtime (native STT/TTS/VAD/barge-in in 12 languages); Foundry topic-router exposed as a function tool keeps the brain stateless and shared with chat. AI Speech is reserved for D365 pre-orchestrator menus and post-call analytics. |
| Conversational AI | Microsoft Foundry — `topic-router` agent | Multi-turn topics authored once and reviewed per locale; language detection on entry; multilingual entities; per-locale fallback rules; slot-filling state held in **Azure Cache for Redis**. Single conversational brain in Foundry. |
| AI Brain — Classifier | Foundry agent | Multilingual model; eval set covers all 12 languages with golden examples per agency type. |
| AI Brain — Translator | Foundry agent | Hybrid Azure OpenAI + Azure AI Translator; **glossary** per agency to preserve administrative terminology; quality gate before outbound communication. |
| AI Brain — Citizen Assistant | Foundry agent | RAG knowledge base indexed per language; cross-lingual retrieval as fallback; safety filters per locale. |
| AI Brain — Eligibility | Foundry agent | Decision lineage and reasoning translated for caseworker + citizen views; never auto-translates legal text without human review. |
| AI Brain — Document Extractor | AI Document Intelligence + LLM | Multilingual OCR; field labels normalised to a canonical schema; per-country document templates supported. |
| Case Management | D365 Customer Service *(roadmap — currently a model-driven Power App on the shared Dataverse env `org939d8f07` until per-country D365 CS envs are provisioned; same `udcsp_application` schema for drop-in replacement)* | Multilingual KB; per-language SLA queues; caseworker UI in their working language; outbound mail templates per locale, edited before send. |
| Notifications | Azure Communication Services | Templates per locale (email, SMS, voice); fallback to citizen-preferred language. |
| Data & Insights | Microsoft Fabric + Power BI | Locale dimension on every fact table; semantic models slice CSAT, accuracy, SLA, and content-safety metrics **by language** to detect inequity. |
| Governance | Purview | Sensitivity labels and policies localised; DPIAs available per language; AI Act registry includes per-language evaluation evidence. |

### 12.2 The 12 Languages

Coverage targets the **official**, **most-common minority** and **cross-border working** languages of Denmark, Sweden, and Norway as required by the **EU Single Digital Gateway**:

1. Danish, 2. Swedish, 3. Norwegian Bokmål, 4. Norwegian Nynorsk, 5. Sámi (Northern), 6. English, 7. German, 8. French, 9. Polish, 10. Arabic, 11. Ukrainian, 12. Finnish.

> The exact list will be ratified per country DPA / language council in Wave 0; the platform is designed to add or substitute languages without code changes.

### 12.3 Accessibility Strategy (WCAG 2.1 AA)

| Practice | How |
|---|---|
| **Design system first** | Audited, accessible components shared across all citizen portals; no ad-hoc UI. |
| **Automated CI gate** | `axe-core` and Lighthouse accessibility audits run on every PR; build fails below the agreed threshold. |
| **Manual audit** | Annual third-party WCAG 2.1 AA audit per portal; findings tracked as platform debt. |
| **Voice channel parity** | Citizens who cannot use a screen can complete every primary journey via the voice channel (ACS Call Automation + voice orchestrator + GPT-4o Realtime). Warm-transfer to a human caseworker is wired in code but gated until per-country D365 Customer Service is provisioned — until then, the assistant offers a verbal callback closure ("a caseworker will call you back within 2 business days"). |
| **Caseworker assistance** | Caseworkers can complete forms on behalf of citizens and capture verifiable consent. |
| **Plain language** | Foundry **Citizen Assistant** is prompted to reply in plain, jargon-free language at a defined reading level per locale. |
| **Accessibility statements** | Each portal publishes a per-locale accessibility statement and a feedback channel routed to D365. |

### 12.4 Multilingual Test & Evaluation Loop

```mermaid
graph LR
    SYNTH["Synthetic personas & content<br/>(A15 — 12 languages)"]
    EVALS["Foundry evaluations per language<br/>accuracy · BLEU · safety · bias"]
    PROD["Production traffic<br/>(traced & sampled)"]
    DRIFT["Drift & equity monitor<br/>per-language KPIs in Power BI"]
    BACK["Caseworker feedback loop<br/>flag mistranslations / bad answers"]
    SYNTH --> EVALS
    PROD --> DRIFT
    BACK --> EVALS
    DRIFT --> EVALS
    EVALS -. blocks promotion .-> PROD

    classDef a fill:#FFF3E0,stroke:#E65100,color:#BF360C
    classDef b fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    class SYNTH,EVALS a
    class PROD,DRIFT,BACK b
```

---

## 13. End-to-End Flow Examples

### 13.1 Cross-border residency transfer (DK citizen moving to SE)

```mermaid
sequenceDiagram
    autonumber
    participant Citizen
    participant Web as Web Portal (SE)
    participant EXTID as Microsoft Entra External ID SE
    participant Entra as Entra Hub
    participant APIM as API Management
    participant Class as Foundry — Classifier
    participant Trans as Foundry — Translator
    participant Doc as Foundry — Doc Extractor
    participant Elig as Foundry — Eligibility
    participant LA as Logic Apps SE
    participant D365 as D365 SE
    participant DK as Partner DK Agency
    Citizen->>Web: Start "Move to Sweden" application
    Web->>EXTID: Login (BankID)
    EXTID->>Entra: Federated login
    Entra-->>Web: ID token (with country claim)
    Citizen->>Web: Upload DK passport, lease
    Web->>APIM: Submit application
    APIM->>Class: Classify intent + language
    APIM->>Trans: Translate uploaded docs DA→SV
    APIM->>Doc: Extract data from passport & lease
    APIM->>Elig: Pre-assess eligibility
    Elig-->>APIM: Recommendation + lineage
    APIM->>LA: Trigger workflow
    LA->>DK: Request residency confirmation (claims-based, no PII copy)
    DK-->>LA: Confirmation token
    LA->>D365: Create case + attach AI recommendation
    D365-->>Citizen: Status notification (via ACS, in DA + SV)
    Note over D365: Caseworker reviews AI recommendation, decides
    D365-->>Citizen: Final decision (4 days target)
```

### 13.2 Citizen Assistant (voice) answering a tax question

```mermaid
sequenceDiagram
    autonumber
    participant Citizen
    participant ACS as ACS Call Automation (PSTN)
    participant Orch as Voice Orchestrator<br/>(apps/voice/call-automation)
    participant Realtime as Azure OpenAI<br/>GPT-4o Realtime
    participant APIM as APIM /agents/topic-router
    participant TR as Foundry — Topic Router
    participant Redis as Redis (session)
    participant Class as Foundry — Classifier
    participant Assist as Foundry — Citizen Assistant
    participant KB as Knowledge Base (Fabric + SP)
    participant Safety as Content Safety
    participant D365 as D365 Voice Workstream
    Citizen->>ACS: Calls country PSTN number
    ACS->>Orch: IncomingCall (Event Grid) → AnswerCall + media-streaming WSS
    Orch->>Realtime: Open Realtime WS (session.update with TOOL_DEFS + IVR welcome + recording disclosure)
    ACS->>Orch: Bidirectional PCM 16k audio (citizen voice)
    Orch->>Realtime: input_audio_buffer.append (frame proxy)
    Realtime-->>Realtime: server-VAD turn detection + barge-in
    Realtime->>Orch: response.function_call lookup_topic_router
    Orch->>APIM: POST /agents/topic-router/messages<br/>(channel=voice, x-channel-actor=voice, x-call-connection-id)
    APIM->>TR: Forward (after JWT + actor + rate-limit)
    TR->>Redis: Hydrate session state
    TR->>Class: Classify intent + language
    TR->>Assist: Generate answer
    Assist->>KB: Retrieve grounding documents
    Assist->>Safety: Check input + output
    Safety-->>Assist: Approved
    Assist-->>TR: Grounded answer + sources
    TR->>Redis: Persist updated state
    TR-->>APIM: { reply, intent, escalate, citations }
    APIM-->>Orch: Same payload
    Orch->>Realtime: function_call_output → response.create
    Realtime->>Orch: response.audio.delta (PCM 24k chunks)
    Orch->>ACS: Audio frames
    ACS->>Citizen: Spoken answer
    alt Citizen says "agent" or escalate=true
        Realtime->>Orch: response.function_call escalate_to_human
        Orch->>ACS: transferCallToParticipant(D365 queue, udcspEscalation context)
        ACS->>D365: Warm transfer (caseworker sees summary)
    end
```

### 13.3 GDPR right-to-erasure with statutory archive hold

```mermaid
sequenceDiagram
    autonumber
    participant Citizen
    participant Web as Web Portal
    participant APIM as API Management
    participant Erase as Logic App<br/>gdpr-data-erase
    participant Hold as Retention-hold check<br/>(Arkivloven · Arkivlagen · Arkivlova)
    participant DV as Dataverse
    participant Lake as OneLake (Bronze/Silver/Gold)
    participant Cos as Postgres + Redis
    participant AppI as Application Insights
    participant Priva as Microsoft Priva
    participant Purv as Purview lineage
    participant Notify as Citizen notification
    participant Arch as Logic App<br/>archive-handover-{dk,se,no}
    participant Archive as National Archive<br/>(Statens Arkiver · Riksarkivet · Arkivverket)

    Citizen->>Web: "Delete my data" (Art. 17)
    Web->>APIM: POST /privacy/erase + identity proof
    APIM->>Priva: Create DSR ticket (system of record)
    Priva->>Erase: Trigger executor workflow
    Erase->>Hold: Which records are under archive law?
    Hold-->>Erase: list of records to TAG (not delete)
    par Physical erase outside hold
        Erase->>DV: Erase tagged-removable records
        Erase->>Lake: Tombstone non-archive partitions
        Erase->>Cos: Delete drafts / cache from Postgres + Redis
        Erase->>AppI: Purge customDimensions
    end
    Erase->>DV: Tag held records "pending-archive-release"
    Erase->>Purv: Emit udcsp.gdpr.erase.completed.v2
    Erase->>Priva: Report completion + DPA evidence package
    Erase->>Notify: Confirm to citizen + outline what's held & why
    Notify-->>Citizen: Confirmation + held-records explanation

    Note over Arch: Daily 02:00 (CET / WET)
    Arch->>DV: Query "pending-archive-release" + due today
    Arch->>Lake: Export Gold case projection
    Arch->>Archive: Upload package (METS / Bevaring og Aflevering / FGS-PSI / Noark 5)
    Archive-->>Arch: Signed acknowledgement
    Arch->>Purv: Emit udcsp.archive.handover.completed.v2
    Arch->>DV: Mark record as transferred
```

This flow shows that the platform **never silently keeps** data the citizen
asked to delete — it deletes everything outside the statutory hold, and
makes the held records' eventual destination (the national archive) visible
to the citizen.

---

## 14. Service Inventory

### 14.0 Identity deviation from the case study's B2C mandate

The case study lists **Azure AD B2C** as one of nine mandatory Azure services. **As of 1 May 2025, Azure AD B2C is no longer available to new customers** ([Microsoft Learn — Tutorial: Create an Azure AD B2C tenant](https://learn.microsoft.com/en-us/azure/active-directory-b2c/tutorial-create-tenant)). Microsoft's [announced successor](https://learn.microsoft.com/en-us/entra/external-id/customers/concept-supported-features-customers) is **Microsoft Entra External ID** (CIAM external tenants), which is the product line currently offered, supported, and extended.

UDCSP therefore substitutes Microsoft Entra External ID for Azure AD B2C across the entire platform. The substitution is intentional and documented; no other case-study service is changed.

**Capability mapping — every B2C feature relied on by the case study is preserved or improved:**

| Case study capability (B2C term) | UDCSP implementation (Entra External ID term) | Notes |
|---|---|---|
| Per-country B2C tenant            | Per-country **External (CIAM) tenant** (`Microsoft.AzureActiveDirectory/ciamDirectories`) | Same isolation model: one tenant per sovereign zone (DK / SE / NO). |
| `B2C_1A_*` custom policies (XML)  | **User flows** + **Custom Authentication Extensions** (JSON, Microsoft Graph beta) | Lower complexity; same extensibility for token augmentation, federation, and custom claims. See [`infra/identity/external-id/user-flows/`](../../infra/identity/external-id/user-flows/). |
| eIDAS bridge via Identity Experience Framework | eIDAS bridge as an **Azure Function** invoked by an `onTokenIssuanceStart` custom authentication extension | First-class, supported integration pattern. |
| `*.b2clogin.com` authority URL    | `*.ciamlogin.com` authority URL                                                            | Same MSAL.js client; only the host changes. |
| Self-service password reset (B2C user flow) | Native **SSPR** in External ID                                                       | Tenant-level, multi-method (email today, SMS roadmap). |
| Profile editing (B2C user flow)   | **My Account portal** + Microsoft Graph `PATCH /me`                                        | Server-side write filter via `profile-edit.json`. |
| Conditional Access for citizens   | Conditional Access available **natively in External ID** (preview / GA per region)         | Country, risk, MFA, device-state policies. |
| Multilingual UI in 12 languages   | Tenant **branding localizations** in External ID                                            | Same 12-language scope as the rest of the platform. |
| MFA, social logins, federated IdPs | All supported in External ID                                                              | Equivalent or wider IdP catalogue. |
| Auditing of every sign-in / token | `SigninLogs` + `AuditLogs` in Entra External ID                                            | Same Sentinel / Log Analytics ingestion path; analytics rules updated accordingly. |

**Operational consequences of the substitution:**

1. The installer (`scripts/install/Install-UDCSP.ps1` phase `Identity`) provisions `ciamDirectories` per country instead of `b2cDirectories`.
2. The OpenID discovery URL pattern is `https://<tenant>.ciamlogin.com/<tenant>.onmicrosoft.com/<UserFlow>/v2.0/.well-known/openid-configuration` (no `?p=` query parameter).
3. APIM `validate-jwt` policies (`services/apim/policies/jwt-validate-external-id.xml`) point at the External ID issuer. **Operational note (May 2026)**: the `eligibility-checks` API was historically misconfigured to use `jwt-validate-entra` (Workforce OIDC) and silently 401'd every citizen request — fixed in commit `ec02efb`; all citizen-facing APIs now consistently include `jwt-validate-external-id` (`citizen-applications`, `citizen-insights`, `eligibility-checks`, `documents`, `data-export`, `notifications`, `case-management`, `agent-citizen-assistant`, `agent-classifier`).
4. Every Sentinel analytics rule and Application Insights alert that monitors authentication failures has been re-named (`external-id-failed-signin-spike`, `external-id-error-rate`); the underlying KQL targets the same `SigninLogs` table — telemetry continuity is preserved.
5. CSP `connect-src` allow-list on the citizen Static Web Apps now lists `https://*.ciamlogin.com`.
6. Tests against the auth flow (`tests/security/dast/`, `tests/e2e/fixtures/auth.ts`) reference `EXTERNAL_ID_*` environment variables.

**Why this is the correct architectural call rather than a deviation to challenge:** the case study was written before the B2C retirement announcement; following its B2C mandate literally would force any new customer to deploy a product they cannot purchase. The substitution preserves intent (sovereign customer-identity-and-access-management with eIDAS federation across DK/SE/NO) while using a product Microsoft will continue to invest in.

### 14.1 Mandatory (case study)

| Service | Where it lives in the architecture |
|---|---|
| Microsoft Entra External ID | §4 Identity Federation Detail |
| Microsoft Entra ID | §4 Identity Federation Detail |
| Azure OpenAI *(via Microsoft Foundry)* | §5 AI Architecture |
| Microsoft Fabric | §8 Data & Analytics Architecture |
| Dynamics 365 Customer Service | §7 Case Management Architecture |
| Azure API Management | §6 Integration & Workflow Architecture |
| Microsoft Purview | §9 Governance, Compliance & EU AI Act |
| Azure Logic Apps | §6 Integration & Workflow Architecture |
| Power BI | §8 Data & Analytics Architecture |

### 14.2 Additional Azure services included in the platform

| Service | Role |
|---|---|
| **Microsoft Foundry** | AI agent runtime, model catalog, evaluations, tracing, AI Act registry. Hosts the `topic-router` agent that owns conversational orchestration across web, mobile and voice. |
| **Azure Front Door + WAF** | Global edge, TLS termination, L7 WAF, OWASP rule set. |
| **Azure DDoS Protection Standard** | L3/L4 protection on every VNet that fronts a public IP — defence-in-depth complement to Front Door, expected by NIS2. *(Post-audit addition.)* Bicep at [`infra/security/ddos/`](../../infra/security/ddos/). |
| **Azure Static Web Apps** | Hosting for citizen web portals. |
| **Azure Container Apps** | Domain microservices. |
| **Azure Confidential Container Apps** | TEE-attested runtime (SEV-SNP) for the Eligibility Pre-Assessor (AI Act high-risk). *(Post-audit addition.)* Bicep at [`infra/security/confidential-compute/`](../../infra/security/confidential-compute/). |
| **Azure Functions** | Event-driven glue and lightweight integrations. |
| **Azure Database for PostgreSQL — Flexible Server** | Operational OLTP store; replaces both the original Azure SQL Database and Azure Cosmos DB workloads (relational data + JSONB documents in a single engine; one OLTP engine instead of two; CMK, private endpoint, geo-zone redundant backup). *(Post-audit replacement.)* Bicep at [`infra/data/postgresql/`](../../infra/data/postgresql/). |
| **Azure Cache for Redis** | Conversational session state for the topic-router (slot-filling), short-lived caches for draft applications and rate-limit counters. Bicep at [`infra/data/redis/`](../../infra/data/redis/). |
| **Azure Storage / ADLS Gen2** | Three per-country Storage accounts: citizen-uploads/ (documents), voice-recordings/ (PSTN audio + STT transcripts, WORM 90 days), email-attachments/ (email binaries). All CMK-encrypted. See data.md § 3.2. |
| **Azure Backup + Azure Site Recovery** | BCDR for Postgres + Redis + critical Storage + agent VMs / Container App environments; per-country vaults; RPO ≤ 15 min / RTO ≤ 4 h. *(Post-audit addition; previously absent.)* Bicep at [`infra/security/backup-asr/`](../../infra/security/backup-asr/). |
| **Azure Confidential Ledger** | Tamper-evident, CCF-backed log of every high-risk AI decision (AI Act Art. 26(6)) and every Foundry lineage event that needs cryptographic integrity beyond what App Insights / Fabric can offer. *(Post-audit addition.)* Bicep at [`infra/security/confidential-ledger/`](../../infra/security/confidential-ledger/). |
| **Azure Chaos Studio** | Resilience experiments (region failover, NSG isolation, Postgres failover) that empirically validate the 99.9 % citizen-channel SLO. *(Post-audit addition.)* Bicep at [`infra/security/chaos-studio/`](../../infra/security/chaos-studio/). |
| **Azure Bastion (Standard)** | Sole admin shell-access path for SREs and caseworker support — no jump boxes, no public RDP/SSH. *(Post-audit addition.)* Bicep at [`infra/identity/bastion/`](../../infra/identity/bastion/). |
| **Microsoft Entra Permissions Management (CIEM)** | Cross-tenant entitlement audit + drift detection across the 3 sovereign tenants. *(Post-audit addition.)* Onboarding model at [`infra/identity/ciem/`](../../infra/identity/ciem/). |
| **Microsoft Entra Verified ID** | Issuer + verifier surface for the EUDI Wallet bridge (eIDAS 2.0). OpenID4VP / OpenID4VCI flows in [`infra/identity/verified-id/`](../../infra/identity/verified-id/). *(Post-audit addition — moves the platform from "EUDI readiness" to active VC issuance/verification.)* |
| **Microsoft Priva** | System-of-record for GDPR Data Subject Rights (access, erasure, portability, rectification) — SLA tracking + DPA evidence. The legacy `gdpr-data-erase` / `gdpr-data-export` Logic Apps still execute the work; Priva orchestrates and proves it. *(Post-audit addition.)* See [`governance/priva/`](../../governance/priva/). |
| **Azure Service Bus** | Reliable command messaging. |
| **Azure Event Grid** | Domain eventing. |
| **Azure Communication Services** | Voice, SMS, email channels. |
| **Azure Communication Services Event Capture** | Append-only ACS event log (SMS / Email / Voice events) routed via Event Hubs to ADLS Gen2 acs-events/. See data.md § 3.3. |
| **Azure AI Search** | Per-citizen long-term conversational memory (vector store with ACL row-level by citizen_id, TTL 12 months rolling). See data.md § 3.4. |
| **Azure AI Speech** | Speech-to-text and text-to-speech for the voice channel. |
| **Azure AI Translator** | High-quality translation across the 12 languages. |
| **Azure AI Document Intelligence** | OCR and structured extraction from citizen documents. |
| **Azure AI Content Safety** | Input/output safety filtering for every agent. |
| **Azure Key Vault** | Secrets, keys, certificates with private endpoints. |
| **Microsoft Defender for Cloud** | CSPM and workload protection. |
| **Microsoft Defender for APIs** | Runtime protection on APIM (the only ingress point of the 47 consolidated portals) — shadow-API discovery, sensitive-data leakage, abnormal token use. *(Post-audit addition.)* Bicep at [`infra/security/defender/`](../../infra/security/defender/). |
| **Microsoft Sentinel** | SIEM / SOAR. |
| **Azure Monitor + Log Analytics + Application Insights** | Observability. Also serves as Foundry AI trace store — see data.md § 3.3. |
| **Azure Container Registry** | Container image registry with content trust. |
| **Azure Policy + Blueprints** | Guardrails, compliance enforcement. |
| **Azure DevOps / GitHub Actions** | CI/CD. |
| **Azure Bicep / Terraform** | Infrastructure as Code. |

> **Removed in the post-audit refactor** (rationale in [`plan_post_audit.md`](./plan_post_audit.md)):
> - **Azure SQL Database** — fused into Postgres (no justification to run two OLTP engines).
> - **Azure Cosmos DB** — fused into Postgres (JSONB) + Redis (ephemeral cache / session).
> - **Microsoft Copilot Studio** — folded into Foundry as the `topic-router` agent (one brain, one API surface).
> - **Power BI Embedded** for the citizen-facing portal — replaced by lightweight HTML/JS Chart.js components in `apps/web/src/components/insights/`. Power BI **Premium** is **kept** for internal users (operational, executive, auditor dashboards).

---

## 15. Deployment & Developer Experience

UDCSP is deployable end-to-end from a clean Azure tenant by a **single PowerShell entry point**: `scripts/install/Install-UDCSP.ps1`. The script — owned by the dedicated installer agent **A16** — is **idempotent**, **environment-aware** (`dev`, `test`, `preprod`, `prod`), **zone-aware** (DK / SE / NO / all), and supports an optional `-SeedSyntheticData` switch that triggers A15's regeneration pipelines so a DEV environment comes up already populated with realistic multilingual personas, applications and conversations.

```mermaid
graph TB
    DEV["👩‍💻 Developer / Evaluator<br/>clean Azure tenant"]:::dev
    INSTALL["🛠️ <b>Install-UDCSP.ps1</b><br/><i>PowerShell 7+ · idempotent · CI-validated</i>"]:::install
    PRE["🔍 Pre-flight Checks<br/>CLIs · subs · quotas · regions"]:::step
    INFRA["🏛️ Bicep Modules<br/>landing zone · identity · security · data · obs · APIM"]:::step
    AI["🧠 Foundry & AI<br/>hubs · projects · agents · evals · AI Act registry"]:::step
    APPS["💻 Apps & Channels<br/>SWA · mobile · ACS · Foundry topic-router · D365 solutions"]:::step
    GOV["🛡️ Governance<br/>Purview accounts · scans · policy packs"]:::step
    SEED["🎲 Synthetic Data Seed (A15)<br/>DK · SE · NO · 12 languages"]:::seed
    SMOKE["✅ Smoke Tests (A14)<br/>+ Deployment Report"]:::smoke
    CLEAN["🧹 Remove-UDCSP.ps1<br/>tear-down counterpart"]:::clean

    DEV --> INSTALL
    INSTALL --> PRE
    PRE --> INFRA
    INFRA --> AI
    INFRA --> APPS
    AI --> APPS
    INFRA --> GOV
    APPS --> SEED
    SEED --> SMOKE
    APPS --> SMOKE
    GOV --> SMOKE
    INSTALL -. inverse .-> CLEAN

    classDef dev fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#0D47A1
    classDef install fill:#FFF3E0,stroke:#E65100,stroke-width:3px,color:#BF360C
    classDef step fill:#EDE7F6,stroke:#5E35B1,stroke-width:2px,color:#311B92
    classDef seed fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    classDef smoke fill:#FCE4EC,stroke:#AD1457,stroke-width:2px,color:#880E4F
    classDef clean fill:#ECEFF1,stroke:#455A64,stroke-width:2px,color:#263238
```

### 15.1 Installer principles

| Principle | What it means in `Install-UDCSP.ps1` |
|---|---|
| **Idempotent** | Re-running the script on an already-installed environment converges to the desired state without creating duplicates. |
| **Layered** | One PowerShell module per architectural layer (`Identity.psm1`, `Security.psm1`, `Data.psm1`, `Foundry.psm1`, `Integration.psm1`, `D365.psm1`, `Frontend.psm1`, `Voice.psm1`, `Governance.psm1`, `Observability.psm1`). |
| **Zone-aware** | Bicep modules deployed once per zone (DK / SE / NO) with parameter files; `-Zone` flag scopes installation to one or all. |
| **Reportable** | Each run produces an HTML + JSON report under `scripts/install/reports/<timestamp>/` with per-step duration, status, and resource IDs. |
| **Tear-down** | `scripts/cleanup/Remove-UDCSP.ps1` reverses everything safely (Key Vault soft-delete purge, Foundry project cleanup, Purview deregistration). |
| **CI-validated** | Wired into a GitHub Actions smoke job triggered by changes to `infra/`, `apps/`, `services/`, `foundry/`. Drift breaks the build. |

### 15.2 Developer onboarding

`scripts/dev/Bootstrap-DevEnv.ps1` provisions a developer laptop in one command: required CLIs (Az, Azure Developer CLI, Bicep, Power Platform CLI, Foundry CLI, GitHub CLI), VS Code extensions, Git hooks, an `.env.template`, and a verification step that runs `Install-UDCSP.ps1 -WhatIf -Environment dev` to confirm the toolchain works.

---

## 16. Compliance & resilience hardening (deployed, not demo-driven)

The case study mandates 18 Azure services as the *demo* surface. The platform deploys **9 additional services** that an EU public-sector go-live is expected to ship with — they are wired into the installer and into governance docs, but no scenario in [`recipe.md`](../biz/recipe.md) drives them end-to-end. They exist so the audit pack does not have a hole.

| Service | Why it ships | Owning install phase |
|---|---|---|
| **Microsoft Entra Verified ID** | eIDAS 2.0 / EUDI Wallet readiness — issues and verifies VC/VPs from the citizen wallet (currently used by the residency proof-of-address optional flow). | `VerifiedId` |
| **Azure Bastion (Standard)** | Admin access to the per-country private VNets without jump boxes or public IPs (NIS2 §21 hardening expectation). | `Bastion` |
| **Microsoft Entra Permissions Management (CIEM)** | Cross-tenant audit of identity entitlements across the 3 sovereign zones; flags toxic permission combinations before they reach an auditor. | `Ciem` |
| **Azure DDoS Protection Standard** | L3/L4 protection on the citizen-facing VNets ; Front Door covers L7 only and that is not enough for a Nordic public-sector context. | `Ddos` |
| **Azure Confidential Ledger** | Tamper-evident registry for AI Act Art. 26(6) — every Eligibility agent decision is appended to the ledger before being returned. App Insights logs alone are mutable and would not satisfy a regulator. | `ConfidentialLedger` |
| **Azure Confidential Computing (CVMs / Confidential Containers)** | Hosts the high-risk Eligibility agent so the citizen prompt + payslip data are protected by a TEE during inference, even from a privileged Azure operator. | `ConfidentialCompute` |
| **Microsoft Defender for APIs** | Runtime protection on APIM (the entry point for every channel + every cross-zone call). Detects credential stuffing, schema violations, anomalous payloads. | `Security` (Defender plan toggle) |
| **Azure Backup + Azure Site Recovery** | Per-zone BCDR baseline (PostgreSQL flexible-server PITR, ADLS soft-delete, ASR replication of the Container Apps environment to the paired region). Without this an ISO 27001 / NIS2 audit fails. | `BackupAsr` |
| **Azure Chaos Studio** | Quarterly fault-injection campaign that proves the 99.9 % SLO advertised on the citizen surfaces — not run on every install, but the experiments and target identities exist. | `ChaosStudio` |

> **Why call this out?** Every service above is a *production* concern, not a demo concern. Listing them honestly in the architecture document avoids the impression that the demo surface is the entire platform. The installer treats them as first-class phases — they have `-TestOnly` checks, `-WhatIf` plans, and dedicated `Test-<Phase>` smoke verbs — so an operator can prove the audit posture without running a citizen scenario through them.

---

*See [`plan.md`](./plan.md) for how this architecture will be built by the multi-agent development team — including the **A15 Synthetic Data & Personas** and **A16 Installer & Developer Experience** agents.*
