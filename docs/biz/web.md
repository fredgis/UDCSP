<div align="center">

# 🌐 UDCSP — The Web Portal

</div>

_Last verified: 2026-08-11 · commit f940d39 · security remediation committed, not deployed_

> ℹ️ **Live vs roadmap.** 🟢 **Live** on `https://udcsp.fredgis.com`: Static Web App, per-country External ID sign-in, the 12-language wizard, Foundry-driven eligibility pre-submit, APIM document upload, Dataverse `tasks` write, My Cases re-hydration and case detail parsing. 🗺️ **Roadmap**: Front Door + WAF in front of the public site, Microsoft Entra Verified ID issuance, per-country D365 Customer Service, cross-border fan-out and Confidential Ledger anchoring. See [`../tech/inprogress.md`](../tech/inprogress.md).

> [!NOTE]
> **Channel surface only.** This document covers the React+Vite portal — pages, accessibility, routing, citizen-facing UX. The agent routing topology (which Foundry agent handles which intent, how the topic-router fans out, what happens when content safety blocks a turn) lives in [`ai.md`](./ai.md). When in doubt, this doc owns *how the citizen sees the platform on the web*; `ai.md` owns *how the platform thinks*.

<div align="center">

### The single digital front door for 2.1 million Nordic citizens

*How Anna opens a laptop browser, logs in with her national eID, submits a cross-border residency application in her own language, and gets a response in four days — with full GDPR + WCAG 2.1 AA compliance and three countries' sovereignty intact.*

[![Channel](https://img.shields.io/badge/🌐_Channel-Web_·_SWA-1565C0?style=for-the-badge)](#)
[![Stack](https://img.shields.io/badge/⚛️_Stack-React_·_TS_·_Vite_·_Front_Door-FF6F00?style=for-the-badge)](#)
[![Languages](https://img.shields.io/badge/🗣️_Languages-12_ICU_MessageFormat-AD1457?style=for-the-badge)](#)
[![Accessibility](https://img.shields.io/badge/♿_Accessibility-WCAG_2.1_AA-2E7D32?style=for-the-badge)](#)

[![Sovereignty](https://img.shields.io/badge/🛡️_Sovereignty-DK_·_SE_·_NO-00796B?style=flat-square)](#)
[![Identity](https://img.shields.io/badge/🔑_Identity-External_ID_·_Verified_ID-5E35B1?style=flat-square)](#)
[![Compliance](https://img.shields.io/badge/⚖️_Compliance-GDPR_·_WCAG-C62828?style=flat-square)](#)
[![Status](https://img.shields.io/badge/🧱_Scaffold-65_files_under_apps/web-E65100?style=flat-square)](#)

</div>

---

> [!IMPORTANT]
> **TL;DR.** A citizen opens `https://udcsp.fredgis.com` on the 🟢 **Live** Azure Static Web App. **MSAL.js** authenticates them against the per-country Microsoft Entra External ID tenant, the React shell loads the ICU locale catalogue for their language, and form data flows through **APIM** with JWT validation. **Microsoft Foundry agents** classify, extract and pre-assess eligibility. The `application-intake` Logic App writes the submission to the Dataverse `tasks` activity entity on the shared environment today. Per-country D365 Customer Service and Verified ID issuance are 🗺️ **Roadmap** target architecture.
>
> | Field | Value |
> |---|---|
> | 🗄️ **Where stored** | 🟢 **Live** submissions in Dataverse `tasks`; 🟢 **Live** uploads in `udcsp<c>prodlake` `citizen-uploads/` via APIM managed identity; 🟢 **Live** traces in App Insights for exercised paths. 🔵 **In repo** or 🗺️ **Roadmap** depending on path: `bot_session`, Redis drafts, PostgreSQL JSONB drafts, AI Search memory and OneLake trace retention. |

| Capability | Status | Current fact |
|---|---|---|
| Public web channel | 🟢 **Live** | `https://udcsp.fredgis.com` is an Azure Static Web App, deployed directly with SWA CLI. |
| Front Door + WAF | 🗺️ **Roadmap** | Service inventory marks it manual or not deployed. Do not describe it as the live entry point. |
| External ID sign-in | 🟢 **Live** | DK, SE and NO CIAM tenants are exercised by the SPA. |
| Verified ID issuance | 🗺️ **Roadmap** | Demo 1 blockers list Verified ID issuance and SE portal auto-onboarding as not built. |
| Application intake | 🟡 **Partially deployed** | Logic App `application-intake` writes Dataverse `tasks` today. `udcsp_application` and D365 CS are the target landing shape. |
| Document upload transport | 🟢 **Live** | SPA calls APIM `POST /documents/upload-url`; APIM PUTs the blob with managed identity into private storage. |
| Upload byte validation | 🔵 **In repo** | Pending APIM deployment: 8 MiB decoded limit, PDF/PNG/JPEG allow-list, magic-byte matching and server-derived Blob content type. |
| Citizen API identity binding | 🔵 **In repo** | Pending APIM and Logic App deployment: caller identity is derived from the validated JWT, not accepted from the body or a caller-supplied header. |
| Browser case-cache minimisation | 🔵 **In repo** | Pending SPA deployment: rich document and eligibility fields stay in memory, legacy entries are scrubbed and the cache is cleared on sign-out or account change. |
| Redis / PostgreSQL conversational persistence | 🔵 **In repo** | Use as target architecture unless a live deployment record proves the path. |
| Traceability | 🟡 **Partially deployed** | W3C `traceparent` and App Insights exist for exercised paths. Confidential Ledger anchoring is not active and the Purview lineage endpoint remains `placeholder.local`. |

---

## 📑 Table of contents

1. [Why a web portal at all](#1-why-a-web-portal-at-all)
2. [The mental model in one picture](#2-the-mental-model-in-one-picture)
3. [The page-load lifecycle, step by step](#3-the-page-load-lifecycle-step-by-step)
4. [The seven building blocks](#4-the-seven-building-blocks)
5. [Multilingual — 12 languages × ICU MessageFormat](#5-multilingual--12-languages--icu-messageformat)
6. [Accessibility — WCAG 2.1 AA, screen-readers, keyboard-only](#6-accessibility--wcag-21-aa-screen-readers-keyboard-only)
7. [Sovereignty — one cookie domain per country, one External ID tenant per country](#7-sovereignty--one-cookie-domain-per-country-one-external-id-tenant-per-country)
8. [SLOs, risks, and mitigations](#8-slos-risks-and-mitigations)
9. [🌐 Embedding the AI assistant in the page](#9--embedding-the-ai-assistant-in-the-page)
10. [The activation runbook](#10-the-activation-runbook)
11. [How to test it (three levels)](#11-how-to-test-it-three-levels)
12. [The demo script for a jury](#12-the-demo-script-for-a-jury)
13. [Anti-patterns we avoid](#13-anti-patterns-we-avoid)
14. [Where the conversation is stored](#14-where-the-conversation-is-stored)

---

## 1. Why a web portal at all

The case study is unambiguous (`docs/biz/case-study-11.md` § Transformation Objective):

> *"Create a federated digital citizen services platform that enables cross-border service delivery, automates back-office processing, and provides inclusive, accessible experiences within national sovereignty frameworks."*

And from § Business Challenge:

> *"Three Nordic governments … operate **47 citizen-facing service portals**, each built on different legacy platforms."*

Three reasons the web portal is a **first-class** channel in UDCSP, not just a modernisation checkbox:

- 🏛️ **Digital-by-default mandate.** Nordic governments operate under a policy of digital-first service delivery. Citizens have a right to receive public services electronically. A unified portal directly answers the case study's requirement to consolidate **47 portals into 1** — the "single front door, many back doors" principle (architecture P4).
- ♿ **Accessibility law (WCAG 2.1 AA).** The case study explicitly calls out: *"full **WCAG 2.1 AA** accessibility compliance achieved."* The web portal is the accessibility flagship — it must serve citizens with motor disabilities, low vision (NVDA/JAWS), cognitive impairments, and users of assistive technology. The voice channel is the *inclusivity hatch*; the web portal is the *inclusion baseline*.
- 🏠 **Portal rationalisation 47 → 1.** The 47 legacy portals are built on different platforms, collect duplicate PII, and produce inconsistent citizen experiences. The UDCSP web portal is the single authenticated surface through which citizens interact with Denmark, Sweden, and Norway — without knowing or caring which agency sits behind each service. Back-office integrations are mediated through APIM; the citizen sees **one portal, one case inbox, one identity**.

The design principle, codified in `docs/tech/architecture.md` § 1 (P4):

> *"Single front door, many back doors."*

---

## 2. The mental model in one picture

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 30, 'rankSpacing': 35, 'padding': 6 }, 'themeVariables': { 'fontSize': '13px' } } }%%
flowchart TB
    subgraph CITIZEN["🧑 Citizen · laptop or desktop browser"]
        BROWSER["🌐 Browser<br/><i>any OS · any browser · assistive tech</i>"]
    end

    subgraph EDGE["🛡️ Edge — per country (DK · SE · NO)"]
        AFD["Azure Front Door + WAF<br/><i>🗺️ Roadmap · not live entry point</i>"]
        SWA["Azure Static Web App<br/><i>🟢 Live · React 18 + TS + Vite bundle</i>"]
    end

    subgraph AUTH["🔑 Identity — per country"]
        EXTID["Microsoft Entra External ID<br/><i>🟢 Live OIDC · Verified ID 🗺️ Roadmap</i>"]
    end

    subgraph GATEWAY["🚪 Integration layer"]
        APIM["API Management<br/><i>JWT · audit · rate-limit</i>"]
    end

    subgraph BRAIN["🧠 AI brain (shared with voice + mobile)"]
        FOUNDRY["Microsoft Foundry<br/><i>classifier · citizen-assistant<br/>translator · eligibility · doc-extractor</i>"]
    end

    subgraph BACKOFFICE["📋 Back-office"]
        D365["Dataverse tasks today<br/><i>D365 CS 🗺️ Roadmap</i>"]
        FABRIC["Microsoft Fabric<br/><i>analytics target · App Insights live traces</i>"]
    end

    subgraph CHAT["💬 Peer channel (cross-reference)"]
        CS["Foundry `topic-router`<br/>chat widget<br/><i>see § 9</i>"]
    end

    BROWSER -->|HTTPS live| SWA
    AFD -.->|target route| SWA
    SWA -->|OIDC redirect| EXTID
    EXTID -->|ID token + access token| SWA
    SWA -->|REST + JWT| APIM
    APIM --> FOUNDRY
    FOUNDRY --> APIM
    APIM --> D365
    D365 --> FABRIC
    SWA -.->|HTTPS chat call| CS

    classDef edge fill:#e36209,stroke:#c24e00,color:#fff
    classDef auth fill:#8957e5,stroke:#6e40c9,color:#fff
    classDef gateway fill:#0078d4,stroke:#004578,color:#fff
    classDef brain fill:#9c27b0,stroke:#6a0080,color:#fff
    classDef back fill:#1565c0,stroke:#0d47a1,color:#fff
    classDef cit fill:#2ea44f,stroke:#238636,color:#fff
    classDef chat fill:#607d8b,stroke:#37474f,color:#fff

    class BROWSER cit
    class AFD,SWA edge
    class EXTID auth
    class APIM gateway
    class FOUNDRY brain
    class D365,FABRIC back
    class CS chat
```

> 📖 **Reading the picture.** Green = citizen. Orange = edge. The 🟢 **Live** entry point is Static Web App at `udcsp.fredgis.com`; Front Door + WAF is 🗺️ **Roadmap** for the target country hostnames. Purple = External ID auth, with Verified ID issuance still 🗺️ **Roadmap**. Blue = the APIM gateway. Dark blue = Dataverse `tasks` today, D365 Customer Service target. Grey = the Foundry `topic-router` chat widget, which is a peer channel embedded in the web shell.

---

## 3. The page-load lifecycle, step by step

```mermaid
%%{ init: { 'sequence': { 'mirrorActors': false, 'actorMargin': 30 }, 'themeVariables': { 'fontSize': '12px' } } }%%
sequenceDiagram
    autonumber
    actor A as 🧑 Anna (citizen)
    participant SWA as 🌐 Static Web App
    participant EID as 🔑 External ID (DK)
    participant APIM as 🚪 APIM
    participant F as 🧠 Foundry
    participant LA as ⚙️ Logic App<br/>application-intake
    participant D as 📋 Dataverse

    A->>SWA: GET https://udcsp.fredgis.com/apply/residency
    SWA-->>A: React shell + Vite bundle + i18n da.json
    A->>A: MSAL.js detects: not authenticated
    A->>EID: OIDC redirect to udcspdk.ciamlogin.com/SignUpSignIn
    EID->>A: show login with national eID (MitID)
    A->>EID: authenticate via MitID
    EID-->>A: ID token + access token (scopes: openid, profile, APIM scope)
    A->>SWA: return to /apply/residency with token
    SWA-->>A: render ApplyResidencyPage, pre-fill known claims
    A->>A: fill 3-step wizard, upload employment contract
    A->>APIM: POST /citizen/applications {type:"residency",...} with JWT Bearer + traceparent
    APIM->>APIM: validate JWT, audit, rate-limit, country claim
    APIM->>F: invoke classifier agent, intent = cross-border-residency-transfer
    F->>F: content safety in, classify, content safety out
    F-->>APIM: intent label + confidence
    APIM->>F: invoke doc-extractor for employment contract PDF
    F-->>APIM: extracted employer, salary, start date
    APIM->>F: invoke eligibility pre-assessor, high-risk HITL required
    F-->>APIM: provisional entitlement + confidence + explanation
    APIM->>LA: enqueue submission (verdict carried in payload)
    LA->>D: write task row (tasks today; udcsp_application target)
    D-->>LA: activityid
    LA-->>APIM: 202 Accepted + correlationId
    APIM-->>SWA: 202 with correlationId and status received
    SWA-->>A: optimistic UI, confirmation toast + case ID
    Note over A,D: Anna sees the case in /cases after the GET op-policy re-hydrates from Dataverse
```

**Latency budget** (target: page interactive p95 ≤ 1.5 s):

| Hop | Budget | How we hit it |
|---|---|---|
| Static Web App edge | ~80 ms | 🟢 **Live** SWA static assets on `udcsp.fredgis.com` |
| SWA CDN static assets | ~80 ms | Vite bundle + i18n JSON, cache-control: immutable |
| External ID OIDC round-trip | ~200 ms | Already warm from browser cookie |
| MSAL.js token refresh (silent) | ~100 ms | sessionStorage cache; no round-trip when token fresh |
| APIM JWT validation | ~30 ms | Cached JWKS, no cold start |
| Foundry classifier (small) | ~120 ms | Small low-latency model before citizen-assistant |
| Foundry doc-extractor | ~400 ms | Streaming; UI shows progress bar |
| Dataverse task create | ~150 ms | 🟢 **Live** Logic App writes `tasks`; D365 Customer Service case create is 🗺️ **Roadmap** |

---

## 4. The seven building blocks

| # | Block | What it does | Where it lives |
|:-:|---|---|---|
| **1** | **Azure Static Web App** | Hosts the pre-built Vite/React bundle at the edge; SPA fallback (`index.html` for all routes); `/api/*` routes require `authenticated` role; CSP headers enforced globally. | `apps/web/staticwebapp.config.json`, `infra/landing-zone/modules/networking.bicep` |
| **2** | **Vite + React 18 + TypeScript** | Single-page application shell; React Router for client-side routing (10 pages: Home, Apply Residency, Apply Tax Cert, Apply Child Benefit, My Cases, Case Detail, Consent, Accessibility, Login, Logout Callback); Fluent UI v9 design system; hot module replacement in dev, optimised bundle in prod. | `apps/web/vite.config.ts`, `apps/web/src/App.tsx`, `apps/web/src/pages/` |
| **3** | **MSAL.js + External ID per country** | 🟢 **Live** `@azure/msal-browser` + `@azure/msal-react` pick the per-country OIDC authority (`udcspdk/se/no.ciamlogin.com`) from `localStorage` country preference; tokens cached in `sessionStorage` (never `localStorage`); `loginRequest` includes the APIM scope; post-logout redirect to `/logout-callback`. Microsoft Entra Verified ID issuance via `infra/identity/verified-id/` is 🗺️ **Roadmap** and not exercised today. | `apps/web/src/auth/msalConfig.ts`, `infra/identity/verified-id/` |
| **4** | **ICU MessageFormat i18n bundles** | `react-intl` (ICU MessageFormat) loads the locale catalogue from `/i18n/messages/{lang}.json` at runtime; 12 locale files produced by the A12 / agent-foundry translation pipeline; RTL direction toggled on `<html>` for `ar`; locale-aware date/number/currency formatting via `Intl` API. | `apps/web/i18n/messages/*.json`, `apps/web/src/utils/language.ts` |
| **5** | **APIM contract clients** | Five typed fetch wrappers mirror the APIM OpenAPI contracts: `applications.ts`, `cases.ts`, `documents.ts`, `eligibility.ts`, `client.ts` (base, with exponential-backoff retry and W3C `traceparent` header on every request). The pending citizen identity contract derives the citizen UPN from the validated token at APIM. | `apps/web/src/api/` |
| **6** | **Foundry topic-router chat widget** | `ChatWidget.tsx` posts directly to APIM `/agent-topic-router/messages`; passes `channel=web`, `locale`, and `traceparent`; lazy-loaded; backed by the same Foundry agents as voice/mobile. 🔵 **In repo**, the request now fails closed unless a signed-in account can supply an access token. This replaces the previous iframe/channel-adapter approach. See **§ 9**. | `apps/web/src/components/ChatWidget.tsx` |
| **7** | **WCAG 2.1 AA assistive layer** | `SkipNav` → `#main-content`; `AccessibilityMenu` (font scale, high-contrast, reduce-motion, dyslexic font); `BreadcrumbsAccessible`; `LoadingSpinnerAccessible`; CSS tokens (`tokens.css`, `accessibility.css`, `dyslexic-font.css`); `AccessibilityStatementPage`; axe-core in CI. | `apps/web/src/components/`, `apps/web/src/styles/`, `apps/web/i18n/accessibility/` |
| **8** | **Citizen insights components** | Lightweight HTML/JS dashboards replace citizen-facing embedded BI: Chart.js + React wrappers render SLA, CSAT, and case progress without embedded BI licensing. Power BI Premium remains for internal ops, exec, and auditor users. | `apps/web/src/components/insights/` |

> [!NOTE]
> **Playwright is also in `apps/web`** (`playwright.config.ts`) but the E2E suite itself lives in `tests/e2e/` — owned by A14. The `apps/web` config is the configuration; the specs are in `tests/e2e/tests/scenario-01-anna-dk-to-se.spec.ts` et al.

> [!IMPORTANT]
> **🔵 In repo, not deployed.** Citizen-facing APIM policies delete any caller-supplied `x-udcsp-citizen-upn`, derive the value from the validated JWT and forward the trusted header. The `application-intake` Logic App reads only that header for the citizen UPN and email, so a request body cannot file an application under another citizen's identity.
>
> The pending SPA also restricts `localStorage` to allow-listed case metadata. `extractedFields`, `documentBlobUrl`, `documentBlobName`, `storageAccount`, `eligibility`, `decision` and `confidence` remain memory-only. A first read scrubs those fields from legacy entries, `getCase` requires the signed-in citizen identity, and sign-out or MSAL account changes clear the cache.

### 4.1 Document upload path and validation state

🟢 **Live transport and client behavior.** The browser does not receive a public blob upload link. `apps/web/src/utils/documentUpload.ts` reads the selected file as base64, applies a 4 MiB browser cap, and calls APIM `POST /documents/upload-url` with `filename`, `contentType` and `contentBase64`. The deployed APIM operation authenticates to Storage with its managed identity, decodes `contentBase64`, and performs the server-side `PUT` to `https://{{storage-account-name}}.blob.core.windows.net/citizen-uploads/<blobName>`. The 4 MiB browser check is a user-experience guard, not an API security control. It displays `File is too large for this demo (max 4 MB).` before making the request.

🔵 **In repo, not deployed.** The pending APIM policy enforces an authoritative 8 MiB decoded limit. It accepts only `.pdf`, `.png`, `.jpg` and `.jpeg` when the supplied media type matches the extension, then checks the decoded bytes for the PDF, PNG or JPEG signature. This validates the bytes, not just caller-provided labels, so renaming arbitrary content to `payslip.pdf` is rejected. Blob content type is derived from the validated type rather than echoed from the request. Malformed base64 returns `400 invalid_content_base64`, an oversized decoded document returns `413 document_too_large`, an unsupported extension/type pair returns `415 unsupported_document_type`, and a byte/type mismatch returns `415 document_content_type_mismatch`.

🟢 **Live network stance.** The storage accounts are private-only. `patch/README.md` documents the private upload path: `udcsp<c>prodlake` has public network access disabled and APIM egress reaches Blob through the blob private endpoint after VNet injection.

---

## 5. Multilingual — 12 languages × ICU MessageFormat

The 12 locale catalogues in `apps/web/i18n/messages/`:

| 🏳️ | Locale code | Language | Script | Direction | Notes |
|:-:|---|---|---|:-:|---|
| 🇩🇰 | `da` | Danish | Latin | LTR | Primary language for DK portal |
| 🇸🇪 | `sv` | Swedish | Latin | LTR | Primary language for SE portal |
| 🇳🇴 | `nb` | Norwegian Bokmål | Latin | LTR | Primary for NO portal; ~90 % of NO speakers |
| 🇳🇴 | `nn` | Norwegian Nynorsk | Latin | LTR | Statutory language equal to Bokmål in NO |
| 🏔️ | `se` | Northern Sámi | Latin + diacritics | LTR | Indigenous language (Davvisámegiella) |
| 🇬🇧 | `en` | English | Latin | LTR | Default fallback; interface for immigrants |
| 🇩🇪 | `de` | German | Latin | LTR | German-speaking residents in all 3 countries |
| 🇫🇷 | `fr` | French | Latin | LTR | French-speaking residents |
| 🇵🇱 | `pl` | Polish | Latin | LTR | Largest non-Scandinavian community in NO/SE |
| 🇸🇦 | `ar` | Arabic | Arabic | **RTL** | RTL; requires `dir="rtl"` on `<html>` |
| 🇺🇦 | `uk` | Ukrainian | Cyrillic | LTR | Significant recent-arrival community |
| 🇫🇮 | `fi` | Finnish | Latin | LTR | Finnish-speakers in Norway and Sweden |

**How the i18n pipeline works:**

1. **Source of truth:** `apps/web/i18n/messages/en.json` — 30 ICU-formatted string keys (navigation, forms, errors, statuses, accessibility labels, banners).
2. **Translation pipeline:** `apps/web/i18n/pipeline/translation-pipeline.yaml` orchestrates Azure AI Translator + human-review hooks; outputs are validated against the glossary in `apps/web/i18n/pipeline/glossary.csv`.
3. **Quality gates:** `apps/web/i18n/quality-gates/translation-qa-rules.md` defines rules (no missing keys, no broken ICU placeholders, no untranslated `[AR]`/`[PL]` stubs); `apps/web/i18n/scripts/Validate-Translations.ps1` runs in CI.
4. **Runtime loading:** `src/utils/language.ts` → `loadMessages(lang)` fetches `/i18n/messages/{lang}.json` at runtime; the SPA re-renders via `react-intl`'s `<IntlProvider>`.
5. **RTL support:** `persistLanguage('ar')` sets `document.documentElement.dir = 'rtl'`; CSS logical properties handle layout mirroring automatically.

**ICU MessageFormat features used:**

```json
// Plural (English):
"language.current": "Current language: {language}",
"case.reference": "Case reference: {caseId}",
"date.submitted": "Submitted on {date}"
```

ICU MessageFormat supports `{count, plural, one {# item} other {# items}}` and `{gender, select, male {...} female {...} other {...}}` — the translation pipeline enforces correct plural forms per locale (e.g., Polish has 4 plural forms; Arabic has 6).

**Locale-aware formatting:** All dates, numbers, and currency amounts are formatted via the browser `Intl` API, not hard-coded strings — ensuring, for example, that Norwegian citizens see `12. mars 2025` rather than `2025-03-12`.

> [!TIP]
> The `Validate-Translations.ps1` script (`apps/web/i18n/scripts/Validate-Translations.ps1`) is the single command to check all 12 catalogues for missing keys, broken ICU placeholders, and RTL markers. Run it before any i18n PR merge.

---

## 6. Accessibility — WCAG 2.1 AA, screen-readers, keyboard-only

The case study is explicit: *"full WCAG 2.1 AA accessibility compliance achieved."* The web portal is the accessibility showcase of UDCSP. This section describes the concrete implementation anchored to source files.

### 6.1 Skip navigation

`index.html` contains a `.skip-link` anchor to `#main-content` **before** the React root — so screen-reader users and keyboard-only users can bypass the global navigation without waiting for React to hydrate. `src/components/SkipNav.tsx` renders the same link inside the React tree for post-hydration navigation.

### 6.2 Screen-reader landmarks

`App.tsx` uses semantic HTML5 landmarks: `<header>`, `<nav aria-label="Main">`, `<main id="main-content" tabIndex={-1}>`. Every page heading hierarchy starts at `<h1>`. ARIA live regions (`role="status" aria-live="assertive"`) are used in form pages (`ApplyResidencyPage.tsx`) to announce progress and errors without requiring focus movement.

### 6.3 Focus management

After route transitions, `<main id="main-content" tabIndex={-1}>` is programmatically focused so screen-reader users are placed at the top of the new page content — not stranded at the last interactive element of the previous page. All dialogs and modals use `aria-modal` and return focus on close.

### 6.4 Contrast tokens and theming

`apps/web/src/styles/tokens.css` defines CSS custom properties for colours, spacing, and typography derived from Fluent UI v9's design tokens. All foreground/background colour pairs meet the WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text). High-contrast mode is toggled via the `.high-contrast` class on `<html>` (applied by `applyAccessibility()` in `src/utils/accessibility.ts`).

### 6.5 Reduced-motion

The `.reduce-motion` class on `<html>` activates `@media (prefers-reduced-motion: reduce)` overrides in `accessibility.css`, suppressing all CSS transitions and animations for users who opt in. The `AccessibilityMenu` component exposes this as a toggle, and the preference persists via `localStorage`.

### 6.6 Dyslexic font

`dyslexic-font.css` loads OpenDyslexic (or a system fallback) when the `.dyslexic-font` class is active. This is an opt-in feature exposed in the `AccessibilityMenu`.

### 6.7 Keyboard-only navigation

Fluent UI v9 components are keyboard-accessible by default. The language switcher (`LanguageSwitcher.tsx`), breadcrumbs (`BreadcrumbsAccessible.tsx`), and loading spinner (`LoadingSpinnerAccessible.tsx`) are all wrapped with explicit ARIA roles and keyboard handlers. The chat widget panel is given `aria-label="Foundry topic-router citizen assistant"` for assistive technology identification.

### 6.8 Automated axe-core scanning

`package.json` includes `@axe-core/react` and `axe-core` as dev dependencies; `tests/Home.a11y.test.tsx` runs axe on the home page in Vitest. The full CI accessibility gate is owned by A14 in `tests/accessibility/`.

### 6.9 Accessibility statement

`apps/web/i18n/accessibility/accessibility-statement-template.md` provides the per-country accessibility statement template (required by EU Web Accessibility Directive). The rendered statement is available at `/accessibility` via `AccessibilityStatementPage.tsx`. The WCAG 2.1 AA checklist (`apps/web/i18n/accessibility/wcag-2.1-aa-checklist.md`) maps every POUR criterion to implemented components: navigation, forms, status banner, language switcher, chat entry, document upload, error summary, notification panel.

---

## 7. Sovereignty — one cookie domain per country, one External ID tenant per country

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 25, 'rankSpacing': 30 }, 'themeVariables': { 'fontSize': '12px' } } }%%
flowchart LR
    subgraph DK["🇩🇰 Denmark — Azure North Europe"]
        SWA_DK["Static Web App DK<br/><i>dk.udcsp.gov</i>"]
        EID_DK["External ID DK<br/><i>udcspdk.ciamlogin.com</i><br/><i>infra/identity/external-id/dk-external-id.bicep</i>"]
        AFD_DK["Front Door rule: DK<br/><i>🗺️ Roadmap host=*.dk.udcsp.gov</i>"]
        FAB_DK["Fabric workspace DK<br/><i>citizen data DK only</i>"]
    end

    subgraph SE["🇸🇪 Sweden — Azure Sweden Central"]
        SWA_SE["Static Web App SE<br/><i>se.udcsp.gov</i>"]
        EID_SE["External ID SE<br/><i>udcspse.ciamlogin.com</i><br/><i>infra/identity/external-id/se-external-id.bicep</i>"]
        AFD_SE["Front Door rule: SE<br/><i>🗺️ Roadmap host=*.se.udcsp.gov</i>"]
        FAB_SE["Fabric workspace SE<br/><i>citizen data SE only</i>"]
    end

    subgraph NO["🇳🇴 Norway — Azure Norway East"]
        SWA_NO["Static Web App NO<br/><i>no.udcsp.gov</i>"]
        EID_NO["External ID NO<br/><i>udcspno.ciamlogin.com</i><br/><i>infra/identity/external-id/no-external-id.bicep</i>"]
        AFD_NO["Front Door rule: NO<br/><i>🗺️ Roadmap host=*.no.udcsp.gov</i>"]
        FAB_NO["Fabric workspace NO<br/><i>citizen data NO only</i>"]
    end

    SWA_DK --> EID_DK --> FAB_DK
    AFD_DK --> SWA_DK
    SWA_SE --> EID_SE --> FAB_SE
    AFD_SE --> SWA_SE
    SWA_NO --> EID_NO --> FAB_NO
    AFD_NO --> SWA_NO

    classDef dk fill:#C8102E,stroke:#7a0a1c,color:#fff
    classDef se fill:#006AA7,stroke:#003d61,color:#fff
    classDef no fill:#BA0C2F,stroke:#7a081e,color:#fff
    class SWA_DK,EID_DK,AFD_DK,FAB_DK dk
    class SWA_SE,EID_SE,AFD_SE,FAB_SE se
    class SWA_NO,EID_NO,AFD_NO,FAB_NO no
```

### 7.1 Per-country cookie domain

Each portal is served on a **distinct registrable domain**:

| Country | Domain | Cookie scope |
|---|---|---|
| 🇩🇰 Denmark | `dk.udcsp.gov` / `*.dk.udcsp.gov` | Cookies scoped to `dk.udcsp.gov` only — never shared with SE or NO |
| 🇸🇪 Sweden | `se.udcsp.gov` / `*.se.udcsp.gov` | Cookies scoped to `se.udcsp.gov` only |
| 🇳🇴 Norway | `no.udcsp.gov` / `*.no.udcsp.gov` | Cookies scoped to `no.udcsp.gov` only |

The `staticwebapp.config.json` sets `Strict-Transport-Security` and `Referrer-Policy` headers globally. Session tokens are stored in `sessionStorage` (not cookies) per `msalConfig.ts` — aligning with the MSAL.js security recommendation and avoiding any cross-country token leakage.

### 7.2 Per-country External ID OIDC authority

`apps/web/src/auth/msalConfig.ts` resolves the authority at runtime from the user's country preference:

```typescript
export const authorityForCountry = (country: Country) =>
  `https://udcsp${country}.ciamlogin.com/udcsp${country}.onmicrosoft.com/SignUpSignIn`;
// country = 'dk' → udcspdk.ciamlogin.com
// country = 'se' → udcspse.ciamlogin.com
// country = 'no' → udcspno.ciamlogin.com
```

Each External ID tenant is declared in its own Bicep file:
- `infra/identity/external-id/dk-external-id.bicep`
- `infra/identity/external-id/se-external-id.bicep`
- `infra/identity/external-id/no-external-id.bicep`

User flows, custom policies, and national eID connections (MitID for DK, BankID for SE, BankID NO for NO) are defined per tenant in `infra/identity/external-id/user-flows/`.

### 7.3 Per-country brand theming

The `getCountry()` helper (`msalConfig.ts`) reads `udcsp.country` from `localStorage`. The React app applies a per-country CSS class to `<html>` — DK uses Danish red/white, SE uses Swedish blue/yellow, NO uses Norwegian red/white — all defined as CSS custom property overrides in `tokens.css`. **No code forks; one codebase, three themes.**

What stays in-country: **citizen PII, session tokens, application data, uploaded documents, Fabric analytics**. What is shared cross-country: **anonymised metrics, the Foundry agent definitions, the APIM gateway config, and the React codebase itself.**

---

## 8. SLOs, risks, and mitigations

| | SLO | Target | How we measure |
|:-:|---|---|---|
| ⚡ | **TTFB** (time to first byte) | p95 ≤ **200 ms** | 🟢 **Live** SWA and App Insights where instrumented; Front Door diagnostics are 🗺️ **Roadmap** |
| 📱 | **Lighthouse score — mobile** | ≥ **95** (Performance + Accessibility + Best Practices) | Lighthouse CI in every PR; budget enforced |
| ♿ | **WCAG 2.1 AA conformance** | **100 %** automated + 0 critical manual findings | axe-core in CI; quarterly manual audit |
| 🚀 | **Page load p95** (Largest Contentful Paint) | ≤ **1.5 s** on 4G mobile | Synthetic test from 3 countries via App Insights availability |
| 🟢 | **Availability** | ≥ **99.9 %** monthly | 🟢 **Live** SWA status endpoint; Front Door health-probe is 🗺️ **Roadmap** |
| 🔐 | **Auth success rate** (OIDC round-trip) | ≥ **99.5 %** | MSAL.js telemetry → App Insights |

Risks tracked in `docs/tech/plan.md` § Risk Register that affect the web portal:

> **R1 — Cross-border data flow violates a national DPA interpretation.** The web portal never sends raw PII across country lines; only claims-based tokens mediated by the eIDAS bridge. Mitigation: per-country Purview policy packs, legal review per data flow, claims-based mediation only.

> **R2 — Eligibility model bias.** The web portal surfaces the eligibility agent's output to citizens. Mitigation: high-risk AI classification, golden eval datasets covering protected attributes, shadow-mode rollout, mandatory human caseworker review before any eligibility decision is communicated.

> **R5 — AI Act conformity for high-risk agent.** The residency-transfer eligibility pre-assessor is a high-risk EU AI Act system. Mitigation: documentation pipeline in Foundry; conformity assessment artefacts produced from evals + tracing; the web portal always shows the disclosure banner (`banner.aiDisclosure` key in i18n catalogues).

**R12 — Multilingual quality drift.** With 12 languages, i18n key drift is a real risk: a new string key added in `en.json` but not propagated to all locales. Mitigation: `Validate-Translations.ps1` runs in CI and blocks the PR if any key is missing in any locale.

**Traceability status.** 🟡 **Partially deployed** traceability means W3C `traceparent` and App Insights traces for exercised paths. Confidential Ledger anchoring is 🗺️ **Roadmap** and the Purview lineage endpoint remains `placeholder.local`, so this document should not claim immutable audit anchoring for the live web path.

---

## 9. 🌐 Embedding the AI assistant in the page

> **Scope:** The web channel hosts the chat surface, but intelligence is in Foundry. The launcher is available only after sign-in and AI-assistant consent. The direct route is APIM `/agent-topic-router/messages`.

### 9.1 The direct APIM call

```ts
await fetch(`${apimBase}/agent-topic-router/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, traceparent },
  body: JSON.stringify({ sessionId, channel: 'web', locale, text, citizen: { country }, cases })
});
```

🔵 **In repo, not deployed.** `ChatWidget.tsx` refuses to send if the signed-in account or refreshed access token is unavailable. The request body no longer carries `authenticated`, `name`, `givenName` or `upn`; APIM obtains identity from the validated token. `citizen.country` and the supplied case list remain caller-provided context, not identity proof.

`ChatWidget.tsx` remains the host component, but it no longer renders an embedded assistant frame or requests a channel token. It sends the citizen utterance to APIM, receives a channel-shaped response from Foundry `topic-router`, and renders citations/actions as React components.

### 9.2 Citizen-facing insights without embedded BI

Citizen status and outcome tiles are HTML/JS components in `apps/web/src/components/insights/` using Chart.js + React wrappers. They show case progress, expected SLA, and accessibility-friendly charts. **Power BI Premium is kept for internal users** — operations, executives, and auditors — but citizen pages do not embed Power BI.

---

## 10. The activation runbook

```mermaid
%%{ init: { 'flowchart': { 'nodeSpacing': 25, 'rankSpacing': 30 }, 'themeVariables': { 'fontSize': '12px' } } }%%
flowchart TB
    P0["✅ Pre-reqs<br/><i>Foundry + APIM + External ID tenants live</i>"]
    P1["1️⃣ npm install + npm run build<br/><i>apps/web; Vite production bundle</i>"]
    P2["2️⃣ swa deploy ./dist<br/><i>upload to Azure Static Web Apps × 3 countries</i>"]
    P3["3️⃣ Wire External ID<br/><i>OIDC redirect URIs + client ID per country</i>"]
    P4["4️⃣ Deploy APIM client config<br/><i>VITE_APIM_BASE_URL + VITE_APIM_SCOPE injected into SWA env</i>"]
    P5["5️⃣ Set VITE_APIM_BASE_URL<br/><i>point ChatWidget at APIM<br/>`/agent-topic-router/messages`</i>"]
    P6["6️⃣ Validate i18n catalogues<br/><i>pwsh apps/web/i18n/scripts/Validate-Translations.ps1</i>"]
    P7["7️⃣ Smoke test<br/><i>npm test + npm run test:a11y in apps/web</i>"]
    P8["✅ Phase complete — web portal live"]

    P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8

    style P0 fill:#1565c0,stroke:#0d47a1,color:#fff
    style P8 fill:#2ea44f,stroke:#238636,color:#fff
    style P3 fill:#8957e5,stroke:#6e40c9,color:#fff
    style P5 fill:#607d8b,stroke:#37474f,color:#fff
```

All of this is automated by `scripts/install/modules/Install-Apps.psm1` (phase **Apps** of the master installer, work package A9). The key steps from the module:

```powershell
# Install-Apps.psm1 (excerpt — scaffold)
# Step 1: build the web portal
"[scaffold] cd $repo\apps\web; npm install; npm run build"
# Step 2: deploy to Static Web Apps
"[scaffold] swa deploy ./dist --env production"
```

The `Test-Apps` function in the same module validates that all 12 i18n catalogue files are present before declaring the phase complete.

---

## 11. How to test it (three levels)

| Level | Command | What it proves | Lead time |
|---|---|---|---|
| **🚦 Smoke (unit + a11y)** | `npm run test --prefix apps/web` | Vitest unit tests: API client retry logic, language detection, traceparent format. `npm run test:a11y` runs axe-core on the home page. **No real backend, no OIDC.** | < 30 s |
| **🧪 E2E (Playwright)** | `npx playwright test tests/e2e/tests/scenario-01-anna-dk-to-se.spec.ts` | Anna's web journey: DK External ID login, wizard form fill, Foundry classifier response, Dataverse `tasks` write through `application-intake`, optimistic confirmation toast. Cross-border fan-out and D365 CS landing remain 🗺️ **Roadmap**. | ~ 3 min |
| **🌐 Live (browser)** | Open `https://udcsp.fredgis.com` in a browser | 🟢 **Live** SWA, External ID OIDC, APIM JWT validation, Foundry agents, document upload and Dataverse `tasks` write. Front Door and D365 CS are not part of the live browser path today. | Manual |

The E2E scenario spec `tests/e2e/tests/scenario-01-anna-dk-to-se.spec.ts` maps to **Demo 1** in `uses.md` — Anna's flagship cross-border residency journey.

---

## 12. The demo script for a jury

5 minutes, no setup beyond the deployed platform and the DEV environment seeded with A15 synthetic data (`Install-UDCSP.ps1 -SeedSyntheticData`):

| Beat | Action | What the jury sees | Eval-matrix rows hit |
|:-:|---|---|---|
| 1 | Open `https://udcsp.fredgis.com` in a browser. Click the language switcher and choose **Dansk**. | Portal loads in Danish from the live Static Web App. Front Door diagnostics are not part of the current demo. | #1 (47→1) · #13 (multilang) |
| 2 | Click **"Move to another Nordic country"**. Authenticate as synthetic persona **Anna Jensen** (MitID mock). | OIDC redirect to `udcspdk.ciamlogin.com`; token returned; portal re-renders with Anna's pre-filled DK claims — no duplicate data entry. | #2 (ID federation) · #6 (AI assistant) |
| 3 | Complete the 3-step residency wizard. Upload the synthetic employment contract PDF. | Vite progress bar while Foundry doc-extractor runs; employer and salary auto-filled. Eligibility pre-assessor returns provisional entitlement with HITL disclosure. | #3 (28d→4d) · #5 (AI 12 lang) · #7 (eligibility) · #9 (GDPR/AI Act) |
| 4 | Submit the form. | Confirmation toast with case ID. The Logic App writes a Dataverse `tasks` row today; the `udcsp_application` case and 4-day D365 SLA are target architecture. | #15 (audit) · #3 (4d SLA) · #14 (all 9 services) |
| 5 | Open the `AccessibilityMenu`. Enable **high-contrast** mode. Navigate the page keyboard-only. Open a screen reader and observe the ARIA live region announce the form status. | Portal is fully navigable keyboard-only; high-contrast CSS activates; screen reader announces progress without focus movement. | #8 (WCAG 2.1 AA) · #1 (47→1 single front door) |

> [!TIP]
> After beat 5, switch the language to **Polski** (for Maria's accessibility demo from Demo 3 in `uses.md`) and show the RTL switch by selecting **العربية** — the entire layout mirrors, all labels appear in Arabic, and no layout breaks occur. This is a powerful visual proof of the ICU MessageFormat architecture.

This corresponds to **Demo 1** in [`uses.md`](./uses.md#-demo-1--anna-moves-from-copenhagen-to-stockholm-flagship).

---

## 13. Anti-patterns we avoid

| ❌ Anti-pattern | ✅ What we do instead |
|---|---|
| **Per-country code forks** — three separate React repositories, one per country | One codebase; country resolved at runtime from `udcsp.country` preference; CSS custom properties for theming |
| **Hard-coded strings** in JSX or TypeScript | Every citizen-visible string is an ICU key in `apps/web/i18n/messages/{lang}.json`; `banner.aiDisclosure` is localised in all 12 languages |
| **Server-side render of citizen data** — pre-rendering PII into the HTML | React SPA; no SSR; all citizen data is fetched client-side after OIDC authentication, never embedded in static HTML |
| **"One giant SPA"** — all routes loaded eagerly | React Router with lazy-loaded routes; Vite code splitting; the ChatWidget panel is lazy-loaded` |
| **Authentication tokens in localStorage** | `sessionStorage` only (`msalConfig.ts`: `cacheLocation: 'sessionStorage'`); tokens are cleared on tab close; no cross-tab token sharing |
| **Sensitive case details in localStorage** | 🔵 **In repo**, only allow-listed case metadata persists. Rich fields stay in memory, legacy entries are scrubbed, citizen identity must match, and sign-out or account changes clear the cache. |
| **Caller-supplied citizen identity** | 🔵 **In repo**, APIM replaces `x-udcsp-citizen-upn` with the identity derived from the validated JWT; Logic Apps do not trust identity fields in the request body. |
| **Ignoring WCAG until the end** | WCAG 2.1 AA is a platform invariant from the first commit (P3); axe-core runs in CI from W2; design system components (Fluent UI v9) are keyboard-accessible by default |
| **One External ID tenant for all three countries** | One External ID tenant **per** country, enforced by Bicep; per-country national eID connections; no cross-country token acceptance |
| **Bypassing APIM**, calling Foundry or D365 directly from the browser | All backend calls go through APIM (`apiFetch` base client). Citizen APIs validate JWTs today; topic-router JWT enforcement is 🔵 **In repo**, pending deployment. |
| **Uncorrelated traces** | Every API call carries a W3C `traceparent` header generated by `src/utils/traceparent.ts`; chat widget inherits the same trace via query param |
| **Static bundle for i18n** — locale strings compiled into the JS bundle | Runtime locale loading from `/i18n/messages/{lang}.json`; locale files can be updated independently of the app bundle |

---

## 14. Where the conversation is stored

The web portal separates typed dialog from portal transactions: the embedded Foundry `topic-router` widget writes its transcript to the shared `bot_session` store, while form drafts, submitted cases, uploads, and per-citizen memory use their own stores. This follows Zone 3 for conversations and keeps binary uploads out of Dataverse. See [`../tech/data.md`](../tech/data.md) § 3.3 for the Zone 3 policy.

| What | Where | Retention |
|---|---|---|
| Chat widget transcript | Foundry `topic-router` Dataverse `bot_session` | 6 months hot; 6 years OneLake |
| Portal form drafts | 🔵 **In repo** Redis Enterprise and PostgreSQL JSONB target design; not proven as live persistence for the current SPA demo path | TTL 30 days before submit |
| Browser case cache | 🔵 **In repo** allow-listed metadata in `localStorage`; rich document and eligibility fields remain in memory and re-hydrate from APIM | Cleared on sign-out or MSAL account change |
| Uploaded documents | 🟢 **Live** ADLS Gen2 `citizen-uploads/` behind APIM managed identity and private Blob endpoint | While case open + lifecycle tiers |
| Memory + traces | 🟡 **Partially deployed** App Insights traces for exercised paths; AI Search memory and OneLake retention are target architecture unless separately deployed | Memory TTL 12 months; traces 180 days hot |

For the full retention matrix, use [`../tech/data.md`](../tech/data.md) § 5.

> 📖 Full storage architecture and retention rules: see [`../tech/data.md`](../tech/data.md).

---

<div align="center">

*The web portal is the flagship front door of UDCSP — one experience, three sovereignties, twelve languages, and one accessibility standard.*  🇩🇰 🇸🇪 🇳🇴

[![Demo](https://img.shields.io/badge/▶_Live_demo-Demo_1_in_uses.md-1565C0?style=for-the-badge)](./uses.md#-demo-1--anna-moves-from-copenhagen-to-stockholm-flagship)
[![Build agent](https://img.shields.io/badge/🤖_Build-A9_·_apps/web/-FF6F00?style=for-the-badge)](../tech/agents.md)
[![Install phase](https://img.shields.io/badge/⚙️_Install-Phase_Apps_·_Install--Apps.psm1-2E7D32?style=for-the-badge)](../tech/installation.md)

</div>
