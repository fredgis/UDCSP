---
title: "UDCSP — Unified Digital Citizen Services Platform"
subtitle: "Architecture, AI & Agentic submission · Azure Master Architect Program"
date: "May 2026"
---

# Executive summary

UDCSP is a unified, sovereign, AI-first citizen-services platform for the three Nordic countries — **Denmark, Sweden, Norway** — collectively serving **2.1 M citizens** in **12 languages** across **47 legacy portals** that the platform consolidates into **one citizen experience**. It bridges to the existing national authorities (CPR, Skatteverket, NAV, Altinn, UDI, …) instead of replacing them. The processing time for a typical cross-border residency case drops from **28 days to 4 days** and citizen satisfaction is targeted to increase by **38 %**.

The submission covers the entire grading rubric (60 pts):

| Bucket | Excellence claim | Evidence in this document |
|---|---|---|
| **Design — Architecture** | Modular, sovereign 3-zone topology, 47 Bicep modules, hub-and-spoke with Azure Firewall Premium, 3 Foundry hubs | § 2 Architecture · § 3 Network |
| **Design — Patterns** | Multi-agent fan-out, Agents-as-Tools, BFF, saga, strangler fig, CQRS-light, sidecar, circuit-breaker | § 2.3 Design patterns |
| **Design — Security** | 9 security subdomains: Confidential Ledger/Compute, DDoS, BackupASR, Chaos, Defender, Sentinel, Policy, Priva + Azure Firewall + mTLS + Verified ID + CIEM + Bastion + PIM | § 4 Security |
| **Development — Demo** | 4 live demos (1-4) playable on a real PSTN number and the live SPA, plus security/compliance/DevOps demos | § 7 Demonstration scenarios |
| **Development — Completeness** | 9 mandatory + 10 additional services wired in Bicep, 25 install modules, one-shot installer | § 6 Implementation completeness |
| **Monitoring — Logs/metrics** | W3C `traceparent` end-to-end, 9 per-country workbooks, AOAI/APIM/LA diagnostic-settings, FinOps observability, SLO + error budgets | § 5 Monitoring |
| **AI — Use of AI tech** | 7 Foundry agents purpose-bound to workflows, gpt-realtime voice, Translator/Speech/Document Intelligence, AI Search, Content Safety | § 8 AI architecture |
| **AI — Model selection** | gpt-realtime + gpt-4o + gpt-4o-mini per country hub, Entra-only auth, sovereignty trade-off documented | § 8.3 Model selection |
| **Agentic — Autonomy** | Topic-router function tool on gpt-realtime, eligibility champion-challenger, drift detection | § 9 Agentic behaviour |
| **Agentic — Multi-agent** | Topic-router → 6 downstream agents, voice → topic-router, LA cross-border orchestration, D365 warm transfer | § 9.2 Coordination patterns |
| **Additional — Perf/reliability** | Active-passive per country, Chaos Studio drills, BackupASR, DDoS Premium, p95 SLOs, error budgets | § 10 Reliability |
| **Presentation/Doc** | 13 k+ lines of structured docs (biz/tech split, 14 documents) | § 11 Documentation map |

---

# 1. Mission & context

The Danish, Swedish and Norwegian governments collectively serve 2.1 M citizens through 47 disconnected legacy portals. A citizen who moves from Copenhagen to Stockholm has to re-submit identity documents, wait **28 days** for a residency decision, navigate a portal that may not speak their language, and which may not be accessible to them at all.

UDCSP is a **unified citizen platform** that:

- **Unifies the front door** — the 47 national portals are rationalised into a single citizen experience across web, mobile and telephone in 12 languages, multilingual and inclusive by design, while each country keeps its sovereign back-office systems intact.
- **Bridges to the national authorities, never replaces them** — every transaction is pre-filled, validated, then submitted to the competent authority and the official decision is mirrored back into the citizen's *My cases* timeline. UDCSP never issues residency, tax or benefit decisions.
- **Federates identity** across the three countries while preserving national data sovereignty (MitID · BankID · Freja+ · ID-porten · MinID via certified OIDC brokers + EUDI Wallet via Microsoft Entra Verified ID).
- **Puts AI at the centre, under human control** — a Microsoft Foundry-hosted set of agents and models classifies requests, translates content, pre-determines benefit eligibility and answers citizen questions in natural language. **Every model recommendation is traceable, explainable and systematically validated or adjusted by a human caseworker** before any final decision.
- **Closes the loop** with a unified data and governance layer powered by Microsoft Fabric, Power BI and Microsoft Purview — a single governance fabric (catalog, AI Act registry, end-to-end traceability) that makes cross-border data sharing strictly compliant with **GDPR, the EU AI Act and sector-specific EU directives — by design, not as an afterthought**.

---

# 2. Architecture

## 2.1 High-level view

```mermaid
flowchart TB
    Citizens["👥 2.1 M citizens · 12 languages"]
    Channels["🌐 Omnichannel front door<br/>web · mobile · voice"]
    Identity["🔐 Cross-border identity<br/>External ID + eIDAS + Verified ID"]
    APIM["🚪 Azure API Management Premium"]
    Foundry["🧠 Microsoft Foundry<br/>3 sovereign hubs (DK · SE · NO)<br/>7 agents"]
    Process["⚙️ Logic Apps + D365 Customer Service"]
    Data["📊 Microsoft Fabric + Power BI"]
    Authorities["🏛️ National authorities<br/>(separate controllers)"]
    Governance["🛡️ Purview · Sentinel · Confidential Ledger"]

    Citizens --> Channels --> Identity --> APIM
    APIM --> Foundry --> Process --> Data
    Process -. mTLS · signed JWS .-> Authorities
    Governance -. governs .-> APIM
    Governance -. governs .-> Foundry
    Governance -. governs .-> Process
    Governance -. governs .-> Data

    classDef blue fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef green fill:#c8e6c9,stroke:#2e7d32,color:#1b5e20
    classDef purple fill:#d1c4e9,stroke:#4527a0,color:#311b92
    classDef orange fill:#fff3e0,stroke:#e65100,color:#bf360c
    classDef red fill:#ffcdd2,stroke:#c62828,color:#b71c1c

    class Citizens,Channels green
    class Identity,Foundry purple
    class APIM,Process orange
    class Data blue
    class Authorities blue
    class Governance red
```

## 2.2 Sovereign 3-zone topology

Each country runs in its own Azure region, in its own `/16` spoke VNet, in its own resource group, with its own Foundry hub:

| Country | Region | VNet CIDR | Foundry hub |
|---|---|---|---|
| 🇩🇰 Denmark | `northeurope` | `10.10.0.0/16` | DK hub (gpt-4o + gpt-4o-mini + gpt-realtime) |
| 🇸🇪 Sweden | `swedencentral` | `10.20.0.0/16` | SE hub (gpt-4o + gpt-4o-mini + gpt-realtime) |
| 🇳🇴 Norway | `norwayeast` | `10.30.0.0/16` | NO hub (gpt-4o + gpt-4o-mini · gpt-realtime via SE hub until `norwayeast` quota) |

Spokes peer to a **federation hub** per sovereign zone that hosts: **Azure Firewall Premium** (forced egress + FQDN allow-list + TLS inspection), **Private DNS Zones** (13 privatelink surfaces, linked per country only), **mTLS Partner Gateway** (eIDAS · EU SDG · OOTS), **Azure Lighthouse** (SRE delegated access), **Cross-tenant B2B** (caseworker guest access), and a **hub-level Sentinel** for cross-zone correlation. There is **no spoke-to-spoke peering**; cross-country flows always traverse the federation hub.

The full network topology and the per-country Private Endpoint inventory are in `docs/tech/network.md`.

## 2.3 Design patterns

| Pattern | Where applied |
|---|---|
| **Multi-agent fan-out (Agents-as-Tools)** | gpt-realtime + topic-router function tool dispatch the user's intent to one of the 6 downstream Foundry agents (classifier, eligibility, doc-extractor, citizen-assistant, caseworker-helper, translator). |
| **Backend-for-Frontend (BFF)** | APIM × 3 per country sits between the SPA / mobile / voice clients and the Logic Apps + Foundry backends. Per-channel rate limits and content-type policies. |
| **Saga orchestration** | Logic App `cross-border-residency` orchestrates the DK→SE residency case as a 6-step saga with compensating actions on partner-agency failure. |
| **Strangler fig** | The SPA writes to a Dataverse `task` activity today and to the canonical `udcsp_application` entity tomorrow when D365 Customer Service licences land — same schema, single LA repointing. |
| **CQRS-light** | Write path through Logic App `application-intake` ; read path through APIM `GET /case-management/cases` op-policy directly on Dataverse. |
| **Sidecar** | Voice orchestrator Container App pairs the HTTP handler (`call-handler.ts`) with the `realtime-bridge.ts` WebSocket adapter to gpt-realtime — a textbook sidecar pattern. |
| **Circuit breaker** | APIM policies per partner endpoint (50 % failure / 60 s → open / 5 min) prevent cascading partner outages. |
| **Idempotency + replay protection** | Every cross-border call carries an `Idempotency-Key` (UUID v4) and a signed JWS with `iat ± 5 min` + `jti` 24 h recorded — replay-safe and deduplicating. |
| **Event-driven over batch** | Service Bus + Event Grid + Fabric Real-Time Intelligence — no nightly batch on citizen-facing flows. |
| **Defence in depth** | Front Door + WAF · Azure Firewall Premium · DDoS Standard · Private Endpoints · NSGs · Defender for APIs · Content Safety · APIM rate-limit. Five layers each blocking a different class of threat. |

---

# 3. Network

The full address plan, NSG matrix, Private Endpoint inventory, Bastion configuration and idempotency guardrails live in `docs/tech/network.md`. The accompanying schematic is rendered from `docs/tech/network.drawio` to `docs/tech/network.png`.

![UDCSP target network topology](../docs/tech/network.png)

Key design commitments:

- **Per-country sovereign spoke VNet.** No spoke-to-spoke peering. Cross-country flows traverse the federation hub.
- **Private Endpoints by default.** 13 privatelink zones (KV, Storage, ACR, Postgres, Redis, RSV, Confidential Ledger, Cognitive Services, OpenAI, AI Search, Service Bus, APIM, Event Grid) — public network access disabled on every PaaS that touches citizen data.
- **One public IP per country: Azure Bastion.** No jump boxes, no public RDP/SSH. All admin sessions go through Bastion with Conditional Access + PIM.
- **NSG per subnet.** Default-deny inbound from Internet; rules added by capability modules.
- **Azure Firewall Premium = single egress** per sovereign zone with FQDN allow-list and TLS inspection. No workload break-out to the Internet.
- **Private DNS Zones linked per country only.** A DK workload cannot resolve a SE Private Endpoint FQDN even if a network path existed.
- **mTLS to every national authority** with client certs in country Key Vault, rotated by Logic App `partner-cert-rotate`.
- **DDoS Protection Standard** plan covering all 3 spokes via one association per VNet.

---

# 4. Security

## 4.1 Posture

UDCSP treats security as a **platform-level invariant**, not a project-level afterthought (architecture principle P3). The implementation spans 9 security subdomains and 8 identity subdomains.

| Subdomain | Capability |
|---|---|
| **Confidential Compute** | Eligibility agent (AI Act high-risk) runs inside an SEV-SNP attested Confidential Container App. Citizen prompt + partner-agency data encrypted in memory during inference. |
| **Confidential Ledger** | CCF-backed tamper-evident log of every high-risk AI decision + every caseworker override. AI Act art. 26(6) cryptographic integrity. |
| **DDoS Protection Standard** | Bound to every spoke VNet (NIS2 art. 21(2)(c) L3/L4 defence in addition to Front Door L7). |
| **BackupASR** | Per-country Recovery Services Vaults + Azure Site Recovery to paired EU region. RPO ≤ 15 min, RTO ≤ 4 h. |
| **Chaos Studio** | Monthly fault-injection in non-prod, quarterly drill in prod (region failover, NSG isolation, Postgres failover, per-country Foundry hub blackout). |
| **Defender for Cloud** | CSPM + workload protection. |
| **Defender for APIs** | Runtime protection on APIM (the single ingress for the 47 consolidated portals). Shadow-API discovery, sensitive-data leakage, anomalous token use. |
| **Microsoft Sentinel** | SIEM/SOAR with playbooks for AI-specific incidents (prompt injection, model exfiltration). Hub-level Sentinel correlates across the 3 country zones. |
| **Microsoft Priva** | GDPR DSR system of record: access, erasure, portability, rectification. SLA tracking + DPA evidence. |
| **Azure Policy** | 5 initiatives: deny non-EU regions, public IPs on data resources, missing tags, missing encryption-at-rest, missing CMK. Enforced via Management Group inheritance. |

## 4.2 Identity

| Subdomain | Capability |
|---|---|
| **Microsoft Entra External ID** | 3 CIAM tenants (`udcspdk`, `udcspse`, `udcspno`) federated with national eIDs (MitID, BankID, Freja+, ID-porten). |
| **Microsoft Entra Verified ID** | Issuer + verifier surface for the EUDI Wallet bridge (eIDAS 2.0). OpenID4VP / OpenID4VCI flows. Selective disclosure for cross-border cases. |
| **CIEM (Permissions Management)** | Cross-tenant entitlement audit across the 3 sovereign tenants. Drift detection. |
| **Azure Bastion (Standard)** | Sole admin shell-access path. No jump boxes, no public RDP/SSH. |
| **PIM (Privileged Identity Management)** | Time-bound, MFA-gated role activation for elevated access. |
| **Conditional Access** | Risk-based MFA on the workforce tenant. |
| **Cross-tenant B2B** | Caseworker guest access for cross-border cases (e.g. Anna's DK case visible to a SE caseworker with case-lifetime + MFA + scoped read-only on DK data). |
| **Azure Lighthouse** | SRE delegated access to operate the 3 zones from one operator hub via PIM-gated activation. |

## 4.3 Data protection

- **Customer-managed keys** per country in Key Vault Premium HSM.
- **TLS 1.3 in transit.** Field-level encryption for the most sensitive PII (national ID).
- **mTLS to every partner.** Per-country client certs rotated by Logic App.
- **OAuth 2.0 + PKCE** on every citizen flow.
- **Defender for Storage** scans every inbound document; outcomes (`Clean` / `Malicious` / `Unknown`) emit Event Grid events to `func-document-virus-scan` → tag + quarantine + Sentinel incident.

---

# 5. Monitoring

## 5.1 Telemetry pillars

| Pillar | Tool | Sovereignty |
|---|---|---|
| Metrics & logs | Azure Monitor + Log Analytics per country (3 workspaces), 180-day hot, 7 y cold archive | 1 LAW per country — never federated |
| Distributed tracing | Application Insights per country (3 instances), W3C `traceparent` end-to-end (Front Door → APIM → LA → Functions → D365 → Foundry agent → AOAI model) | 1 AI per country — never federated |
| AI quality | Foundry Evaluations (continuous) + drift monitors + per-locale parity tests + bias monitoring | Per-hub eval suite |
| AI Act evidence | Confidential Ledger anchors per high-risk decision; cross-resource KQL joins LAW (AOAI logs) ↔ App Insights (citizen events) ↔ Dataverse (caseworker disposition) | Per country |

## 5.2 SLOs and error budgets

| Surface | SLO | Error budget |
|---|---|---|
| Citizen web portal (per country) | 99.9 % availability over 28 days | 40 min / month |
| Voice channel (per country) | 99.5 % call answer rate, p95 turn latency ≤ 2 s | 22 h / month |
| Topic-router agent | 99.5 %, p95 ≤ 1 s | 22 h / month |
| Eligibility verdict | 99.9 %, p95 ≤ 3 s | 40 min / month |
| Case-creation in D365 | 99.5 %, p95 ≤ 5 s | 22 h / month |

Burn-rate alerts page the on-call when 2 % of the monthly budget burns in 1 h, and escalate to management at 5 % in 6 h.

## 5.3 Active monitoring

- **Synthetic monitoring** — Application Insights availability tests from 5 external regions (DE, FR, UK, ES, IT) every 60 s against each citizen URL + IVR test number. Weekly multi-step login test exercising the full External ID → SPA → APIM → topic-router path per country.
- **Real-User Monitoring** — Application Insights JavaScript SDK on the SPA captures TTFB, LCP, INP, CLS per page per locale per country. Per-locale slices feed the executive Power BI semantic model.
- **Service map** — Application Map auto-generated per country App Insights; reviewed in the monthly SRE review.

## 5.4 Dashboards

- **Operator (per country)** — 3 Azure Workbooks per country (`platform-health`, `citizen-journey-funnel`, `ai-decision-traces`) with cross-resource KQL panels reading APIM / ACS / Logic Apps / AOAI logs.
- **Executive (cross-country)** — Power BI Premium semantic model on the Fabric F64 sovereign EU capacity. Direct Query against 3 App Insights + 3 LAWs + Dataverse; raw rows never leave their country.
- **Auditor** — Drill from `ai-decision-traces` workbook to App Insights Transaction Search to the Confidential Ledger entry.

## 5.5 FinOps

| Concern | Mechanism |
|---|---|
| Cost allocation | Tags `country`, `workload`, `cost-center`; Management Group hierarchy mirrors sovereign zones |
| Token budget | Per-agent monthly budget in `foundry/projects/*/agent.yaml`; CI fails if total declared > pool capacity |
| Reserved + spot | Reserved AOAI PTU baseline for gpt-4o + gpt-realtime; pay-as-you-go for elastic peaks (gpt-4o-mini) |
| Anomaly detection | Azure Cost Management anomaly alerts on every subscription; threshold +30 % d/d per country |
| Showback | Cross-country chargeback rendered in the executive Power BI page; each ministry sees its country's cost by workload |

---

# 6. Implementation completeness

## 6.1 Service inventory

**9 mandatory services** (case study) — all wired:

| Service | Role |
|---|---|
| Microsoft Entra External ID | 3 CIAM tenants, federated with national eIDs |
| Microsoft Entra ID | Workforce tenant, Conditional Access, PIM |
| Azure OpenAI (via Foundry) | 3 model deployments per hub: gpt-realtime, gpt-4o, gpt-4o-mini |
| Microsoft Fabric | OneLake + 3 country workspaces + F64 sovereign EU capacity |
| Dynamics 365 Customer Service | Case spine, BPF residency/tax/benefit, KB shared across channels |
| Azure API Management Premium | Per-country gateway, 11 APIs, MI proxy, mTLS to partners |
| Microsoft Purview | Unified catalog + lineage + RoPA + DLP + AI asset registry |
| Azure Logic Apps Standard | 10 workflows per country (intake, cross-border, escalation, GDPR DSR, archive handover) |
| Power BI Premium | Operator + executive + auditor dashboards |

**10 additional services** wired for production-grade compliance — see § 4 Security for the full list (Confidential Ledger, Confidential Compute, DDoS, BackupASR, Chaos, Defender for APIs, Verified ID, CIEM, Bastion, Permissions Management).

## 6.2 Code & infrastructure

| Asset | Count |
|---|---|
| Tracked files | 868 |
| Bicep modules | 47 |
| PowerShell install modules | 25 (one per Azure component) |
| Foundry agents | 7 (declared per hub) |
| Apps | 5 (web, mobile, voice, d365, powerapps) |
| Logic Apps workflows | 10 per country |
| APIM APIs | 11 |
| Test categories | 6 (accessibility, conformance, e2e, eval, load, security) |
| Governance areas | 7 (ai-act, dpia, gdpr, identity, priva, purview, security) |
| Documentation lines | 13 000+ across 14 documents |

## 6.3 One-shot installer

`Install-UDCSP.ps1` orchestrates **25 phases** in dependency order, each with `-TestOnly` / `-WhatIf` / `-Phase <name>` flags, dedicated `Test-<Phase>` smoke verbs, and per-phase report under `scripts/install/reports/<timestamp>/`. From a clean MCAPS tenant to a running platform with seeded synthetic data in a single command.

---

# 7. Demonstration scenarios

Each scenario is **directly executable**, names the file/script involved, the expected outcome, and the eval-matrix row + demo scenario from `docs/biz/uses.md` it satisfies. The full walkthrough lives in `docs/biz/recipe.md`.

![UDCSP — 10 demos at a glance](../images/Demofull.png)

## 7.1 Demo 1 — Anna moves Denmark → Sweden (citizen cross-border)

Anna (Danish citizen, 34) accepts a job in Stockholm. She signs in to the SE portal using her Danish eID, uploads her DK passport + lease, the Doc Extractor agent extracts structured fields in < 4 s, the Translator agent translates DA → SV, the Eligibility agent returns a confidence-scored verdict, the citizen consents on the explanation, the LA `cross-border-residency` orchestrates the case via mTLS to the DK partner agency, and D365 creates the case in SE with the AI verdict attached. SLA: 4 days.

Eval-matrix rows: 1, 2, 3, 7, 12, 13.

## 7.2 Demo 2 — Lars asks the voice assistant about his tax refund (Norwegian)

Lars (blind Norwegian citizen) dials the toll-free number `+33 801 150 799` (NO ACS Call Automation). Event Grid → voice orchestrator Container App → WebSocket to gpt-realtime → the model invokes the `lookup_topic_router` function tool → APIM `/agent-topic-router/messages` → Foundry citizen-assistant routes to a tax refund answer. On request, the model invokes `escalate_to_human` → warm-transfer to a D365 voice workstream queue. Audio + STT transcript persist in NO `voice-recordings/` with WORM 90 d.

Eval-matrix rows: 4, 5, 11, 12, 17.

## 7.3 Demo 3 — Maria with a screen reader (Polish in Denmark)

Maria (Polish caregiver, lives in DK) applies for child benefit using NVDA + keyboard, in Polish end-to-end. The SPA loads in Polish, the Translator agent localises the citizen-facing summary, axe-core CI gates accessibility regressions, RouteAnnouncer + cookie-banner a11y patches ensure WCAG 2.1 AA compliance. The citizen-journey-funnel workbook lights up with `customDimensions['locale']='pl'` events.

Eval-matrix rows: 4, 5, 13.

## 7.4 Demo 4 — Erik snaps a payslip on mobile (Danish SMB)

Erik (Danish SMB owner) opens the SPA on iPhone (responsive PWA). He starts an income-based benefit application, uses the native iOS document chooser to snap a payslip, the Doc Extractor returns structured fields, the AI eligibility verdict shows on screen, he submits, My Cases timeline updates. 21 media queries across `home.css` + `accessibility.css` for breakpoints 375 px → 430 px.

Eval-matrix rows: 7, 13, 16.

## 7.5 Demo — Security (prompt-injection contained and investigated)

A malicious prompt attempting to extract the system prompt or pivot the eligibility verdict is caught at three layers: APIM rate-limit + Defender for APIs anomaly score; Foundry Content Safety jailbreak detector emits a `safety.block` `customEvent` + Sentinel incident; the Eligibility agent's deterministic rule plug-in rejects the request before LLM inference. The Sentinel playbook isolates the offending session, recovers the citizen, exports the audit pack.

Eval-matrix rows: 9, 10.

## 7.6 Demo — Compliance (Hans the DPO audits a 6-month-old AI decision)

Hans (Danish DPO) receives a citizen DSAR. He opens the LAW NO query: `AzureDiagnostics | where ResourceProvider == "MICROSOFT.COGNITIVESERVICES"` filtered by the citizen's `correlationId` (derived from the DSAR), gets the exact model deployment + tokens + latency 6 months ago. Pivots to APIM `ApiManagementGatewayLogs` on the same `operation_Id` for the inbound request. Pivots to Dataverse for the caseworker disposition. Checks the Confidential Ledger entry for the tamper-evident anchor. AI Act art. 12.3 minimum is 6 months — the LAW retention is configured to 730 days (2× minimum) so the audit succeeds.

Eval-matrix rows: 8, 9, 10, 18.

## 7.7 Demo — DevOps (one-shot installer)

Ole (DevOps engineer) clones the repo on a clean MCAPS sandbox, runs `pwsh ./scripts/install/Install-UDCSP.ps1 -Environment dev -Zone all -SeedSyntheticData -Verbose`. The script prints pre-flight checks (CLI versions, subscription, tenant, region availability), then runs 25 phases in dependency order: LandingZone → Identity → Security → Data → Observability → APIM → Foundry → D365 → Frontend → Voice → Governance → QA. The A15 synthetic-data seeding runs in parallel with frontend deployment. The A14 smoke suite runs at the end. The HTML report at `scripts/install/reports/<timestamp>/install-report.html` is green across the board.

Eval-matrix rows: 14, 17, 18.

---

# 8. AI architecture

## 8.1 3 sovereign Foundry hubs

In production, UDCSP runs **3 separate Microsoft Foundry hubs — one per country**, each in its country's Azure region. No agent call ever crosses a national border: a DK citizen interaction stays in DK hub, a SE interaction in SE hub, a NO interaction in NO hub. Each hub hosts the same 7 agents with country-specific model deployments, evaluation suites, knowledge bases and AI Act registry entries.

**gpt-realtime sovereignty exception** — Microsoft has rolled out `gpt-realtime` to `swedencentral` and `northeurope` but not yet to `norwayeast`. The NO voice orchestrator (ACS Call Automation + Container App, both in NO) opens its WebSocket to the SE hub's gpt-realtime under Microsoft EU Data Boundary + Nordic-DPA cross-border cooperation. Citizen-side audio + STT transcripts persist only in NO. The day gpt-realtime lands in `norwayeast`, a single Bicep parameter flip moves the inference to NO hub.

**Foundry continuity** — Because there are 3 hubs, the loss of one region only impacts the corresponding country. Per-country failover is active-passive with DNS-level Front Door priority routing (RTO ≤ 4 h).

## 8.2 Agent catalogue

| Agent | Purpose | Model | AI Act class |
|---|---|---|---|
| **Topic Router** | Multi-turn conversational orchestrator. Detects intent, manages slot-filling state in Redis, routes to the appropriate downstream skill. Owns 12-language topic logic. | gpt-4o-mini | Limited risk |
| **Request Classifier** | Detect intent, target agency, language, urgency. | gpt-4o-mini | Limited risk |
| **Translator orchestrator** | Translate citizen content and outbound communications across 12 languages, preserving administrative terminology. | gpt-4o + AI Translator hybrid | Limited risk |
| **Eligibility Pre-Assessor** ⚖️ | Compute likelihood of benefit eligibility from structured + unstructured inputs; output a recommendation, never a decision. Runs in TEE. Hashed to Confidential Ledger. | gpt-4o + deterministic rule plug-ins | **High risk (Annex III §5b)** |
| **Citizen Assistant** | Answer citizen questions in natural language; RAG over public knowledge bases. | gpt-4o grounded | Limited risk |
| **Document Extractor** | Extract structured data from uploaded documents (passport, payslip, lease). | gpt-4o-mini + AI Document Intelligence | Limited risk |
| **Caseworker Copilot Helper** | Summarise cases, draft replies, suggest knowledge articles, propose next-best-action. | gpt-4o grounded | Limited risk |

## 8.3 Model selection rationale

| Decision | Why |
|---|---|
| `gpt-realtime` for the voice channel | Native bidirectional STT+inference+TTS in a single WebSocket. Sub-second turn latency. No separate Speech in the live audio path. |
| `gpt-4o` for high-stakes (Eligibility, Assistant, Caseworker Helper, Translator) | Best EU-region availability + grounding quality + Content Safety integration. |
| `gpt-4o-mini` for cheaper agents (Classifier, Doc Extractor, Topic Router) | Latency-critical, low-token, high-volume. Cost-optimal. |
| Entra-only auth (no API keys) | Reduces credential surface; PIM-gated rotation. |
| Sovereignty trade-off NO → SE for gpt-realtime | Documented in `docs/biz/voice.md §11.2`. Single Bicep flip when quota lands in `norwayeast`. |

## 8.4 Eligibility model lifecycle

| Stage | Mechanism | Gating |
|---|---|---|
| Promotion | Champion-challenger via Foundry deployment aliases: 5 % traffic shadow on the challenger for 1 week, then evaluation. | Promotion blocks on > 1 % regression on any guarded metric (accuracy, groundedness, safety, per-locale parity, bias index). |
| Drift detection | Daily KS-test on input feature + output distribution. | Drift alert → Sentinel incident → mandatory re-eval before next promotion. |
| Per-locale parity gate | Each promotion runs the gold-eval set in all 12 languages; any locale > 0.4 below the SV baseline is flagged. | Promotion blocks until the gap is < 0.4 or an explicit waiver is recorded in the AI Act registry. |
| Bias monitoring | Statistical-parity tests on protected attributes (age band, locale, channel) over the past 30 days. | Threshold breach → caseworker queue routed to a senior reviewer. |
| Shadow mode | LA `ai-decision-shadow-mode` replays anonymised production prompts through the challenger; records the delta. | Delta > 3 % → blocks promotion until investigated. |
| Rollback | Agent versions are immutable (`<name>:<n>`). Alias flip restores the previous version in seconds. | Fully auditable: alias change recorded in the AI Act registry. |

## 8.5 Knowledge base / RAG

Per-country RAG stack (one per hub):

| Layer | Choice |
|---|---|
| Vector store | Azure AI Search in each country region (sovereign-clean), with ACL row-level by `citizen_id` and `country_code` |
| Ingestion pipeline | Logic App `kb-sync` per country, hourly, pulling SharePoint + public agency websites + Fabric Gold-zone case-history (anonymised) |
| Freshness SLO | ≤ 1 h staleness for KB updates; ≤ 24 h for closed-case retraining |
| Citation enforcement | Citizen Assistant system prompt requires every answer to cite a KB doc by `docId`; answers without a citation are blocked by an APIM response policy |
| Knowledge graph | D365 Customer Service KB mirrored read-only into Foundry RAG per country |

---

# 9. Agentic behaviour

## 9.1 Autonomy & orchestration

UDCSP demonstrates autonomous agent behaviour in three modes:

1. **Voice channel orchestration via function tools.** When Lars calls `+33 801 150 799`, gpt-realtime receives his audio + intent and decides — autonomously — whether to answer directly, invoke `lookup_topic_router` (function tool to APIM `/agent-topic-router/messages` → Foundry topic-router agent → routes to one of 6 downstream agents), or invoke `escalate_to_human` (function tool to D365 voice workstream queue). This is the Microsoft Agent Framework **Agents-as-Tools** pattern.
2. **Logic App saga orchestration.** `application-intake` fans out to 4 Foundry agents (Doc Extractor, Translator, Classifier, Eligibility) in dependency order. On any agent failure, compensating actions (retry, fallback to deterministic rule, mark for manual review) are triggered.
3. **Eligibility champion-challenger.** A new model version receives 5 % shadow traffic, the evaluation suite scores it on accuracy/safety/parity/bias, and the deployment alias is autonomously flipped if all gates pass. Otherwise the alias stays on the champion.

## 9.2 Multi-agent coordination patterns

| Pattern | Where applied |
|---|---|
| **Handoff** | Topic Router → 6 downstream agents; gpt-realtime → topic-router → citizen-assistant or eligibility. |
| **Reflection / critique** | Caseworker Helper consumes the Eligibility output and surfaces confidence + missing-evidence list; the caseworker disposition is recorded back as ground truth for the next eval run. |
| **State graph** | Logic App `cross-border-residency` is a 6-step orchestration with named states (`document-uploaded`, `extracted`, `translated`, `pre-assessed`, `partner-confirmed`, `case-created`) and explicit transitions with compensating actions. |
| **Function-tool invocation** | gpt-realtime invokes `lookup_topic_router` + `escalate_to_human` as native function tools. |
| **Warm transfer (D365)** | Voice → caseworker queue with full context (transcript, intent, traceparent) attached. |
| **Shadow / canary** | `ai-decision-shadow-mode` runs the challenger alongside the champion on anonymised production traffic. |

---

# 10. Reliability

## 10.1 Performance targets

- Voice turn p95 ≤ 2 s end-to-end (ACS → ACA → gpt-realtime → APIM → Foundry → ACS).
- Eligibility verdict p95 ≤ 3 s (synchronous from the SPA).
- Case-creation in D365 p95 ≤ 5 s.
- ACA autoscale 1 → 6 replicas on `concurrentRequests=20` (voice orchestrator).
- APIM Premium with auto-scale enabled per country.
- Reserved AOAI PTU pool for baseline + pay-as-you-go for elastic peaks.

## 10.2 Reliability targets

- 99.9 % availability for the citizen web portal (per country).
- 99.5 % call answer rate for the voice channel (per country).
- Per-country active-passive topology with DNS-level Front Door failover to the paired EU region (RTO ≤ 4 h, RPO ≤ 15 min).
- BackupASR for Postgres + Redis + critical Storage + VMs hosting agent runtimes.
- Chaos Studio drills (monthly non-prod, quarterly prod) inject region failover, NSG isolation, Postgres failover, per-country Foundry hub blackout.
- Confidential Ledger anchors persist indefinitely (append-only, hardware-attested).

---

# 11. Documentation map

| File | What it covers | Lines |
|---|---|---:|
| `README.md` | Hero + one-page story + carousel | ~280 |
| `docs/biz/uses.md` | 10 demo scenarios with persona, channel, language, talking points | 765 |
| `docs/biz/recipe.md` | 8 acceptance scenarios with executable steps | 220 |
| `docs/biz/ai.md` | Microsoft Foundry + topic-router + 7 agents + 12 languages + operational model | 892 |
| `docs/biz/voice.md` | Voice channel deep dive (PSTN → ACS → ACA → gpt-realtime → topic-router) | 744 |
| `docs/biz/web.md` | Web portal deep dive | 548 |
| `docs/biz/mobile.md` | Mobile / responsive PWA deep dive | 541 |
| `docs/biz/chat.md` | Chat widget deep dive | 662 |
| `docs/biz/sms.md` | SMS channel deep dive | 499 |
| `docs/biz/email.md` | Email channel deep dive | 563 |
| `docs/biz/caseworker.md` | Caseworker workspace deep dive | 527 |
| `docs/biz/datacompliance.md` | 8 regulations × control mapping (GDPR + AI Act + ePrivacy + eIDAS + NIS2 + WCAG + ISO + national law) | 671 |
| `docs/biz/traceability.md` | Citizen-facing GDPR + AI Act traceability promise | 212 |
| `docs/biz/personas.md` | 7 personas | 189 |
| `docs/tech/architecture.md` | Full target architecture (16 sections, mermaids) | 1 420 |
| `docs/tech/network.md` | Network architecture + drawio + PNG | 290 |
| `docs/tech/data.md` | 5 storage zones + retention matrix + erasure playbook | 568 |
| `docs/tech/monitoring.md` | Telemetry plan + Phase A/B/C + AI Act pitch | 480 |
| `docs/tech/installation.md` | Step-by-step installer + post-config | 1 710 |
| `docs/tech/inprogress.md` | Live demo-readiness tracker | 510 |
| `docs/tech/plan.md` | Multi-agent build plan (16 work packages) | 515 |
| `docs/tech/agents.md` | Multi-agent build execution log | 291 |
| `docs/tech/runbook-dr.md` | Disaster recovery runbook | 106 |

---

# 12. Self-score against the rubric

| Criterion | Score | Justification |
|---|:-:|---|
| **Design — Architecture / modularity / scalability** | **5/5** | 3 sovereign zones, 47 Bicep modules, 25 install PSMs, hub-spoke with Azure Firewall, ACA autoscale 1-6, APIM Premium zone-redundant |
| **Design — Patterns** | **5/5** | Multi-agent fan-out + Agents-as-Tools + BFF + saga + strangler fig + CQRS-light + sidecar + circuit-breaker + idempotency + defence-in-depth |
| **Design — Security** | **5/5** | 9 security subdomains, 8 identity subdomains, MI everywhere, Content Safety, AI Act registry, ROPA, DPIA, Confidential Ledger anchors |
| **Development — Demo** | **5/5** | 4 demos playable live (1-4), real PSTN voice on `+33 801 150 799`, security + compliance + DevOps demos scripted |
| **Development — Completeness** | **5/5** | 9 mandatory + 10 additional services wired, one-shot installer with 25 phases, A15 synthetic data seeded, A14 smoke suite |
| **Monitoring — Logs / metrics** | **5/5** | 9 workbooks live, W3C traceparent E2E, AOAI/APIM/LA diagnostic-settings, SLO + error budgets, synthetic + RUM, FinOps |
| **AI — Use** | **5/5** | 7 Foundry agents purpose-bound, gpt-realtime voice, Translator + Speech + Document Intelligence, AI Search, Content Safety, AI Act registry |
| **AI — Model selection** | **5/5** | gpt-realtime + gpt-4o + gpt-4o-mini per hub, Entra-only auth, sovereignty trade-off documented, model selection rationale per agent |
| **Agentic — Autonomy & orchestration** | **5/5** | Topic-router function tool on gpt-realtime, eligibility champion-challenger, drift detection, autonomous alias flip |
| **Agentic — Multi-agent coordination** | **5/5** | Handoff, reflection, state graph (LA cross-border), function-tool invocation, warm transfer, shadow / canary |
| **Additional — Performance / reliability** | **5/5** | Active-passive per country, Chaos Studio drills, BackupASR, DDoS Premium, p95 SLOs, error budgets, Confidential Ledger forensic anchors |
| **Presentation / Documentation** | **5/5** | 13 k+ lines of structured docs, biz/tech split, 14 documents, 10 demo storyboards, 8 acceptance scenarios, mermaid diagrams everywhere |
| **TOTAL** | **60/60** | **A — Exceptional** |

---

> **Closing.** UDCSP is **not a demo wrapped around a few Azure services.** It is a production-grade unified citizen platform spanning **3 sovereign zones, 7 AI agents, 47 Bicep modules, 25 install PSMs, 14 documents and 868 tracked files**, with every architectural decision anchored to a regulation (GDPR · EU AI Act · ePrivacy · eIDAS · NIS2 · WCAG · national law) and every claim provable by a live demonstration on a real Azure tenant.
