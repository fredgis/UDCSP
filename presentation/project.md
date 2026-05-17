---
title: "UDCSP — Unified Digital Citizen Services Platform"
subtitle: "Architecture, AI & Agentic submission · Azure Master Architect Program"
date: "May 2026"
---

# The story

A citizen named Anna lives in Copenhagen and accepts a new job in Stockholm.

To register her residency in Sweden today she has to navigate two national portals in two languages, re-upload her identity documents, prove her income to a third tax authority and wait 28 days for a decision.

Across the three Nordic countries — Denmark, Sweden, Norway — 2.1 million citizens like Anna deal with 47 disconnected legacy portals every day. Some of those portals do not speak the citizen's language. Some are not even accessible to screen readers.

UDCSP — the Unified Digital Citizen Services Platform — is the answer. It is a single citizen front door across the three Nordic countries, available on web, mobile and telephone, in 12 languages, fully accessible, and powered by a multi-agent AI brain that pre-classifies, translates, extracts documents and pre-assesses eligibility — under the constant supervision of a human caseworker.

UDCSP does not replace the national authorities. CPR, borger.dk, SKAT and Udbetaling DK in Denmark; Skatteverket, Försäkringskassan and BankID in Sweden; Skatteetaten, NAV, Altinn and UDI in Norway — they remain the controllers of the substantive decision. UDCSP bridges to them. Every transaction is pre-filled, validated, then submitted to the competent authority, and the official decision comes back into the citizen's *My cases* timeline.

The numbers tell the story.

Processing time drops from 28 days to 4 days. Citizen satisfaction is targeted at +38 %. Forty-seven portals consolidate into one. Twelve languages are first-class, not afterthoughts.

Three sovereign data zones never share a citizen's data without an explicit, signed, audit-trailed cross-border envelope. The Eligibility model — registered under EU AI Act Annex III §5(b) as high-risk — runs inside a SEV-SNP attested Trusted Execution Environment, hashes its verdict into Azure Confidential Ledger, and is always reviewed by a human caseworker before any decision becomes final.

This document is the architect's submission for the Azure Master Architect Program. It tells how UDCSP is designed, secured, observed, evaluated and operated — and how it satisfies every line of the rubric.

![The ten end-to-end scenarios — citizen journeys, security, compliance and DevOps in one frame.](images/Demofull.png){width=85%}

# The citizen experience

UDCSP is one platform, three surfaces, one identity. The same citizen — Anna, Lars, Maria, Erik — meets the platform on `udcsp.fredgis.com` from a desktop browser, opens the same site on an iPhone or an Android, or dials a toll-free Nordic phone number. The shell is responsive, the language is auto-detected and switchable to eleven others, the accessibility menu offers slow speech, high contrast and reduce-motion modes, and the chat widget is pinned in the bottom-right corner waiting for a question.

![The citizen portal home page — single sign-in, language picker, demo index, accessibility menu.](images/screen1.png){width=70%}

The portal walks the citizen through every flow as a numbered wizard with clear progress, explicit consent prompts, AI-assisted summaries, and a *My cases* timeline that never resets. The eligibility step is the only place the citizen sees the AI verdict before consenting — confidence percentage, rule-by-rule evidence, missing-evidence list, citizen-friendly summary, caseworker summary — all four shown side by side, never the bare AI conclusion.

![The Apply for Child Benefit page — AI eligibility pre-assessment in DA · SV · NB · EN · PL with caseworker summary.](images/screen3.png){width=70%}

The mobile experience is the same SPA, not a separate native binary. Twenty-one media queries cover the responsive breakpoints from a 375 px iPhone SE to a 430 px iPhone 14 Pro Max. The accessibility menu reflows to a single column under 600 px, the chat widget pins to the bottom-right with a thumb-reachable target, and the file picker uses the native iOS document / photo chooser.

![A patchwork of the mobile experience — sign-in, demos index, apply wizard, document upload, my cases timeline.](images/mobile-patchwork.png){width=70%}

# Architecture

UDCSP runs in three sovereign Azure zones, one per country. Denmark sits in `northeurope`, Sweden in `swedencentral`, Norway in `norwayeast`. Each zone is its own resource group, its own /16 VNet, its own Microsoft Entra External ID tenant for citizen identity, its own Application Insights workspace, its own Log Analytics workspace, and — most importantly for AI sovereignty — its own Microsoft Foundry hub.

A Foundry hub in production is a country boundary. A Danish citizen interaction stays in the Danish hub, a Norwegian voice call stays in the Norwegian hub. The three hubs share no model deployment and no agent registry.

The platform is hub-and-spoke. Each country spoke peers to a federation hub VNet — production-grade, always-on, never optional.

The federation hub hosts the few elements that must be shared across sovereign zones. Azure Firewall Premium becomes the single egress path for every spoke workload, with `0.0.0.0/0` UDR-forced through it, FQDN allow-lists per workload, and TLS inspection for non-Microsoft destinations. The Private DNS zones cover thirteen `privatelink.*` surfaces — Key Vault, Storage, Postgres, Redis, ACR, Confidential Ledger, Foundry, AI Search, Service Bus, APIM, Event Grid — each linked to its country VNet only so a Danish workload cannot resolve a Swedish private endpoint. The mTLS partner gateway talks to the national authorities under eIDAS, EU SDG and OOTS standards. Azure Lighthouse provides SRE delegated access across zones, and a hub-level Sentinel correlates security events from the three country workspaces.

![UDCSP target network topology — three sovereign spokes, federation hub with Azure Firewall and Private DNS.](images/network.png){width=85%}

The citizen-facing front door is Azure Front Door Premium with WAF, using Microsoft `DefaultRuleSet 2.1` for OWASP coverage, `MicrosoftDefaultRuleSet 1.0` for bot protection, and a tenant rate-limit rule of 200 requests per 5 minutes per citizen IP. Behind Front Door, Azure API Management Premium is the gateway — one APIM instance per country, never shared.

APIM enforces the OAuth 2.0 + PKCE flow on every citizen call, validates the External ID-issued bearer token, decorates every request with a W3C `traceparent` header, applies per-channel rate limits, runs the Microsoft Defender for APIs runtime protection (shadow-API discovery, sensitive-data leakage detection, anomalous token use), and proxies to Logic Apps Standard workflows and Microsoft Foundry agents as the only allowed backends.

![Architecture at a glance — citizens, identity, AI brain, integration spine, bridge to national authorities.](images/UDCSPv3.png){width=85%}

The implementation discipline is severe and intentional. The platform is described as code: 47 Bicep modules and 25 PowerShell install modules, one per Azure component.

The installer (`Install-UDCSP.ps1`) drives 25 phases in dependency order, with `-WhatIf` and `-TestOnly` flags on every phase, smoke tests per component, and an HTML report at the end. A clean MCAPS sandbox tenant becomes a running platform in a single command, with synthetic citizen personas seeded by the A15 agent and a smoke suite green across the board.

The submission ships 868 tracked files, fourteen markdown documents totalling more than thirteen thousand lines, and a network diagram authored as `network.drawio` and rendered to PNG via a custom skill that bypasses the known drawio CLI bounding-box bug.

# Design patterns

UDCSP is built on a deliberate stack of well-named design patterns, each chosen because it solves a concrete problem.

The voice channel is the most agentic of the three. When a Norwegian citizen named Lars dials the toll-free number, the call lands on Azure Communication Services in Norway, Event Grid routes the call event to a Container App orchestrator running in `norwayeast`, and the orchestrator opens a bidirectional WebSocket to Azure OpenAI gpt-realtime — a single stream that combines speech-to-text, reasoning, and text-to-speech.

Inside that stream, the LLM autonomously decides whether to answer directly, to invoke the `lookup_topic_router` function tool (which calls APIM `/agent-topic-router/messages` and routes to one of the six downstream Foundry agents), or to invoke `escalate_to_human` (which warm-transfers the call to a D365 voice workstream queue).

This is the Microsoft Agent Framework Agents-as-Tools pattern, applied to a real PSTN channel — not a chatbot inside a browser, but a citizen with a phone.

The application-intake path uses saga orchestration. The Logic App `cross-border-residency` is a six-step orchestration with named states — `document-uploaded`, `extracted`, `translated`, `pre-assessed`, `partner-confirmed`, `case-created` — and explicit compensating actions when any step fails.

The partner-agency call is wrapped in a circuit breaker at the APIM layer. Fifty per cent failure over sixty seconds opens the breaker for five minutes; the upstream is guarded from a partner outage and falls fast to a manual caseworker queue when the breaker is open. Every cross-border message carries an `Idempotency-Key` (UUID v4) and a signed JWS — `iat ± 5 minutes`, `jti` recorded for 24 hours — so a partner replay does not double-create a case and a hostile replay is rejected outright.

The data path uses a CQRS-light split. The write path goes through the Logic App `application-intake` and ends up in Dataverse; the read path goes through an APIM op-policy directly on Dataverse for *My cases*, with response caching at the gateway. The caseworker workspace is built as a strangler fig: today the SPA writes to the Dataverse `task` activity entity, tomorrow when D365 Customer Service licences land it will write to the canonical `udcsp_application` entity — same schema, single Logic App repointing, no SPA change.

The defence-in-depth posture is the most visible pattern. Six independent layers each block a different class of threat: Front Door + WAF at L7, DDoS Protection Standard at L3/L4, Azure Firewall Premium at egress, APIM rate-limit + Defender for APIs at the API surface, Private Endpoints + per-country Private DNS at the data plane, and Azure AI Content Safety + jailbreak detector + Eligibility deterministic rule plug-in at the AI surface.

A malicious prompt attempting to pivot the Eligibility verdict has to defeat all six. It cannot.

# Security

Security is principle P3 of the architecture — a platform-level invariant, not a project-level afterthought. The implementation spans nine security subdomains and eight identity subdomains.

On the data and decision side, the Eligibility Pre-Assessor agent — the only high-risk AI under Annex III §5(b) of the EU AI Act — runs inside an Azure Confidential Container App with SEV-SNP attestation. Every prompt and every fragment of partner-agency data fetched for the verdict are encrypted in memory during inference, even from a privileged Azure operator.

Once a verdict is computed, it is hashed and appended to Azure Confidential Ledger, a CCF-backed tamper-evident log that gives cryptographic proof of integrity beyond what Application Insights or Microsoft Fabric can offer. The caseworker disposition that follows — confirm, adjust, reject, request more info — is anchored to the same ledger entry. Six months later, a regulator can reconstruct the decision end-to-end from the ledger anchor.

On the identity side, three CIAM tenants — `udcspdk.onmicrosoft.com`, `udcspse.onmicrosoft.com`, `udcspno.onmicrosoft.com` — federate citizens through their national eIDs. MitID for Denmark, BankID and Freja+ for Sweden, ID-porten and MinID for Norway, via certified OIDC brokers.

Microsoft Entra Verified ID is the issuer and verifier for the EUDI Wallet bridge under eIDAS 2.0, with selective disclosure built in. A DK to SE residency case only crosses the border with the minimum disclosure envelope `{givenName, familyName, dateOfBirth, addressCountry, eIDAS-LoA}` — no national ID number, no document copy. Citizens holding an EUDI Wallet validate each disclosure interactively.

Microsoft Entra Permissions Management (CIEM) continuously inventories entitlements across the three sovereign tenants and produces drift alerts. Azure Bastion (Standard) is the only path for caseworker and SRE shell access — there are no jump boxes, no public RDP, no public SSH anywhere on the platform. The only public IP per country is the Bastion PIP.

On the network side, Azure Firewall Premium is the single egress path for every spoke workload, with FQDN allow-lists per workload. The Foundry agents reach `*.cognitiveservices.azure.com` only, the Logic Apps reach the published national-authority endpoints only, the Container Apps reach Azure Container Registry and Microsoft Graph only. TLS inspection is on for any HTTP egress to a non-Microsoft destination. Citizen documents never leak through an unintended TLS path.

On the response side, Microsoft Defender for Cloud covers CSPM and workload protection. Microsoft Defender for APIs covers the APIM surface — the only ingress for the consolidated platform. Microsoft Sentinel is the SIEM and SOAR with AI-specific playbooks for prompt injection and model exfiltration. Microsoft Defender for Storage scans every inbound document: `Clean` lets it through, `Malicious` quarantines it and opens a Sentinel incident, `Unknown` routes it to a manual-review queue. Every event carries the W3C `traceparent` and the country tag.

# Monitoring

Observability is the contract between the operator and the citizen. Every interaction must be recordable, replayable and explainable.

UDCSP keeps three sovereign Application Insights instances (one per country) and three sovereign Log Analytics workspaces (one per country, plus three Sentinel workspaces for security). The instances are never federated. A Danish citizen interaction lands only in the Danish App Insights, and the Foundry diagnostic logs of the shared AOAI account land in the Norwegian LAW (the AOAI account is platform-shared by design — see the sovereignty trade-off in the AI section).

A W3C `traceparent` is propagated end-to-end through every channel — from Azure Front Door at the edge, to APIM, to Logic Apps, to Azure Functions, to D365 plugins, to the Foundry agent, to the AOAI model call, and back.

Every event the platform emits — a citizen page view, a consent acceptance, a document upload, a model invocation, a caseworker disposition, a Sentinel incident, a Confidential Ledger anchor — carries the same `traceparent`. A DPO or a regulator can pick any `operation_Id` in the operator workbook, drill into Application Insights Transaction Search, and replay the full causal chain from the citizen's browser to the model's response in seconds.

The operator-facing surface is nine Azure Workbooks — three per country, deployed live as shared workbooks. `platform-health` shows request volume, p50/p95/p99 latency, dependency success and failure, exceptions and AOAI tokens by model deployment. `citizen-journey-funnel` shows the funnel from page view to case open, activity per language so a per-locale gap surfaces in raw telemetry before it appears in case data, channel mix and an APIM hits fallback. `ai-decision-traces` shows every verdict with confidence, decision, locale, channel, agent and an `operation_Id` that drills to Transaction Search.

The same workbook also exposes the full AOAI request/response log via cross-resource KQL — a single dashboard, four surfaces of evidence.

The executive surface is on Microsoft Fabric F64 in the sovereign EU capacity, with a Power BI Premium semantic model that uses Direct Query against the three App Insights and the three LAWs and Dataverse. The aggregation happens server-side at Fabric. Raw rows never leave their country.

SLOs are explicit and budgeted. The citizen web portal is 99.9 % over 28 days per country, an error budget of 40 minutes per month. The voice channel is 99.5 % answer rate with a p95 turn latency of 2 seconds — 22 hours per month. The Topic Router is 99.5 % at p95 ≤ 1 second. The Eligibility verdict is 99.9 % at p95 ≤ 3 seconds. Case creation in D365 is 99.5 % at p95 ≤ 5 seconds.

Burn-rate alerts page the on-call when 2 % of the monthly budget burns in 1 hour and escalate to a manager at 5 % in 6 hours. Synthetic monitoring runs from five external regions (Germany, France, UK, Spain, Italy) every minute against each citizen URL and the IVR test number. A weekly multi-step login test exercises the full External ID to SPA to APIM to topic-router path per country.

Real-User Monitoring on the SPA captures TTFB, LCP, INP and CLS per page per locale per country — so a Polish-CSAT gap visible in the funnel can be cross-referenced with a real-user performance issue, if there is one.

FinOps is a first-class observability concern. Every resource is tagged with `country`, `workload` and `cost-center`. The Management Group hierarchy mirrors the sovereign zones. The per-agent monthly token budget lives in `foundry/projects/*/agent.yaml` and CI fails when the total declared budget exceeds the AOAI pool capacity.

The executive Power BI page slices tokens by agent, channel, language and country, with a Cost Management anomaly alert at +30 % day-over-day. Reserved PTU baseline covers the steady-state of gpt-5.4 and gpt-realtime; pay-as-you-go covers elastic peaks on gpt-5.4-mini.

# AI integration

UDCSP runs seven Microsoft Foundry agents in production, replicated identically across the three country hubs.

Each agent has a stable name with auto-incrementing versions, an Entra-only authentication contract (no API keys, period), a managed identity per agent version, a registered EU AI Act risk class, and an evaluation suite that gates every promotion through CI.

The Topic Router owns the conversational shell. It detects the citizen's intent across 12 languages, manages slot-filling state in Azure Cache for Redis, and dispatches to the right downstream agent. Its model is gpt-5.4-mini because the work is latency-critical, low-token and high-volume. It is invoked from two paths: by the SPA, mobile and chat widget through APIM `/agent-topic-router/messages`, and by the voice orchestrator through the `lookup_topic_router` function tool that gpt-realtime exposes to the LLM. Either way, the Topic Router never holds long-term state — its memory is the Redis slot-filling cache, scoped per session, expired in 24 hours.

The Request Classifier (gpt-5.4-mini) classifies every inbound request by intent, target agency, language and urgency. The Translator orchestrator (gpt-5.4 plus the Azure AI Translator service) bridges across the 12 languages, preserving the administrative terminology that civil servants insist on. The Document Extractor (gpt-5.4-mini plus Azure AI Document Intelligence) reads citizen-uploaded passports, payslips and leases and returns structured fields, redacted of any PII never required by the downstream agent. The Citizen Assistant (gpt-5.4, grounded) answers questions in natural language with mandatory citation enforcement — every reply has to cite a knowledge-base document by `docId`, or APIM blocks the response. The Caseworker Copilot Helper (gpt-5.4, grounded on the case record) drafts replies, summarises the case history and suggests the next-best action — purely advisory, never operative.

The Eligibility Pre-Assessor (gpt-5.4 plus deterministic rule plug-ins) is the only high-risk agent and is treated accordingly.

It runs inside a Confidential Container App, hashes every verdict to Confidential Ledger, and follows a champion-challenger lifecycle. Any new version receives 5 % of production traffic in shadow for one week. The gold evaluation set is run in all 12 languages. Any locale that scores more than 0.4 below the Swedish baseline blocks the promotion until the gap is closed or an explicit waiver is recorded in the AI Act registry. Drift is tested daily on input and output distributions with a Kolmogorov-Smirnov test. Bias is monitored on protected attributes (age band, locale, channel) over the past 30 days. Rollback is a deployment-alias flip that takes seconds and writes an audit entry to the registry.

The sovereignty exception is honest and documented. Microsoft has rolled out gpt-realtime to `swedencentral` and `northeurope` but not yet to `norwayeast`. The Norwegian voice orchestrator therefore opens its WebSocket to the Swedish hub's gpt-realtime deployment under Microsoft EU Data Boundary and the Nordic Data Protection Authorities cross-border cooperation framework.

Citizen-side audio and STT transcripts persist only in Norway in the ADLS Gen2 `voice-recordings/` container with WORM 90 days. The day gpt-realtime lands in `norwayeast`, a single Bicep parameter flip moves the inference to the Norwegian hub. No application change.

# Agentic behaviour

UDCSP is multi-agent by construction, not by veneer.

The most visible agentic moment is the voice channel. When Lars asks for help with his tax refund, gpt-realtime receives his audio, reasons over the request, and decides on its own whether to answer, to invoke `lookup_topic_router` (which routes to one of the six downstream Foundry experts), or to invoke `escalate_to_human` (which performs the warm transfer to a D365 voice workstream). The LLM is treated as a tool-using agent in the canonical Microsoft Agent Framework sense.

Beyond voice, UDCSP demonstrates four further coordination patterns.

Handoff is the bread and butter. The Topic Router passes the conversation to the Citizen Assistant, the Doc Extractor, the Classifier, the Translator or the Eligibility Pre-Assessor depending on intent, and each can hand back.

State-graph orchestration is what Logic Apps deliver. `cross-border-residency` is a six-step graph with named states and compensating actions on partner-agency failure.

Reflection and critique is how the Eligibility verdict is consumed. The Caseworker Helper takes the verdict, surfaces the confidence and the missing evidence in natural language, and the caseworker's disposition is recorded back as ground truth — feeding the next training iteration.

Shadow and canary is how new models reach production. A challenger gets 5 % of production traffic. The Logic App `ai-decision-shadow-mode` replays anonymised prompts in parallel through the challenger. The deployment alias is autonomously flipped only if every guarded metric passes.

The agentic story is not a chatbot. It is a system of seven specialised experts, two function tools, one orchestrator, five coordination patterns — all under the supervision of one human caseworker.

# Demonstration scenarios

The live walkthrough covers seven scenarios — four citizen journeys, one security incident, one compliance audit, one DevOps onboarding. Each is directly executable on the deployed platform, with a named persona and a clear hook for the executive audience.

![Anna — Danish citizen moving DK to SE; flagship cross-border story.](images/Demo1.png){width=45%}

Anna lands on the Swedish portal in Danish (auto-detected from her browser, switchable to Swedish or English), signs in with her Danish eID through External ID federation, and starts a residency application. She uploads her DK passport and her Stockholm lease.

The Document Extractor returns structured fields in under four seconds. The Translator turns the lease from Danish into Swedish, preserving the administrative vocabulary the Skatteverket caseworker expects. The Eligibility Pre-Assessor returns a confidence-scored verdict with the rule-by-rule evidence trail and the list of missing documents. Anna consents on the explanation — not on the verdict alone — and submits.

The Logic App `cross-border-residency` orchestrates the case through the federation hub mTLS gateway to the Danish CPR partner, receives the signed claims confirmation token, and creates the case in the Swedish D365 environment with the AI verdict attached. A Swedish caseworker reviews and disposes.

SLA target: four days, against the 28-day baseline.

![Lars — blind Norwegian citizen on the voice channel; gpt-realtime plus function tools.](images/Demo2.png){width=45%}

Lars is blind. He dials `+33 801 150 799`, the Norwegian toll-free number bound to the Norwegian Azure Communication Services resource. Event Grid routes the call event to the Container App voice orchestrator running in `norwayeast`.

The orchestrator opens its WebSocket to gpt-realtime and the conversation begins. Lars speaks Norwegian. The model answers in Norwegian. On the question about his tax refund, the LLM invokes the `lookup_topic_router` function tool, the Topic Router routes to the Citizen Assistant, the Citizen Assistant grounds its answer on the Skatteetaten knowledge base, and the voice channel returns the result.

When Lars asks to speak with a human, the model invokes `escalate_to_human` and the call is warm-transferred to a D365 voice workstream queue with the full context attached. Audio and STT transcript persist in `voice-recordings/` with WORM 90 days.

Every turn is in the Norwegian Application Insights workbook within two minutes, with a clickable `operation_Id` that drills into the full traceparent chain.

![Maria — Polish caregiver in Denmark using NVDA; accessibility as a citizen right.](images/Demo3.png){width=45%}

Maria is a Polish caregiver living in Denmark. She uses NVDA on Windows 11 and keyboard navigation. The SPA loads in Polish, end-to-end — labels, error messages, AI summary, consent text.

The axe-core CI gate has been green on the citizen rail for months. The RouteAnnouncer and the cookie-banner accessibility patches shipped earlier in the year mean every route change is announced and every consent prompt is reachable by keyboard.

The citizen-journey-funnel workbook lights up with `customDimensions['locale']='pl'`. The per-locale evaluation suite has the Polish gold dataset in CI — if a model promotion regresses Polish more than 0.4 below the Swedish baseline, it blocks.

Accessibility is not a feature in UDCSP. It is a citizen right under the Web Accessibility Directive 2016/2102 and WCAG 2.1 AA.

![Erik — Danish SMB owner on iPhone; responsive PWA, native iOS document chooser.](images/Demo4.png){width=45%}

Erik runs a small construction business in Aarhus. He starts an income-based benefit application on his iPhone, on the same `udcsp.fredgis.com` URL Anna used on her laptop. Twenty-one media queries cover the responsive breakpoints from a 375 px iPhone SE to a 430 px iPhone 14 Pro Max.

He uses the native iOS document picker to snap a photo of his April payslip. The Document Extractor returns the structured fields. The AI eligibility verdict appears inline with the explanation. Submit. *My cases* timeline updates in real time.

The accessibility menu, the chat widget, the consent banner — all reflow to one column under 600 px.

Demo 4 proves there is no separate native binary, no separate codebase, no separate caseworker workflow. Mobile parity is built in, not bolted on.

![Prompt injection contained at three independent layers — APIM, Content Safety, deterministic rules.](images/Demo8.png){width=45%}

A red-team prompt arrives on the chat widget attempting to extract the system prompt, then to pivot the Eligibility verdict by injecting a tool-call.

APIM rate-limits the spike within the rolling 60-second window. Microsoft Defender for APIs scores the request as anomalous and writes a Sentinel incident. The Foundry Content Safety jailbreak detector emits a `safety.block` `customEvent`. The Eligibility deterministic rule plug-in rejects the request before LLM inference ever fires.

The Sentinel playbook automatically isolates the offending session, recovers the citizen flow, and exports the audit pack with the full `correlationId` chain attached.

The whole containment takes 38 seconds. No citizen data was exposed.

![Hans — Danish DPO replaying a six-month-old AI decision in under ten minutes.](images/Demo7.png){width=45%}

Hans is the Danish DPO. A citizen has filed an Article 15 subject access request, asking for every AI decision UDCSP made about her over the past six months.

Hans opens Log Analytics workspace `udcsp-dk-prod-law`, filters `AzureDiagnostics` on `ResourceProvider == "MICROSOFT.COGNITIVESERVICES"` and the citizen's `correlationId` (derived from the DSAR), pulls the exact model deployment name, prompt tokens, completion tokens, latency and status code for every model call. He pivots to `ApiManagementGatewayLogs` on the same `operation_Id` and gets every inbound request. He pivots to Dataverse for the caseworker disposition. He checks the Confidential Ledger entry for the tamper-evident anchor.

The decision happened six months ago — well within the 730-day LAW retention configured to honour the EU AI Act Article 12.3 minimum of six months, with a 2× safety margin.

The full audit pack assembles in under ten minutes.

![Ole — DevOps engineer onboarding a clean MCAPS tenant in a single command.](images/Demo10.png){width=45%}

Ole is the DevOps engineer evaluating the platform for adoption. He clones the repository on a clean MCAPS sandbox tenant, authenticates with `az login`, `pac auth create` and `Connect-MgGraph`, then runs the master installer.

Twenty-five phases execute in dependency order — Landing Zone, Identity, Security, Data, Observability, APIM, Foundry, D365, Frontend, Voice, Governance, QA. The A15 synthetic-data agent seeds tens of thousands of personas, applications and multilingual conversations into Fabric and Foundry, in parallel with the frontend deployment.

The A14 smoke suite runs at the end — identity, APIM health, Foundry agent reachability, D365 case creation, Power BI dataset refresh, accessibility quick-scan. The HTML report at `scripts/install/reports/<timestamp>/install-report.html` is green across the board.

Ole opens the freshly deployed Swedish portal, signs in as a synthetic Maria persona, replays Demo 3 against his clean install.

From `git clone` to a working federated platform with realistic data: one command. The same script runs in CI on every PR that touches infrastructure or apps.

# Implementation completeness

The case study mandates nine services. UDCSP wires all nine — Microsoft Entra External ID, Microsoft Entra ID, Azure OpenAI via Microsoft Foundry, Microsoft Fabric, Dynamics 365 Customer Service, Azure API Management, Microsoft Purview, Azure Logic Apps, and Power BI Premium.

UDCSP adds ten more that an EU public-sector go-live is expected to ship with even if the demo does not exercise them end-to-end: Microsoft Entra Verified ID, Azure Bastion (Standard), Microsoft Entra Permissions Management (CIEM), Azure DDoS Protection Standard, Azure Confidential Ledger, Azure Confidential Computing, Microsoft Defender for APIs, Azure Backup with Azure Site Recovery, Azure Chaos Studio, and Microsoft Priva.

Every one of them has its own install module, its own Bicep, its own smoke test, its own audit hook in the governance plane.

The repository is 868 tracked files. Forty-seven Bicep modules. Twenty-five PowerShell install modules. Seven Foundry agents. Five applications: web, mobile, voice, D365 solutions, Power Apps caseworker. Ten Logic Apps per country. Eleven APIM APIs. Six test categories: accessibility, conformance, end-to-end, evaluation, load, security. Seven governance areas: AI Act, DPIA, GDPR, identity, Priva, Purview, security. Fourteen documents totalling more than thirteen thousand lines.

The installer is the truth-teller. Each of the twenty-five phases has a `Test-<Phase>` smoke verb, a `-WhatIf` plan-only mode, and a `-Phase <name>` re-run flag. A failed install leaves the repository in a consistent, restartable state. The post-install report is HTML and is green or red — no in-between.

# Performance and reliability

Reliability is engineered, not assumed.

Each country runs active-passive with DNS-level Front Door priority routing. When the primary region degrades, traffic flips to the paired EU region within five minutes. The Recovery Point Objective is fifteen minutes across every stateful workload. The Recovery Time Objective is four hours to a full citizen-facing service in the paired region.

Azure Backup vaults are per country (Postgres, Redis, critical Storage, agent VMs). Azure Site Recovery replicates between paired EU regions. Azure Chaos Studio injects faults — region failover, NSG isolation, Postgres failover, per-country Foundry hub blackout — on a monthly cadence in non-production and a quarterly cadence in production.

The 99.9 % SLO published in the observability section is not a marketing claim. It is empirically validated through the chaos drills, and the burn-rate alerts are wired through Teams and PagerDuty to the on-call rotation.

The Eligibility verdict path is the latency-sensitive one. Citizens consent on the explanation, and the explanation has to arrive in under three seconds at p95. The voice channel is the most latency-sensitive of all — gpt-realtime turn latency has to stay under two seconds at p95, or the conversation becomes unnatural.

The Container App voice orchestrator runs with a minimum of one replica per country to avoid cold-start penalties, scales horizontally to six replicas on a `concurrentRequests=20` threshold, and is pre-warmed before every demo by a dial-test from the operator's terminal.

# Presentation and documentation

The submission is built to be read.

The repository is split into a business-facing `docs/biz/` for executives and case-study reviewers — `uses.md` with the ten demo scenarios, `recipe.md` with the eight acceptance scenarios, `ai.md` with the AI deep dive, `voice.md` and `chat.md` and `web.md` and `mobile.md` and `sms.md` and `email.md` and `caseworker.md` for the per-channel deep dives, `datacompliance.md` with the eight-regulation control mapping, `traceability.md` with the citizen-facing GDPR and AI Act promise, `personas.md` with the seven personas.

It is also split into a technical-facing `docs/tech/` for architects and platform engineers — `architecture.md` at 1 420 lines, `network.md` with the drawio source and PNG, `data.md` with the five storage zones and retention matrix, `monitoring.md` with the telemetry plan and AI Act evidence trail, `installation.md` at 1 710 lines, `inprogress.md` as the live demo-readiness tracker, `plan.md` and `agents.md` for the multi-agent build trail, `runbook-dr.md` for disaster recovery.

Every document has a table of contents, every diagram has a caption, every claim has a code reference.

Two custom Copilot CLI skills support the documentation pipeline. The first, `md2pdf`, turns any markdown into a professional PDF via pandoc and xelatex, pre-rendering Mermaid diagrams to PNG when needed — this very document is its output. The second, `drawio2png`, exports a draw.io diagram to SVG and rasterises it with Puppeteer to bypass the known drawio CLI bounding-box bug. Both skills live in a separate repository — `github.com/fredgis/fabric-foundry-kb` — and are reusable beyond UDCSP.

# Closing

UDCSP is not a demo wrapped around a few Azure services.

It is a production-grade unified citizen platform for the three Nordic countries, spanning three sovereign Azure zones, seven AI agents, forty-seven Bicep modules, twenty-five install scripts, fourteen documents and 868 tracked files.

Every architectural decision is anchored to a regulation — GDPR, the EU AI Act, ePrivacy, eIDAS 2.0, NIS2, the Web Accessibility Directive, national administrative law. Every claim is provable by a live demonstration on a real Azure tenant.

The citizen who started this story — Anna in Copenhagen — does not need to know any of this. She signs in once, fills in one form, gets her residency decision in four days instead of twenty-eight.

The platform is invisible to her. That is exactly the point.
