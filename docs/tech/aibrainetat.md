---
title: "AI Brain — implementation vs. theory"
subtitle: "What is actually in the repo, what is blueprint, and how to defend the gap"
author: "UDCSP architecture team"
date: "May 2026"
---

# Why this document exists

The §"The AI Brain" chapter of `AMA_Use_Case_11_Project_Executive_Overall.pdf` describes the target multi-agent architecture in production-target tense. UDCSP is positioned as a *production-oriented demonstrator*, so a measurable gap exists between what the dossier promises and what the repo actually contains today.

This file walks the gap claim by claim, with file-by-file evidence, so it can be explained during the AMA walkthrough without surprises.

# What the AI Brain chapter says, in plain words

The chapter describes a brain made of one orchestrator, six worker agents, and a safety layer, all on Azure AI Foundry.

| Role | What it does | Why it is built this way |
|---|---|---|
| Topic Router | Reads the utterance, detects the language, keeps conversation state in Redis, picks the right agent to call. | Latency-critical, high-volume, low-token — a small fast model is enough. |
| Request Classifier | Adds a tag: intent / agency / language / urgency. | Pre-sorting before the heavier agents fire. |
| Translator | Translates across the 12 languages while preserving the administrative jargon. | Azure AI Translator for plain prose, reasoning model for sensitive passages. |
| Document Extractor | Reads passports, payslips, leases and returns structured fields, redacting PII the downstream agent does not need. | Azure AI Document Intelligence does the OCR, the model structures the result. |
| Citizen Assistant | Answers questions and must cite a knowledge-base `docId`. | APIM blocks the response when the citation is missing. |
| Caseworker Helper | Drafts replies, summarises the case, suggests next-best-action. | Purely advisory — never operative. |
| Eligibility Pre-Assessor | Pre-assesses eligibility and proposes a verdict with the evidence. | The only EU AI Act Annex III §5(b) high-risk agent. |

The platform rule is non-negotiable: the Eligibility agent never makes a final decision. It proposes. A human caseworker confirms, adjusts or rejects. The proposed verdict is hashed into Azure Confidential Ledger so a regulator can replay it six months later with cryptographic proof of integrity.

The three "models" mentioned in the dossier (frontier reasoning, low-latency routing, real-time speech) are Azure OpenAI deployment aliases whose targets are `gpt-5.4`, `gpt-5.4-mini` and `gpt-realtime`. The tenant ↔ alias binding is driven by a Bicep parameter, so the alias is overridable per tenant.

# The gap — claim by claim, file by file

| Claim from the dossier | What is actually in the repo | Honest status |
|---|---|---|
| 7 Foundry agents with managed identity, Entra-only auth, risk class | `foundry/agents/{topic-router,classifier,translator,doc-extractor,citizen-assistant,caseworker-helper,eligibility}/agent.yaml` — all present with model, tools, content-safety and risk level declared. | Contracts implemented. Foundry runtime deployment depends on the tenant. |
| AI Act registry entry per agent | 7 files under `governance/ai-act/registry/*.yaml`, plus a validator `Validate-AIRegistry.ps1`. | Implemented. |
| Topic Router → Redis for slot-filling | `infra/data/redis/redis-enterprise.bicep` provisions Redis. The tools `read_session_redis` and `write_session_redis` are declared in `agent.yaml` but their Foundry runtime implementation is opaque (Foundry calls them on our behalf). | Infra present, contract declared, runtime opaque. Slot-filling works during the demo provided the tenant has a valid Azure OpenAI deployment behind the alias. |
| APIM `/agent-topic-router/messages` | `services/apim/apis/agent-topic-router/openapi.yaml` and `policy.xml`. | Live demonstrator. |
| Voice channel → `lookup_topic_router` function tool | `apps/voice/call-automation/src/foundry-tool.ts` + Bicep `voice-orchestrator.bicep` + `gpt-realtime-deployment.bicep`. | Live demonstrator (subject to `gpt-realtime` availability in the target region). |
| Eligibility inside a SEV-SNP attested Confidential Container | `infra/security/confidential-compute/eligibility-confidential-app.bicep` exists, but the default container image is `mcr.microsoft.com/azuredocs/containerapps-helloworld:latest` and the workload profile is `Consumption` (not a confidential SKU such as `D4adsv5` / `D8adsv5`). | Bicep skeleton in place. The confidential image and the confidential workload profile are not yet wired. Today the Eligibility inference runs in the standard Foundry hub. Blueprint. |
| Verdict hashed and appended to Azure Confidential Ledger | `infra/security/confidential-ledger/confidential-ledger.bicep` provisions the resource. The `lineage-writer` tool is declared on the agent, but the code that computes the hash and `POST`s to the ledger is not in the repo. | Resource provisionable. Anchoring pipeline is blueprint. |
| Champion-challenger lifecycle: 5 % shadow, gold eval, KS drift, 30-day bias, alias flip | No CI workflow, no GitHub Action, no script implementing these gates. The pattern is only described in `docs/biz/ai.md`, `docs/tech/architecture.md` and the presentation. | Design pattern documented; not implemented in CI. Blueprint. |
| Sovereignty exception: Norwegian voice routes to the Swedish hub for `gpt-realtime` | `voice-orchestrator.bicep` accepts a `country` and `location` parameter. `gpt-realtime-deployment.bicep` can target a different region. The "single Bicep param flip" is technically achievable, but the runtime wiring (NO orchestrator calling an SE endpoint) is not yet exercised end-to-end against the tenant. | Infrastructure ready; not yet validated end-to-end. |
| `infra/foundry/deployments.bicep` reference | The folder `infra/foundry/` does not exist. The only Foundry-runtime Bicep files live under `apps/voice/call-automation/infra/`. | Imprecise reference in the dossier — the path mentioned does not exist as such. To be corrected in the next document iteration. |

# How to explain it during the AMA walkthrough

In one breath the message is:

> The repo ships the contracts: 7 `agent.yaml`, 7 AI Act registry entries, the APIM OpenAPI for the Topic Router, the Container App Bicep for the Eligibility TEE, the Confidential Ledger Bicep, and the voice orchestrator with its function tool for the real-time speech model. These are concrete artefacts, not wishful thinking.

> Live today: Topic Router, Translator, Document Extractor and Citizen Assistant in Demos 1 to 4. The voice channel in Demo 2 uses the real function tool. The Caseworker Helper is implemented on the agent side but driven by the strangler-fig writes while D365 Customer Service licences are pending.

> Blueprint and openly stated: the Eligibility TEE — the Container App is there, the Confidential Ledger is there, but the confidential image and the `lineage-writer` pipeline are not. The champion-challenger lifecycle — the pattern is documented but no CI job runs it today. These are precisely what Gates 1 and 2 of the roadmap close.

## Three follow-up answers held in reserve

1. On the model aliases — *"`gpt-5.4`, `gpt-5.4-mini`, `gpt-realtime` are target deployments. On a tenant that does not have them yet, the Bicep parameter `modelDeploymentName` routes to a fallback such as `gpt-4o-mini` with no application change. A quality regression would surface in the gold-set; today the gold-set is a YAML definition, not a running CI job."*

2. On the Eligibility TEE — *"Bicep is ready, standard image. Switching to a SEV-SNP confidential image is a two-parameter change: `workloadProfileName` to `Confidential` and `image` to the signed container. The Foundry-side code does not change — that is the point of the pattern."*

3. On the Norwegian sovereignty exception — *"The Norwegian voice orchestrator already talks to a parameterised endpoint. Today, with no `gpt-realtime` deployment in `norwayeast` on the tenant, it can be pointed at `swedencentral` with a single parameter flip. Compliance still holds: transcripts persist only in Norway, the inference happens in Sweden under the Microsoft EU Data Boundary."*

# What closes the gap

The gap is exactly what the *production-oriented demonstrator* positioning authorises. The four roadmap gates in `AMA_Use_Case_11_Project_Executive_Overall.pdf` §Roadmap close it explicitly:

| Gate | What it closes |
|---|---|
| Gate 1 — Tenant validation (week 1–2) | `gpt-5.4`, `gpt-5.4-mini`, `gpt-realtime` aliases verified in target regions; the imprecise `infra/foundry/deployments.bicep` reference is replaced with the actual deployment file location. |
| Gate 2 — Live confidential compute (week 3–6) | The Eligibility Container App image is swapped for a SEV-SNP confidential container; the `lineage-writer` tool is wired to Confidential Ledger; the first attested verdict is replayed end-to-end in CI. Demo 6 transitions from *Blueprint* to *Live*. |
| Gate 3 — Partner-agency integration (week 6–14) | mTLS partner gateways exercised; Demo 1 transitions from *Live demonstrator* to *Live with real authority back-end*. |
| Gate 4 — D365 Customer Service activation (week 14–20) | Strangler-fig writes repointed to the canonical case entity; Demo 5 transitions from *Blueprint* to *Live*. |

# Companion documents

- The full executive overview — `presentation/AMA_Use_Case_11_Project_Executive_Overall.pdf`.
- The AI design — `docs/biz/ai.md` (mental model, agent catalogue, per-channel AI footprint, RAG strategy, safety + eval pipelines, EU AI Act registry, end-to-end conversation flow, anti-patterns).
- The target architecture — `docs/tech/architecture.md`.
- The 10-demo run-book — `docs/biz/uses.md`.
