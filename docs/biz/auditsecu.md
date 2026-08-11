<div align="center">

# 🔒 UDCSP - Security Audit

_Last verified: 2026-08-11 · commit f940d39 · security remediation committed, not deployed_

### What was reviewed · what was found · what is fixed in source · what remains exposed live

*A point-in-time application security assessment of the repository, including API Management policy XML as executable authorization code.*

[![Scope](https://img.shields.io/badge/🔍_Scope-Full_repo_+_APIM_policy_code-1565C0?style=for-the-badge)](#)
[![Findings](https://img.shields.io/badge/🧾_Findings-15_formal_+_9_low/info-E65100?style=for-the-badge)](#)
[![Critical · High](https://img.shields.io/badge/🟣🔴_Critical_·_High-1_·_8-C62828?style=for-the-badge)](#)
[![Remediation](https://img.shields.io/badge/🔵_Remediation-In_repo_·_not_deployed-455A64?style=for-the-badge)](#)

[![Commit](https://img.shields.io/badge/📍_Reviewed_commit-fde8352-37474F?style=flat-square)](#)
[![Previous](https://img.shields.io/badge/↩️_Previous_audit-67b0ec6-00796B?style=flat-square)](#)
[![Method](https://img.shields.io/badge/🧪_Method-OWASP_+_manual_retest-5E35B1?style=flat-square)](#)
[![Date](https://img.shields.io/badge/🗓️_Remediation_review-11_Aug_2026-AD1457?style=flat-square)](#)

</div>

---

> [!CAUTION]
> **Live risk remains.** The remediation described here changes repository source only. Nothing has been deployed, no APIM policy has been pushed, no workflow or SPA has been redeployed, no voice image has been rebuilt, and no Azure role assignment has been removed. Every live exposure remains open until the corresponding deployment action is completed.

> [!IMPORTANT]
> **TL;DR.** The new review found **1 CRITICAL, 8 HIGH, 6 MEDIUM, and 9 LOW/INFO** findings. The previous audit found **0 CRITICAL, 0 HIGH, and 1 MEDIUM**. This is primarily a **scope correction, not a security regression**. The previous audit's own section 1 listed four reviews: application code in TS/TSX/JS/MJS, Bicep, scripts, and secrets/configuration. None treated `services/apim/apis/**/*.xml` as executable application and authorization code. That policy layer decides who may read, modify, export, and delete citizen data. It contained the critical finding and five of the eight high findings. The previous conclusions were correct within their stated scope, and that scope had a consequential hole.
>
> The previous audit's sole MEDIUM, public Logic Apps host storage with a shared key in an app setting, remained unremediated until this remediation. It is now corrected in source. The previous observation O5 is also re-rated from LOW to HIGH because an unauthenticated media WebSocket could replace the bridge for a live citizen call, receive assistant output, inject caller audio, and terminate the call. That is a confidentiality and integrity compromise, not merely availability.

**Severity legend:** 🟣 CRITICAL · 🔴 HIGH · 🟠 MEDIUM · 🔵 LOW/INFO

**Status vocabulary:** 🟢 **Live** · 🟡 **Partially deployed** · 🔵 **In repo** · ⚙️ **Scripted** · 🗺️ **Roadmap**

---

## 📑 Table of contents

1. [How this review was run](#1-how-this-review-was-run)
2. [Result at a glance](#2-result-at-a-glance)
3. [Formal findings, UD-01 through UD-15](#3-formal-findings-ud-01-through-ud-15)
4. [Low and informational findings, L1 through L9](#4-low-and-informational-findings-l1-through-l9)
5. [Why the result changed from the previous audit](#5-why-the-result-changed-from-the-previous-audit)
6. [Verified safe, re-tested claims that still hold](#6-verified-safe-re-tested-claims-that-still-hold)
7. [Deployment actions still required](#7-deployment-actions-still-required)

---

## 1. How this review was run

The new review covered the React SPA, Expo shell, voice orchestrator, Logic Apps, Bicep, PowerShell installer, Foundry prompts, dependency graphs, Git history, and, critically, **API Management policy XML**. It combined OWASP-focused reviews with manual source tracing:

- OWASP Top 10 for web applications
- OWASP API Security Top 10
- OWASP Top 10 for LLM applications
- infrastructure-as-code review
- software composition analysis
- secret scanning across the working tree and Git history
- manual end-to-end tracing of authorization, identity, storage, deletion, DSR, voice, and AI evidence paths

The review was static and source-based. It did not send exploit requests, interrogate live Azure resources, deploy anything, or change cloud configuration.

### The scope distinction that changes the result

The previous audit listed these four scans:

| Previous review | Surface as described at commit `67b0ec6` |
|---|---|
| Application code | `apps/**`, `services/**` in TS, TSX, JS, and MJS |
| Infrastructure as code | Bicep and Bicep parameter files |
| Scripts and automation | PowerShell and Python |
| Secrets and configuration | JSON, YAML, XML, environment files, and CI configuration |

XML was present in the fourth bucket, but APIM policies were treated as configuration rather than as code that enforces authorization. That distinction matters. Files under `services/apim/apis/**/*.xml` parse claims, build ownership filters, choose backends, mint managed-identity tokens, and decide which citizen record can be read or deleted.

The new review treated those policies as executable security boundaries. That is where the critical finding and five of the eight high findings were found. The platform did not suddenly move from zero high findings to eight. The review moved into the layer where the platform's authorization decisions already lived.

---

## 2. Result at a glance

| Severity | Count | Source status on 11 August 2026 | Live status |
|---|---:|---|---|
| 🟣 CRITICAL | **1** | 🔵 Corrected in repo | Exposed until APIM policy deployment and role cleanup |
| 🔴 HIGH | **8** | 🔵 Corrected or mitigated in repo | Exposed until the affected APIM, Logic Apps, voice, installer, and SPA changes are deployed |
| 🟠 MEDIUM | **6** | Five corrected in repo, UD-12 partially corrected | Exposed until deployment; real document extraction and the lineage backend remain absent |
| 🔵 LOW/INFO | **9** | Six corrected, three partial/open | Mixed, none of the pending changes are live |

### Remediation summary

- **Corrected in source:** UD-01, UD-02, UD-04, UD-05, UD-06, UD-07 for citizen self-service, UD-09, UD-10, UD-11, UD-13, UD-14.
- **Mitigated in source:** UD-03 uses validated claims, escaping, and delimited ownership matching. Repointing to the canonical Dataverse table remains the durable target.
- **Installer corrected, live grant still present:** UD-08.
- **Partially corrected:** UD-12 labels the APIM response as synthetic, but downstream workflow and UI paths can still strip the markers and display the fields as though they were extracted.
- **Authenticated and fail-closed, but not operational:** UD-15 now requires JWT validation and returns `503` because no lineage backend exists.
- **Nothing deployed:** all source fixes are 🔵 **In repo**, not 🟢 **Live**.

---

## 3. Formal findings, UD-01 through UD-15

| ID | Severity | Finding | Repository remediation | Live reality |
|---|---|---|---|---|
| **UD-01** | 🟣 CRITICAL | Storage managed-identity token exfiltration through a citizen-supplied blob URL | 🔵 The delete policy validates a blob name and rebuilds the storage URL from server-controlled values. Legacy absolute URLs require the expected prefix and a validated tail. | The deployed policy remains exploitable until all APIM instances receive the corrected operation policy. |
| **UD-02** | 🔴 HIGH | External ID JWT validation accepted any token from the tenant because no audience or scope was required | 🔵 The JWT fragment now pins the audience and requires `access_as_user`. | The deployed gateways keep accepting the previous token shape until policy deployment. |
| **UD-03** | 🔴 HIGH | Ownership used a substring match and an OData filter built by concatenation | 🔵 Mitigated with claim-shape validation, quote escaping, and a delimited ownership token that prevents prefix collisions. | The old substring and concatenation behavior remains live. Repointing to `udcsp_application` with an exact field comparison remains the durable design. |
| **UD-04** | 🔴 HIGH | An unauthenticated media WebSocket could hijack a live citizen call | 🔵 A cryptographic, expiring, single-use nonce is issued per call and required for media attachment. The orphan-session fallback is removed. | The running voice image still exposes the old unauthenticated path until rebuilt and redeployed. |
| **UD-05** | 🔴 HIGH | Two public AI endpoints lacked authentication and directly mixed caller text into system instructions | 🔵 Both endpoints include JWT validation. User content is placed in a separate user message and framed as untrusted data. | The public endpoints retain the old behavior until APIM deployment. |
| **UD-06** | 🔴 HIGH | Application intake persisted citizen identity supplied by the request body | 🔵 APIM derives identity from the validated token, deletes any inbound trusted-header copy, and forwards `x-udcsp-citizen-upn`. The workflow consumes that header. | The deployed policy and workflow still trust the old request shape until both are redeployed. |
| **UD-07** | 🔴 HIGH | GDPR export and erasure were not bound to the authenticated data subject | 🔵 Citizen self-service now derives the subject from the token and returns `403` for a mismatching body subject. Caller-supplied trusted headers are removed. | The live flow remains unbound until APIM and workflows are redeployed. Delegated DPO requests are explicitly out of scope and require a separate authenticated actor contract. |
| **UD-08** | 🔴 HIGH | APIM held `Storage Blob Data Contributor` at account scope | 🔵 The installer now assigns the role at the `citizen-uploads` container scope. | The existing account-wide Azure role assignment survives source changes. It must be explicitly deleted and replaced. |
| **UD-09** | 🔴 HIGH | Internet-facing voice runtime had 37 production dependency advisories | 🔵 Production dependencies were upgraded. `npm audit --omit=dev` now reports zero advisories in the voice and web applications. | The running container still uses its previous image until rebuilt and redeployed. |
| **UD-10** | 🟠 MEDIUM | Upload accepted unbounded, caller-described content with no server-side type validation | 🔵 APIM enforces an 8 MiB ceiling, base64 validity, extension and MIME allow-lists, and magic-byte checks. | The live upload policy remains permissive until deployed. |
| **UD-11** | 🟠 MEDIUM | Voice transcripts and tool argument values were written to telemetry | 🔵 Telemetry records transcript lengths and tool argument keys only. W3C `traceparent` correlation remains intact. | Existing live voice instances continue to emit content until a new image is deployed. |
| **UD-12** | 🟠 MEDIUM | The document extractor was instructed to invent evidence from the filename | 🔵 Partial. The response now declares `"synthetic": true` and `"provenance": "inferred-from-filename"`. The model still receives only a short base64 prefix and does not read the document. | No genuine extraction exists. Downstream paths can still omit the markers, so a caseworker can be shown synthetic values as extracted evidence. Real extraction requires Azure AI Document Intelligence plus end-to-end provenance preservation. |
| **UD-13** | 🟠 MEDIUM | Case PII persisted in browser `localStorage` and was not cleared at sign-out | 🔵 Persisted cache content is allow-listed and excludes sensitive case details, cache access is citizen-bound, and cache is cleared on sign-out or account change. | Existing browsers retain the previous cached content until the corrected SPA is deployed and users return to it. |
| **UD-14** | 🟠 MEDIUM | Logic Apps host storage was public and its shared key was materialized in an app setting | 🔵 Source now disables public access and shared keys, uses deny ACLs, adds private endpoints, and configures managed-identity host storage. | The current Logic Apps host remains exposed until infrastructure redeployment. This was the previous audit's sole MEDIUM and remained unremediated until this source change. |
| **UD-15** | 🟠 MEDIUM | The AI Act lineage API imported without a policy and therefore without authentication | 🔵 The API now requires the JWT fragment and fails closed with `503`. The installer fails when an API lacks a policy. | The corrected policy is not deployed, and there is still no lineage backend. The registry must not be described as operational. |

### UD-12 and meaningful human oversight

EU AI Act Article 14 requires effective human oversight. A human cannot meaningfully review evidence if the platform presents model-invented values as facts read from a document. The new provenance fields are necessary but not sufficient. They must survive every workflow, store, API response, and caseworker screen. Until real extraction is wired, the only accurate description is **synthetic values inferred from the filename**, not extracted document evidence.

---

## 4. Low and informational findings, L1 through L9

| ID | Severity | Finding | Repository remediation | Remaining gap |
|---|---|---|---|---|
| **L1** | 🔵 LOW | Operation policies reflected arbitrary request origins with credentials | 🔵 Origin is emitted only when it matches the configured allow-list. | Pending APIM deployment. |
| **L2** | 🔵 LOW | Dead SAS-signing policy used a storage account key placeholder | 🔵 The undeployed dead policy was deleted. | No live deployment action, but the deletion is not committed or pushed in this task. |
| **L3** | 🔵 LOW | k6 setup action used a mutable tag in a workflow that receives a test token | 🔵 The action is pinned to verified commit `db07bd9765aac508ef18982e52ab937fe633a065`. | The workflow change becomes effective only after merge and push. |
| **L4** | 🔵 LOW | ACS webhook sender validation was incomplete | 🔵 Partial. Signed ACS callback JWTs are validated and Event Grid subscription validation is handled. | IncomingCall Event Grid delivery still lacks cryptographic sender authentication. |
| **L5** | 🔵 LOW | APIM, Key Vault, and lake data-plane diagnostics were absent | 🔵 Partial. Key Vault and blob diagnostics were added in source. | APIM diagnostics remain absent, and no diagnostic setting is live until deployment. |
| **L6** | 🔵 INFO | Raw upstream errors and internal identity details could reach callers or logs | 🔵 Partial hardening removed several direct disclosures. | Some raw agent and extractor error fields plus caller identity/status metadata remain. |
| **L7** | 🔵 LOW | Region policy allowed locations outside each country's intended boundary | 🔵 Country-specific allowed-region policy is now declared. | Pending policy deployment or assignment. |
| **L8** | 🔵 LOW | Policy remediation used broad subscription Contributor | 🔵 The installer declares narrower remediation roles and target scopes. | Existing Azure assignments require operational verification and cleanup. |
| **L9** | 🔵 LOW | Installer command logging could persist secret arguments | 🔵 Sensitive argument values are centrally redacted before logging. | Effective only when the corrected installer is used. |

---

## 5. Why the result changed from the previous audit

### The previous audit was right within its scope

At commit `67b0ec6`, the previous audit correctly reported:

- no hardcoded credentials
- no weak cryptography or disabled TLS validation
- strong Bicep defaults across the primary landing-zone modules
- correctly escaped web rendering and safely constructed client API URLs
- one formal MEDIUM in Logic Apps host storage

Those conclusions were not invalidated. They were bounded by what was examined as application behavior.

### The scope had a hole

The previous application-code scan enumerated TS, TSX, JS, and MJS. Its Bicep and script scans were similarly explicit. XML appeared only in the secrets/configuration scan. That did not exercise APIM policies as authorization logic.

This platform implements critical security decisions in APIM policy XML:

- claim selection and trusted identity forwarding
- ownership tests and OData filters
- managed-identity token acquisition
- request destinations for Storage, Dataverse, Logic Apps, and Foundry
- upload validation
- GDPR subject binding
- whether an API is authenticated at all

The new review followed those decisions as code. The change from **0 HIGH to 8 HIGH** is therefore mostly newly observed existing risk, not newly introduced risk.

### The previous MEDIUM remained open

The previous audit's only formal finding was Logic Apps host storage reachable over the public network with shared-key authentication and the key materialized into `AzureWebJobsStorage`. At reviewed commit `fde8352`, it was still unchanged. This remediation finally corrects it in source through private endpoints, deny-by-default network ACLs, disabled shared keys, and managed-identity host storage.

It is still live until the Logic Apps infrastructure is redeployed.

### O5 was under-rated

The previous audit described O5 as LOW and as *"an availability concern, not a clear data-breach path."* The new review traced what the attached socket can do:

1. connect to the public media endpoint without authentication
2. bind to the most recently answered call
3. replace the live bridge
4. receive assistant audio and tool results
5. inject audio as though it came from the citizen
6. invoke the hang-up and recap path

That is an unauthenticated live-call hijack affecting confidentiality and integrity. Re-rating it as **UD-04 HIGH** is justified.

---

## 6. Verified safe, re-tested claims that still hold

The new review re-tested the previous audit's section 5 claims. **Every one held within its stated surface.** The critical APIM SSRF finding does not negate the narrower prior result for the TypeScript outbound-call sites that were actually checked.

### 🟦 Application code

| Area | Re-tested result |
|---|---|
| XSS in `miniMarkdown.tsx` | Input is escaped before the limited tag transform, and links are constrained to HTTP(S) or relative URLs. |
| Blob-preview iframe | Preview remains gated to the citizen's local PDF file. |
| Open redirect | `returnTo` is displayed, not used as an arbitrary redirect target; MSAL redirects remain pinned to the current origin. |
| SSRF in the reviewed TypeScript outbound clients | Hosts in the voice Foundry tool, realtime bridge, and virus-scan path still come from trusted configuration or trusted Azure events. |
| Path traversal | Locale and language path segments remain constrained to validated enums. |
| Client API URL injection | Path parameters use `encodeURIComponent`; query parameters use `URLSearchParams`. |
| Secrets and identity | Runtime secrets still come from environment variables or Key Vault, and managed identity remains the server authentication pattern. |
| Deserialization and cryptography | YAML is loaded through the safe `js-yaml` v4 path on trusted repository data; random values use `crypto.getRandomValues` or a platform CSPRNG. |

### 🟧 Infrastructure

- The primary landing-zone Storage and Key Vault modules retain private endpoints, disabled public access, TLS 1.2 floors, RBAC, soft delete, and purge protection.
- Parameter files still use deployment placeholders, and passwords remain secure parameters without literal defaults.
- APIM public gateway access and public-verifiability ledger configuration remain deliberate architecture choices, not anonymous data access.
- UD-14 was the documented exception to the storage baseline and is now corrected in source.

### 🟪 Scripts

- No hardcoded secrets were found.
- No `Invoke-Expression`, `eval`, `exec`, unsafe shell execution, disabled certificate validation, or unsafe deserialization was found.
- Downloads remain HTTPS-only.
- Cryptographic random generation uses a CSPRNG.

### 🟨 Secrets and configuration

- No literal passwords, API keys, PATs, cloud access keys, SAS tokens, connection strings, or private keys were found in the working tree or reviewed history.
- Deployment values remain Key Vault references, runtime expressions, or explicit placeholders.
- Local installer reports and the real installer configuration remain gitignored.
- CI workflows still avoid secret echoing and avoid `pull_request_target` with an untrusted checkout; secrets are passed through environment variables. L3 was a separate action-pinning issue and is corrected in source.
- The Static Web App configuration retains its strict Content Security Policy, HSTS, and `frame-ancestors 'none'` control.
- Synthetic and red-team datasets remain clearly scoped test data.

---

## 7. Deployment actions still required

| Finding group | Source status | Action required to close the live exposure |
|---|---|---|
| UD-01, UD-02, UD-03, UD-05, UD-10, UD-12, UD-15, L1 | 🔵 In repo | Push the corrected API and operation policies to each APIM instance after validating named values. |
| UD-04, UD-09, UD-11, L4 | 🔵 In repo | Build a new voice image, deploy a new Container App revision, and perform a controlled dial test. |
| UD-06, UD-07 | 🔵 In repo | Deploy both the APIM policies and the matching Logic Apps workflows. |
| UD-08 | 🔵 In repo | Delete the existing account-scoped role assignment, then create and verify the container-scoped assignment. |
| UD-13 | 🔵 In repo | Build and deploy the SPA. Existing browser caches clear when users return to the corrected application. |
| UD-14 | 🔵 In repo | Redeploy the Logic Apps host storage, private endpoints, identity settings, and role assignment. |
| L3 | 🔵 In repo | Merge and push the pinned workflow. |
| L5, L7, L8, L9 | 🔵 In repo | Deploy or apply the corrected diagnostics, policy assignments, remediation roles, and installer behavior. |

> **Do not report any row above as 🟢 Live until the deployment has occurred and the deployed behavior has been verified.** A clean build or well-formed XML proves repository consistency. It does not prove that a live authorization decision has changed.

---

<div align="center">

*Source review and remediation verification only. No deployment was performed.*

[`← Back to docs/biz`](./README.md)

</div>
