<div align="center">

# 🔒 UDCSP — Security Audit

### What was scanned · what was found · the evidence behind every verdict

*A point-in-time, read-only security assessment of the whole repository — the single document a security lead, an auditor, or an engineer can open to see exactly which surfaces were reviewed, the one finding that matters, and the high-risk sinks that were verified safe, without re-running the scan.*

[![Scope](https://img.shields.io/badge/🔍_Scope-Full--repo-1565C0?style=for-the-badge)](#)
[![Findings](https://img.shields.io/badge/🟠_Findings-1_MEDIUM-E65100?style=for-the-badge)](#)
[![Critical · High](https://img.shields.io/badge/🟣🔴_Critical_·_High-0-2E7D32?style=for-the-badge)](#)
[![Code changed](https://img.shields.io/badge/✋_Code_changed-None-455A64?style=for-the-badge)](#)

[![Commit](https://img.shields.io/badge/📍_Commit-661ec81-37474F?style=flat-square)](#)
[![Branch](https://img.shields.io/badge/🌿_Branch-main-00796B?style=flat-square)](#)
[![Parallel scans](https://img.shields.io/badge/🧪_Parallel_scans-4-5E35B1?style=flat-square)](#)
[![Date](https://img.shields.io/badge/🗓️_Date-27_Jun_2026-AD1457?style=flat-square)](#)

</div>

---

> [!IMPORTANT]
> **TL;DR.** A full-repository, read-only security review, run as four parallel scans — application code, Bicep infrastructure-as-code, scripts, and secrets/configuration. The platform is consistently hardened: private endpoints, `publicNetworkAccess: 'Disabled'`, TLS 1.2, soft-delete / purge protection, Key Vault references for every secret, managed identities, HTML escaping on the web tier, and `encodeURIComponent` / `URLSearchParams` on every API call. **One MEDIUM finding** stands out — the Logic Apps Standard host storage account is reachable from any network and materialises its shared key into an app setting. Zero CRITICAL, zero HIGH, zero hardcoded secrets, zero weak crypto, zero open network rules. Five below-threshold observations are recorded for opportunistic hardening. No code was modified.

> ℹ️ **Point-in-time.** This audit reflects commit `661ec81` on `main`. Re-run it after any material infrastructure or application change. For the compliance controls it complements see [`datacompliance.md`](./datacompliance.md); for the audit/trace model see [`traceability.md`](./traceability.md).

**Severity legend** — 🟣 CRITICAL · 🔴 HIGH · 🟠 MEDIUM · 🔵 LOW

---

## 📑 Table of contents

1. [How this audit was run](#1-how-this-audit-was-run)
2. [Result at a glance](#2-result-at-a-glance)
3. [Formal findings](#3-formal-findings)
4. [Below-threshold observations](#4-below-threshold-observations)
5. [Verified safe — what was checked](#5-verified-safe--what-was-checked)
6. [Recommendations](#6-recommendations)

---

## 1. How this audit was run

The scan was conducted as four parallel reviews, each targeting one class of surface. The signalling bar was deliberately high — only issues with **> 80 % confidence** of being real and exploitable are raised as formal findings; everything below that bar is listed separately in §4 for transparency.

| Review | Surface | Files analysed |
|---|---|---|
| 🟦 A — Application code | `apps/**`, `services/**` (TS / TSX / JS / MJS) | 98 |
| 🟧 B — Infrastructure-as-Code | every `.bicep` / `.bicepparam` | 55 |
| 🟪 C — Scripts & automation | `.ps1` / `.psm1` / `.psd1` / `.py` | 89 |
| 🟨 D — Secrets & configuration | `.json` / `.yaml` / `.yml` / `.jsonl` / `.xml` / `.env` / CI | whole repo |

Categories examined across all four: injection (SQL / NoSQL / command / template), XSS, authentication & authorisation, SSRF, path traversal, hardcoded secrets, insecure deserialization, CSRF & cookie/session config, sensitive-data exposure, weak crypto / disabled TLS validation, insecure cloud configuration, and CI/CD supply-chain risks.

---

## 2. Result at a glance

| Severity | Count |
|---|---|
| 🟣 CRITICAL | 0 |
| 🔴 HIGH | 0 |
| 🟠 MEDIUM | 1 |
| 🔵 LOW | 0 |
| Below-threshold observations | 5 |

The repository is hardened in a consistent, code-enforced way (configuration, not "we'll remember to do it"). A single genuine deviation from the platform's own security standard warrants a formal finding.

---

## 3. Formal findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|---|---|---|---|---|
| 1 | 🟠 MEDIUM | `services/logic-apps/workspace.bicep` | 17-27, 53 | Logic Apps host storage account exposed to the public network (no `publicNetworkAccess: 'Disabled'`, no `networkAcls`, no private endpoint); shared key materialised into `AzureWebJobsStorage` | 7/10 |

### Finding #1 — Logic Apps host storage exposed to the public network

🟠 **MEDIUM** · Confidence 7/10 · Category: Security misconfiguration

The storage account that hosts the Logic App Standard omits `publicNetworkAccess: 'Disabled'`, defines no `networkAcls` block (so `defaultAction` defaults to `Allow`), and has no private endpoint. It is therefore reachable from any network. This is the runtime store for the orchestration workflows (citizen-application intake, cross-border coordination, and domain events such as `CitizenApplicationSubmitted` / `EligibilityAssessed`), so its blob/file content and run history can contain confidential citizen payloads.

The account's shared key is also materialised into the `AzureWebJobsStorage` app setting via `storage.listKeys()` (line 53), and shared-key authentication is left enabled. A leaked key is therefore usable from anywhere on the internet rather than being confined to the VNet.

**Evidence.** Lines 23-26 set only `allowBlobPublicAccess: false` and `minimumTlsVersion: 'TLS1_2'`; `publicNetworkAccess`, `networkAcls` and `allowSharedKeyAccess` are all unset (Azure defaults: public access *Enabled*, `defaultAction` *Allow*, shared-key *Allowed*). This contradicts the platform's own standard — `infra/landing-zone/modules/storage.bicep:19-22` sets `publicNetworkAccess: 'Disabled'` + `supportsHttpsTrafficOnly: true` and attaches a private endpoint (lines 33-47).

**Remediation.**
- Set `publicNetworkAccess: 'Disabled'` and an explicit `networkAcls.defaultAction: 'Deny'`.
- Add a private endpoint for the `blob` / `file` sub-resources in the data subnet.
- Prefer an identity-based host connection (`AzureWebJobsStorage__accountName` + `AzureWebJobsStorage__credential=managedidentity`) with `allowSharedKeyAccess: false`, using the Logic App's system-assigned identity instead of the embedded account key.

---

## 4. Below-threshold observations

These do not meet the confidence bar for a formal finding, but are recorded for transparency and opportunistic hardening.

| # | Severity if exploitable | File | Lines | Observation | Exploitability |
|---|---|---|---|---|---|
| O1 | 🔴 HIGH | `tests/conformance/.github/workflows/conformance-on-release.yml` | 9 | `${{ github.ref_name }}` interpolated into a `run:` shell command (classic Actions script-injection shape) | ~3/10 |
| O2 | 🟠 MEDIUM | `services/apim/global-policy.xml` | 33-44 | `<on-error>` reflects the request `Origin` with `Access-Control-Allow-Credentials: true` | ~4/10 |
| O3 | 🔵 LOW | `services/functions/func-correlation-enricher/index.js` | 5-6 | Inbound `traceparent` header reflected into a response header | theoretical |
| O4 | 🔵 LOW | `apps/voice` (`index.ts:33-49`, `call-handler.ts:50-62`) | — | ACS Event Grid / callback webhooks with no signature validation | low |
| O5 | 🔵 LOW | `apps/voice` (`index.ts`) | 65-73 | Media WebSocket falls back to the most-recent "orphan" session when no `callConnectionId` is supplied | low |

Notes:
- **O1** — Triggers are `release: published` and `workflow_dispatch`, both requiring write/maintainer access; not controllable by an untrusted party. Best practice is still to pass the value via an `env:` variable rather than inline interpolation.
- **O2** — APIM authenticates via Bearer JWT (`Authorization` header) and sets no session cookie, so a cross-origin `fetch(..., {credentials:'include'})` carries no victim credentials. Tighten to echo the `Origin` only when it matches the inbound allowlist.
- **O3** — Node's HTTP layer rejects CRLF in header values, so response-splitting is not exploitable in practice.
- **O4** — Standard ACS pattern; `incomingCallContext` is an unforgeable ACS token, so impact is limited.
- **O5** — Requires network access plus precise 30 s timing; an availability concern, not a clear data-breach path.

---

## 5. Verified safe — what was checked

To show coverage, here are the high-risk surfaces that were inspected and confirmed safe.

### 🟦 Application code (review A)

| Area | Where | Why it's safe |
|---|---|---|
| XSS (`dangerouslySetInnerHTML`) | `apps/web/src/utils/miniMarkdown.tsx` | HTML-escaped first (`&<>"`); only whitelisted tags emitted; link `href` constrained to `http(s)`/relative regex — no `javascript:` or attribute breakout. |
| Blob-preview iframe | `ApplyChildBenefitPage.tsx`, `ApplyResidencyPage.tsx` | Gated to `file.type === 'application/pdf'` on the user's own local file (self-XSS at most). |
| Open redirect | `apps/web/src/auth/AuthGate.tsx`, `LoginPage.tsx` | `returnTo` is only displayed (React-escaped), never used as a redirect target; MSAL `redirectUri` pinned to `window.location.origin`. |
| SSRF | `apps/voice/.../foundry-tool.ts`, `realtime-bridge.ts`, `func-document-virus-scan` | Outbound hosts come from trusted config/env or trusted Azure Event Grid events. |
| Path traversal | `apps/voice/.../ivr-loader.ts`, `apps/web/src/utils/language.ts`, `apps/mobile/src/i18n/index.ts` | Segments restricted to validated locale/language enums. |
| Injection in API URLs | `apps/web/src/api/*.ts` | All path params use `encodeURIComponent`; queries use `URLSearchParams`. |
| Secrets / identity | `apps/voice/.../config.ts`, `call-handler.ts`, `msalConfig.ts` | Secrets from env/Key Vault; server identity via `DefaultAzureCredential`, never logged. |
| Deserialization / crypto | `ivr-loader.ts`, `traceparent.ts` | `js-yaml@4 yaml.load` is the safe loader on trusted repo YAML; web uses `crypto.getRandomValues`. |

### 🟧 Infrastructure (review B)

- Hardened standard throughout: private endpoints, `publicNetworkAccess: 'Disabled'`, TLS 1.2, soft-delete / purge protection, Key Vault RBAC, managed identities.
- `.bicepparam` values are `{{token}}` placeholders; passwords are `@secure()` with no literal default.
- Not flagged, by design: APIM `publicNetworkAccess: 'Enabled'` (public gateway behind Front Door + WAF); confidential-ledger `ledgerType: 'Public'` (public verifiability, access gated by AAD, not anonymous).

### 🟪 Scripts (review C)

- No hardcoded secrets — `<placeholder>` config values plus Key Vault secret URIs; tokens from `$env:*` or `az account get-access-token`.
- No `Invoke-Expression`; no `os.system` / `subprocess(shell=True)` / `eval` / `exec`.
- All downloads over HTTPS; no `iwr | iex`, no `-SkipCertificateCheck`, no `verify=False`.
- No unsafe deserialization (`pickle`, `yaml.load`, `Import-Clixml`); no weak crypto. The sole crypto use is `RandomNumberGenerator.Create().GetBytes()` (a CSPRNG).

### 🟨 Secrets & configuration (review D)

- Every credential-like value resolves to a Key Vault reference, a `{{token}}` deploy-time placeholder, a `clientSecretSettingName` (EasyAuth), or a runtime expression. No literal passwords, API keys, PATs, AWS/Azure keys, SAS tokens, connection strings, or private keys.
- The ~1546 `scripts/install/reports/**.json` files are untracked local artefacts (gitignored).
- `udcsp.config.template.psd1` contains only `<placeholders>`; the real `udcsp.config.psd1` is gitignored.
- CI: no secret echoing, no `pull_request_target` + untrusted checkout, secrets passed only via `env:`.
- Static Web App hardened (strict CSP, HSTS, `frame-ancestors 'none'`).
- `data/synthetic/**` and `foundry/datasets/**` are synthetic/eval data (including intentional red-team prompt-injection sets).

---

## 6. Recommendations

**Priority 1 — close the finding.** Harden the Logic Apps host storage account (`services/logic-apps/workspace.bicep`): `publicNetworkAccess: 'Disabled'`, `networkAcls.defaultAction: 'Deny'`, a private endpoint for blob/file, and a switch to managed-identity host connection (`allowSharedKeyAccess: false`).

**Priority 2 — opportunistic hardening (observations).**
- **O1** — pass `${{ github.ref_name }}` through an `env:` variable in the conformance workflow.
- **O2** — restrict the APIM `<on-error>` `Origin` reflection to the inbound allowlist.
- **O4 / O5** — add ACS webhook signature validation and require `callConnectionId` on the media WebSocket.

---

<div align="center">

*Read-only audit — no source code was modified. Scope: commit `661ec81`, branch `main`.*

[`← Back to docs/biz`](./README.md)

</div>
