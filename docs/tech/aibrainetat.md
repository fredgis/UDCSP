---
title: "AI Brain: implementation vs target"
date: "2026-08-11"
---

# AI Brain: implementation vs target

_Last verified: 2026-08-11 · commit f940d39 · security remediation committed, not deployed_

This document reconciles the AI narrative with the repository and the deployed demonstrator. It is intentionally English-only and uses the documentation status vocabulary:

🟢 **Live** · 🟡 **Partially deployed** · 🔵 **In repo** · ⚙️ **Scripted** · 🗺️ **Roadmap**

> [!CAUTION]
> The pending security remediation is source-only. Nothing has been deployed. Current live APIM policies, voice images, workflows, and web assets keep their previous behavior until deployment.

## 1. Runtime path used by the demonstrator

The web chat and voice function tool share the same APIM endpoint:

```text
Chat widget ---------\
                      > APIM /agent-topic-router/messages
Voice function tool -/             |
                                    v
                         Azure OpenAI Responses API
                         in the Foundry project
```

This is not the full Foundry Agents runtime. The APIM policy calls `/openai/v1/responses` with a system message and a separate user message. The agent contracts, tools, topics, and Redis connections exist in repo, but the demonstrator does not execute the topic-router state machine through `/agents/{agent-id}/runs`.

| Element | Honest status |
|---|---|
| Web and voice call the same APIM route | 🟢 Live on exercised paths |
| APIM authenticates outbound to Foundry with managed identity | 🟢 Live |
| Pending JWT audience, scope, and endpoint authentication hardening | 🔵 In repo, not deployed |
| User text separated from system instructions | 🔵 In repo, not deployed |
| Foundry agent contracts under `foundry/agents/` | 🔵 In repo |
| Full topic state machine, declared tools, and Redis slot filling at runtime | 🗺️ Roadmap for the demonstrator |

## 2. What the seven agents actually represent

| Agent | Repository contract | Runtime reality |
|---|---|---|
| Topic Router | Route and orchestration contract | 🟡 APIM prompt path is exercised; full agent state machine is not |
| Classifier | Intent, agency, language, urgency | 🟡 Invoked on selected workflow paths |
| Translator | Administrative-language translation | 🟡 Invoked on selected Logic App paths |
| Eligibility Pre-Assessor | Advisory eligibility recommendation | 🟡 Citizen-facing pre-assessment exists; canonical caseworker persistence is partial |
| Citizen Assistant | Grounded citizen guidance | 🟢 Exercised through chat and voice |
| Document Extractor | Intended document field extraction | 🟡 Endpoint is callable, but it does not extract document content |
| Caseworker Helper | Summary and draft assistance | 🔵 Contract and endpoint assets exist; D365 Customer Service integration is incomplete |

No agent makes a final administrative decision. Eligibility is a recommendation for human disposition.

## 3. Document Extractor: the critical evidence limitation

The current `services/apim/apis/agent-doc-extractor/policy.xml` does not send a readable document to an extraction service. It sends only a short prefix of base64 and instructs the model to infer plausible values from the filename.

The corrected source now adds:

```json
{
  "synthetic": true,
  "provenance": "inferred-from-filename"
}
```

That is an honesty control, not real extraction.

| Claim | Actual state |
|---|---|
| "The extractor reads passports, payslips, or leases" | False |
| "Azure AI Document Intelligence performs OCR" | 🗺️ Roadmap |
| "The model validates OCR fields" | False, there are no OCR fields in this path |
| "The returned fields are evidence from the document" | False, they are synthetic filename inferences |
| Provenance appears in the corrected APIM response | 🔵 In repo |
| Workflow, storage, and caseworker UI preserve that provenance | Incomplete |

EU AI Act Article 14 human oversight is not meaningful if a caseworker sees invented values presented as extracted facts. Before the fields can support a decision, either:

1. wire Azure AI Document Intelligence and preserve real field-level provenance, or
2. preserve the synthetic markers through every downstream workflow and label the values clearly in the UI.

## 4. Traceability and voice telemetry

The W3C `traceparent` chain remains useful. It correlates the voice orchestrator, APIM, Foundry, and downstream calls.

The pending source remediation deliberately removes conversation content from telemetry:

- user and assistant events log transcript lengths, not transcript text
- tool events log argument keys, not argument values
- correlation identifiers, event names, timing, and status remain

Therefore:

- do not claim that voice transcripts are retained or queryable in Application Insights
- do not use App Insights as the content source for a DSR export
- do use `traceparent` and `operation_Id` for operational correlation
- if transcript retention is required later, use an authoritative case store with explicit retention, access control, and DSR coverage

## 5. AI Act lineage and Confidential Ledger

### Lineage API

The lineage API previously imported with no APIM policy. The corrected source:

- requires the External ID JWT fragment
- applies bearer security requirements in OpenAPI
- fails closed with `503`
- makes the installer reject an API directory that lacks `policy.xml`

Status: 🔵 **In repo**, not deployed. The endpoint is not operational because no lineage backend exists.

### Confidential Ledger

`infra/security/confidential-ledger/` can provision the resource, but the repository does not contain an operating pipeline that hashes each decision and writes the anchor.

Status: 🗺️ **Roadmap**. Do not describe caseworker overrides or AI decisions as ledger-anchored today.

## 6. GDPR export and erasure identity

The corrected APIM policies derive the citizen subject from the validated token, remove any caller-supplied trusted header, forward `x-udcsp-citizen-upn`, and reject a mismatching body subject with `403`.

Status: 🔵 **In repo**, not deployed.

This contract covers citizen self-service only. A DPO acting for another citizen needs a separate authenticated actor identity, explicit delegation or role, subject binding, and audit record. That delegated DSR contract is 🗺️ **Roadmap**.

## 7. Implementation versus target

| Claim | Repository evidence | Honest status |
|---|---|---|
| Seven Foundry agent definitions with risk metadata | `foundry/agents/*/agent.yaml` and `governance/ai-act/registry/` | 🔵 In repo |
| Shared web and voice APIM route | `ChatWidget.tsx`, `foundry-tool.ts`, topic-router policy | 🟢 Live on exercised paths |
| JWT audience and `access_as_user` scope | External ID JWT fragment | 🔵 In repo, not deployed |
| Authenticated topic-router and document-extractor endpoints | APIM policy XML | 🔵 In repo, not deployed |
| Real document OCR and extraction | No working path | 🗺️ Roadmap |
| Synthetic provenance fields | Document extractor policy | 🔵 In repo, downstream propagation incomplete |
| Voice transcript content in telemetry | Removed in corrected source | Must not be claimed |
| Metadata-only voice telemetry with correlation | Voice logging source | 🔵 In repo, not deployed |
| Eligibility Confidential Compute runtime | Bicep skeleton, no proven confidential workload path | 🗺️ Roadmap |
| Confidential Ledger decision anchoring | Resource template, no writer pipeline | 🗺️ Roadmap |
| Functional AI Act lineage registry | Authenticated fail-closed API, no backend | 🗺️ Roadmap |
| Citizen-bound DSR identity | APIM and workflow source | 🔵 In repo, not deployed |
| Delegated DPO DSR | No actor contract | 🗺️ Roadmap |

## 8. Accurate evaluator summary

Use this wording:

> The demonstrator has a real shared APIM-to-Foundry path for web and voice, managed-identity authentication to Foundry, seven agent contracts, and W3C correlation. The pending security remediation hardens endpoint authentication, identity binding, prompt separation, and telemetry minimisation, but it is not deployed. Document fields are currently synthetic filename inferences, not extracted evidence. Confidential Ledger anchoring and the lineage backend are roadmap capabilities.
