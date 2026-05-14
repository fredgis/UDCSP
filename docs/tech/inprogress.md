# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox.
Update one row at a time as we wire each demo.

- **Web SWA** — https://udcsp.fredgis.com
- **Last bundle deployed** — `signout-home-+-authgate-redesign-+-required-asterisks-+-eid-preview` (commits `7173204`, `2c22f73`): every Apply form now marks required fields with a red `*` and blocks submit until they're filled (drop `noValidate`, gate Residency on `destination + moveDate`); LoginPage shows the production-grade eID method preview tiles (MitID / BankID / BankID Norge); ChatLauncher visible on the home page; sign-out always returns to `/` (UserBadge navigates home before `logoutRedirect`, msalConfig sets `redirectUri` and `postLogoutRedirectUri` to `origin + '/'`); AuthGate ("Sign in to apply…") fully redesigned as a two-column hero + 3 benefit tiles with country pill and eID name; ambient mesh background + glass surfaces across the SPA. Earlier bundle `D3-pl-locale-translator-axe` (Polish locale, Translator agent in application-intake LA, axe-core CI) still active.

> 🛠️ **May 14 hotfix bundle (commits `697c1e4` · `d6869e4` · `f6831b2` · `ec02efb` · `9a924ba` · `c78f99f` · `5e7594c` · `db29abb` · `bcd20c7` · `40523c6` · `46c6dfe` · `5464f06` · `5b9bfc6` · `db08672` · `ebda33d` · `5ee46d2` · `28200ac` · `e07821e` · `45b6393`).**
> – `services/apim/apis/eligibility-checks/policy.xml` was using `jwt-validate-entra` (Workforce OIDC) instead of `jwt-validate-external-id`; every citizen-side eligibility call returned 401 before reaching the agent. Fragment swapped + policy redeployed live to `udcsp-{dk,se,no}-prod-apim` via `az rest PUT --output-file`.
> – Eligibility 502 then 400 fixed in two passes: (a) the policy was attempting a `try{}/catch{}` around `send-request` that the APIM Razor parser misread as control-flow → restructured to plain null checks (commit `9a924ba`); (b) gpt-5.4 rejects `max_tokens` and requires `max_completion_tokens` (commit `c78f99f`).
> – **Eligibility now Foundry-driven (commit `5e7594c`).** Earlier the policy embedded an inline copy of the system prompt and called AOAI directly — the deployed Foundry `udcsp-eligibility` agent (kind=prompt, v5) was bypassed. New policy v3 does (1) `GET {projectEndpoint}/api/projects/udcsp/agents/udcsp-eligibility` (cached 5 min), extracts `versions.latest.definition.{instructions, model_options}`, then (2) `POST {{foundry-aoai-endpoint}}openai/deployments/gpt-5.4/chat/completions` with the agent's prompt + options. Updating the agent in the Foundry portal propagates to runtime within 5 minutes without an APIM redeploy. Source of truth is the Foundry agent envelope; `foundry/agents/eligibility/system-prompt.md` and the agent registry must stay mirrored.
> ℹ️ **Where to read eligibility traffic.** Because `udcsp-eligibility` is a `kind=prompt` agent (registry blueprint, no runtime), the Foundry portal's "Activity / Invocations" panel for the agent **stays at 0 by design** — every invocation goes APIM → AOAI deployment `gpt-5.4`, and Foundry only sees the cached metadata GET. Real metrics live on (a) the AOAI account `udcspai` deployment metrics (`AzureOpenAIRequests`, tokens), (b) APIM `eligibility-checks` API analytics, (c) App Insights traces. If first-class agent activity tracking is needed later, migrate to `kind=hosted` (container) or `kind=workflow`.
> – **LA Create_D365_case fix (2026-05-14 evening, commit `c2f44e8`).** Every recent submission was failing with `0x80044331 "The length of the 'description' attribute of the 'task' entity exceeded the maximum allowed length of 2000"`. The deployed `udcsp-dk-dev-application-intake` workflow concatenated the entire trigger payload into `task.description`; for any non-trivial application the field exceeded Dataverse's 2000-char cap. Hotfix: PATCHed the deployed workflow's `Create_D365_case.inputs.body.description` expression to substring-truncate at 1900 chars before POSTing. Source-of-truth `services/logic-apps/workflows/application-intake/workflow.json` already maps field-by-field into `udcsp_application`, so the next deploy replaces the legacy `tasks` write entirely. SE/NO LA placeholders still need the same patch when their endpoints leave `placeholder.local`.
>
> – **My Cases full pipeline live (2026-05-14 night).** Five compounding bugs uncovered + fixed in sequence:
>   1. **Remove cascade missing** (`db29abb`): the DELETE op-policy only removed the Dataverse row, not the uploaded blob. New policy parses `description` for `documentBlobUrl`, fires a blob `DELETE` against `udcspdkprodlake/citizen-uploads/...` via APIM MI (`Storage Blob Data Contributor`, `x-ms-version: 2021-06-08`, `ignore-error="true"`) before the row delete.
>   2. **GET / op-policy never deployed** (`40523c6`): `operations/get-citizen-applications-list.xml` existed in the repo but `Install-Apim.psm1`'s import didn't push it — fixed the CSHTML brace style that the APIM Razor parser rejected. List was falling through to the LA backend with cached empties.
>   3. **OData `startswith(subject,'[UDCSP-')`** (`46c6dfe`): bracket `[` silently breaks Dataverse OData. Filter reduced to `contains(description,'citizenUpn: <upn>')`.
>   4. **API-level cache serving stale empty bodies** (`5464f06`): removed `<cache-lookup>` / `<cache-store duration="60"/>` on `citizen-applications` API. Reads are real-time now.
>   5. **APIM MI security role too narrow** (manual role assignment + doc update `db08672`): APIM Application User had only `Basic User` + `System Customizer` → reads scoped to user-owned tasks → invisible because the Logic App MI owns them. Granted **Systemadministrator** (`425f1836-…`) to the APIM Application User in `org939d8f07`. Both list and delete now work end-to-end.
>
> – **SPA Case Detail repaired + redesigned (commits `ebda33d` → `45b6393`).** Real root cause was the Dataverse 2000-char truncation: the LA's `description` JSON gets cut mid-string, `JSON.parse` failed, and the SPA lost ALL fields (documentBlobUrl, extractedFields, eligibilityPreflight). New `apps/web/src/utils/descriptionParser.ts` is a 3-tier parser:
>   1. Clean `JSON.parse`.
>   2. Truncation repair — track bracket+string depth, close open string, drop dangling key, close open brackets, retry.
>   3. Regex fallback for known top-level fields (`documentBlobUrl`, `recommendation`, `confidence`…).
>
>   Helpers `humanTitle()`, `humanStatus()`, `applicationIcon()`, `countryFlag()` make `[UDCSP-DK] residency-transfer` / `statuscode 2` display as "Residency transfer" / "In progress". `MyCasesPage.load()` now also merges any rich legacy local entry (apply page stored under `correlationId`) into the remote-keyed StoredCase by matching (citizenUpn, applicationType, country, ±10 min). `CaseDetailPage` rewritten: hero with status-accent stripe, large title + icon + flag, 2-col layout (workflow + eligibility | document + extracted fields), Document Extractor step shows `<filename> · N fields extracted`, Eligibility section open by default with rule-by-rule liserés pass/fail.
> – Discovered the SWA `udcsp-web-dev` has **no GitHub Actions workflow** (`gh workflow list` only returns `web-axe`; `az staticwebapp show` returns `repo: null`). All recent merges to `main` therefore did **not** reach the live origin until manually deployed. **Going forward, every code change must be pushed live with `npm run build && npx --yes @azure/static-web-apps-cli@latest deploy ./dist --deployment-token <key> --env production --no-use-keychain` (token from `az staticwebapp secrets list -n udcsp-web-dev`).**
> – Power Apps caseworker bootstrap landed: `apps/powerapps/caseworker/bootstrap-udcsp-application.ps1` provisions the `udcsp_application` custom table (~40 columns) idempotently via the Dataverse Web API; `apps/powerapps/caseworker/deploy.ps1` replicates the resulting solution across DK/SE/NO envs with `pac solution export/import --publish-changes`. Bootstrap script now auto-detects the org's base LCID via `GET /organizations?$select=languagecode` (fallback `RetrieveProvisionedLanguages`) so non-English Dataverse orgs (e.g. `org939d8f07` provisioned in fr-FR) no longer fail every attribute create with `0x80044195 "language code 1033 is not a valid language for this organization"`. UI parity fix on `/cases` + `/cases/<id>`: `.case-actions__btn` now hard-sets height/border/padding so Cancel and Remove render at exactly the same size regardless of `.button-secondary` vs `.button-danger` defaults (commit `22fa6cd`).
>
> ⚠️ **Caseworker surface — temporary stance.** Until the per-country D365 Customer Service envs are provisioned, the caseworker workspace runs as a **model-driven Power App on the shared Dataverse env `org939d8f07`** (DK system tenant). This is intentional and temporary: the `udcsp_application` table schema, the Power Fx form, and every column logical name match what the future Customer Service deployment will use, so the artefact is a drop-in replacement (no data migration, no API rewrite). Citizen portal still writes to the same table via the same Logic-App actions; only the agent/caseworker UX moves from Power App → Customer Service when the per-country envs are ready. **Today the LA `udcsp-dk-dev-application-intake` writes to the standard `Task` table** (`d365CasesEndpoint=…/api/data/v9.2/tasks`) — `My Cases` reads `tasks` filtered by subject prefix `[UDCSP-`. The bootstrap script provisions `udcsp_application` for the future-canonical schema, but the LA repoint to `…/udcsp_applications` happens after the schema columns are live (which itself depends on re-running the bootstrap with the LCID fix from commit `22fa6cd`). Until then, expose the standard **Task** table as a second page in the model-driven app so existing submissions are visible. See [`apps/powerapps/caseworker/README.md`](../../apps/powerapps/caseworker/README.md) for the bootstrap procedure and the `tasks → udcsp_applications` migration script.

Legend: 🟢 fully E2E · 🟡 partial / UI-only · 🔴 not wired

## Demo status

**Status legend** — 🟢 played live end-to-end · 🟡 built & wired, not yet played live · 🔴 not built / placeholders only.

The 10 rows below mirror the 10 demos defined in [`docs/biz/uses.md`](../biz/uses.md). State reflects what *can be played today on the live tenant*, not what has been provisioned in Azure.

| #  | Demo (uses.md)                                            | State | What works today                                                                                          | What blocks a live walk-through                                                                                              |
|----|-----------------------------------------------------------|:-----:|-----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| 1  | Anna moves Copenhagen → Stockholm (cross-border)          | 🟡    | DK + SE + NO sign-in via External ID (MitID/BankID/BankID Norge via Criipto broker); 6-step Residency-transfer wizard live in 12 langs (`/apply/residency`) with consent-gating + identity pre-fill panel + crossBorder flag computed from origin≠destination; **Foundry-driven eligibility now Live**: APIM v3 fetches `udcsp-eligibility` agent (kind=prompt, gpt-5.4) definition + `model_options` then calls AOAI server-side, returns structured verdict to the SPA before submit (commit `5e7594c`); APIM `agent-topic-router` system prompt knows the DK/SE/NO residency rules + Info Norden / Øresunddirekt / Grensetjänsten cross-border refs; Logic-App `cross-border-residency` workflow.json scaffolded with eIDAS-validation / DK-residency-facade / D365-cases / ACS-notification HTTP actions; Service Bus queue `cross-border-coordination` defined; **caseworker workspace = model-driven Power App on shared Dataverse `org939d8f07`** (temporary, drop-in for future SE D365 Customer Service env — same `udcsp_application` table); bootstrap script provisions ~40-column table idempotently with auto-detected base LCID; DPIA + Purview DLP `block-cross-border-cpr-without-consent` + sensitivity label `Restricted-Cross-Border` in repo. | Once-only pre-fill from DK CPR/Folkeregister (Anna still re-keys identity — pre-fill panel is mocked from External ID claims); Apply form submits to single-country `/citizen-applications/` not the cross-border LA (the `crossBorder:true` flag is sent but no fan-out); the cross-border LA itself is still a skeleton with placeholder endpoints (no eIDAS bridge wired, no signed-claims envelope produced); per-country SE D365 Customer Service env not provisioned — caseworker triage runs on the shared Power App, not on a SE-resident D365 (cross-zone isolation not actually demonstrated); Translator agent built + invoked in DK chain but not invoked on the residency outbound path; ACS notification template not produced (no SV+EN push delivered to Anna's phone); Microsoft Entra Verified ID credential issuance not provisioned; auto-onboarding to SE portal via federated identity not built; SLA timer + Power BI median-4d KPI report missing; Foundry trace ID not surfaced on My Cases. |
| 2  | Lars asks voice assistant for tax refund (NO)             | 🔴    | ACS resource + GPT-4o Realtime deployment exist in Bicep.                                                  | Voice orchestrator Container App not deployed; `IncomingCall` Event Grid sub not wired; warm-transfer to D365 absent.        |
| 3  | Maria with Windows Narrator (PL in DK)                    | 🟢    | DK chain works end-to-end (sign-in → APIM → LA → 4 Foundry agents → Dataverse `tasks`); MI-proxy upload onto `udcspdkprodlake`; workflow timeline; eligibility reasoning surfaced; consent-gating live; **PL locale bundle complete (12 languages translated end-to-end including HomePage, footer, Apply forms, Compliance, Login, Cases, Consent, Demos), Translator agent invoked in LA after Doc Extractor, axe-core CI gate active, site-wide RouteAnnouncer + cookie-banner a11y fix shipped**. | — Promoted 🟢 after live walk-through with Windows Narrator (Win + Ctrl + Enter) on Edge, Polish UI. |
| 4  | Erik snaps a payslip on mobile (DK)                       | 🟡    | Web equivalent works (drop a PDF → Document Extractor → confirm → submit). Same APIM + LA path.            | No native iOS/Android build shipped; mobile shell exists in repo but not packaged.                                            |
| 5  | Astrid caseworker triages with Copilot for Service        | 🟡    | **Caseworker workspace = model-driven Power App** (`apps/d365/solutions/UDCSP_Core/customizations/apps/caseworker-app.xml` + `apps/powerapps/caseworker/README.md`) — single XML imports as the production-shape model-driven app via `pac solution import`; same Dataverse table (`udcsp_application`) the future D365 Customer Service deployment will use, so the artefact is a drop-in. Cross-country queue + AI verdict + extracted fields + workflow timeline + approve/reject/request-more-info via the form. Caseworker-helper Foundry agent deployed; APIM op routes to it. The standalone SPA route `/caseworker` was removed — the citizen portal no longer ships the caseworker substitute (it conflated personas; Power App is the single canonical surface). | `pac solution import` pending against `org939d8f07` (DK system tenant) and the per-country envs once they're provisioned; `udcsp_application` custom table needs to be authored once in `make.powerapps.com` then re-exported with `pac solution export --include customization` to embed the table XML in `apps/d365/solutions/UDCSP_Core/Other`. |
| 6  | Eligibility model proposes, caseworker disposes           | 🟡    | Eligibility Pre-Assessor `udcsp-eligibility` is now **invoked synchronously from the citizen portal at step 4** (residency) and from the *AI eligibility pre-assessment* panel (child-benefit) via APIM `POST /eligibility-checks/assessments` — citizen sees the recommendation badge, confidence %, rule-by-rule evidence (✓/✗ per rule), missing-evidence list, citizen notice, caseworker summary BEFORE consenting. The verdict travels in the submit payload (`payload.eligibilityPreflight`) so the LA records it on `udcsp_application` without re-running. The LA still calls the agent for the AI Act art. 14 audit registry (dual-call by design). Caseworker disposes via the model-driven Power App (above). **Cross-device persistence**: APIM `GET /citizen-applications/` operation policy `operations/get-citizen-applications-list.xml` extracts `preferred_username`/`email`/`emails`/`upn` from the External ID JWT and queries Dataverse `tasks` filtered by that UPN — citizens signing in on a fresh device see their cases re-hydrated from the server (no longer dependent on `localStorage` cache).    | LA-deployed body shape currently writes `description: "citizenUpn: <upn> | text: …"` on the `tasks` activity entity; the new operation policy parses that. When the canonical `udcsp_application` custom table is authored, swap the OData query in the operation policy for `udcsp_applications?$filter=udcsp_citizenupn eq '<upn>'` (column already mapped in `services/logic-apps/workflows/application-intake/workflow.json` line 168). No Confidential Ledger entry written for caseworker overrides yet; `udcsp_caseworker_decision` Dataverse table scaffolded but not yet persisted via a LA callback. |
| 7  | Hans the DPO audits a 6-month-old AI decision             | 🟡    | GDPR Art. 17 erasure stub `POST /gdpr/erasure-request` returns Priva certificate; SPA wipes local cache.  | Real Priva DSR connector pending E5 licence; Purview lineage endpoint still `placeholder.local`; no DPO console.              |
| 8  | Prompt-injection attempt is contained & investigated      | 🟡    | Foundry Content Safety filters enabled by default; APIM rate-limits per channel actor; Sentinel deployed. | No red-team scenario rehearsed; no Sentinel hunting query published; no incident-response runbook proven.                     |
| 9  | CIO per-country, per-language outcomes & 47-portal sunset | 🔴    | Power BI Premium capacity + Fabric workspace provisioned.                                                 | No published report; CSAT not captured per language; sunset roadmap dashboard not built.                                      |
| 10 | DevOps stands up the platform from a clean tenant         | 🟡    | 25 install phases scripted in `scripts/install/Install-UDCSP.ps1`; recently extended for D3 lake wiring + per-op policies + GDPR API. | Not re-run on a clean tenant since the recent installer changes (commits `4e32a59`, `00e8ac1`); needs a one-shot validation. |

**The only piece played live recently is Demo 3 (Maria · DK · PL · Windows Narrator)** — chat sub-component of Demo 1 has been demoed before but the full DK→SE handoff has never been played end-to-end. Everything above the 🟢 line is build-verified but awaits a recorded walk-through.

The remainder of this document tracks the **Demo-3 (Maria) gap** in detail because it is the next demo we expect to play, and adds a **Demo-1 (Anna · DK→SE) backlog** below since it is the flagship and the next one we will harden.

## Demo 1 (Anna · DK → SE) — current state

> Source narrative: [`docs/biz/uses.md` § Demo 1](../biz/uses.md#-demo-1--anna-moves-from-copenhagen-to-stockholm-flagship). Self-rating: ~30–40 % complete. The front door (UI, identity, AI agents, APIM router copy) exists. The actual cross-border orchestration, the SE landing, and the notification loop are stubs.

### What works today (✅)

- **DK / SE / NO sign-in** via External ID — three real CIAM tenants on `udcspdk.ciamlogin.com`, `udcspse.ciamlogin.com`, `udcspno.ciamlogin.com`.
- **`/apply/residency` wizard** — 3 steps (move details → documents → review & submit), localised in the 12 supported languages, accessible (WCAG 2.1 AA), with destination + move-date validation gating step 1.
- **Eligibility Foundry-driven** pre-submit (recommendation + confidence + rule-by-rule + missing evidence + citizen notice + caseworker summary), verdict embedded in `payload.eligibilityPreflight`.
- **POST /citizen-applications/** → LA `application-intake` → Dataverse `tasks` (description truncated server-side to 1900 chars — workaround `c2f44e8`).
- **My Cases cross-device** — APIM `GET /citizen-applications/` op-policy reads Dataverse filtered by `citizenUpn`, APIM MI has Systemadministrator role to read tasks owned by the LA MI; API-level cache removed so reads are real-time.
- **Case Detail** — SPA 3-tier description parser recovers `documentBlobUrl`, `extractedFields`, `eligibilityPreflight` even when the JSON was truncated mid-string. Redesigned hero + workflow timeline (Document Extractor shows `<filename> · N fields extracted`) + Eligibility section (rules, missing, notice, summary) + document attached + extracted fields.
- **Remove** — DELETE op-policy cascades Dataverse row + uploaded blob with ownership guard.
- **APIM `agent-topic-router`** system prompt teaches the model the residency-transfer copy for DK/SE/NO and the cross-border references (Info Norden, Øresunddirekt, Grensetjänsten).
- **Logic App `cross-border-residency`** workflow scaffold deployed: Service Bus trigger on queue `cross-border-coordination`, parameters for `aiActRegistryId`, `eidasValidationEndpoint`, `dkResidencyFacadeEndpoint`, `d365CasesEndpoint`, `acsNotificationEndpoint`, App Insights `traceparent` propagation.
- **Foundry agents** Classifier, Document Extractor, Eligibility Pre-Assessor, Translator already built and invoked from the DK application-intake LA (D3).
- **Governance assets**: DPIA `dpia-eligibility-model.md`, Purview DLP `block-cross-border-cpr-without-consent`, sensitivity label `Restricted-Cross-Border`, AI Act registry stub.
- **Cross-country flag UI** in the header; per-country tenant gating on `/login`.

> 📊 **Self-rating bumped to ~70 % of the happy-path Demo 1 jouable live** — the citizen-side single-country rail is fully wired end-to-end (sign-in → wizard → eligibility AI → submit → My Cases re-hydrated cross-device → detail riche → Remove cascade). The **cross-border fan-out + SE landing + notification loop** remains the missing third.

### 🛑 Hard blocker — pending D365 Customer Service installation

> User is installing D365 Customer Service now (per-country envs). Resume Demo 1 hardening once the new envs exist. Until then, every cross-border item below is **blocked** — the SE landing has nowhere to land.

**Resume sequence after D365 Customer Service is installed:**

1. **Provision the DK/SE/NO D365 Customer Service envs** (per-country, NOT the shared `org939d8f07`). Note the new org URLs — they will become the new values for `d365-dataverse-url` named-values per APIM instance.
2. **Re-point the LA `application-intake`** from `…/api/data/v9.2/tasks` to `…/api/data/v9.2/udcsp_applications`. The workflow.json source-of-truth already maps every column (`services/logic-apps/workflows/application-intake/workflow.json` lines 156-220); a clean redeploy makes the legacy `tasks` write disappear and **eliminates the 2000-char truncation entirely** — the SPA's `descriptionParser.ts` becomes a legacy compatibility shim for old `tasks` rows.
3. **Update APIM op-policies** `GET /citizen-applications/` and `DELETE /{id}` to query `udcsp_applications?$filter=udcsp_citizenupn eq '<upn>'` instead of `tasks?$filter=contains(description,…)`. Also swap the field mapping in the GET-list body: `id=udcsp_applicationid`, `title=udcsp_displaytitle`, etc. The Document Extractor / Eligibility / DocumentBlobUrl sections will then come from dedicated columns instead of a parsed JSON blob.
4. **Bootstrap `udcsp_application` custom table on each new env** via `apps/powerapps/caseworker/bootstrap-udcsp-application.ps1` (idempotent; auto-detects base LCID since commit `22fa6cd`).
5. **Import the model-driven caseworker app** (`apps/d365/solutions/UDCSP_Core` via `pac solution import --publish-changes`) on the SE env first (it carries the SLA timer + queues).
6. **Cross-border submission path** — re-route Apply Residency from single-country POST to enqueue on `cross-border-coordination` Service Bus when destination ≠ origin (front-end + APIM op + LA trigger).
7. **eIDAS-bridge HTTP action** — replace `eidasValidationEndpoint` placeholder with a real validator (or a clearly-labeled mock that returns `eIDAS High` for the demo); produce a signed-claims JWT envelope so DK PII never crosses the border in the clear.
8. **DK → SE handoff in the LA `cross-border-residency`** — implement `Call_DK_residency_facade → Build_signed_claims → Post_to_SE_D365_cases` end-to-end against the new SE env; surface the resulting case ID back to APIM.
9. **Translator agent on outbound** — call `udcsp-translator` in the LA to produce SV body + EN summary.
10. **ACS push + email notification** — implement `Send_notification` HTTP action against ACS; produce templates `residency-approved.sv-SE.html` and `residency-approved.en.html`.
11. **Microsoft Entra Verified ID** — provision issuer, define `NordicResidencyCredential` schema, issue from the LA after caseworker approval.
12. **SE portal auto-onboarding** — accept the Verified ID at `udcspse.ciamlogin.com` via External ID's Verified ID custom-policy hook so Anna lands authenticated without re-registering.
13. **Foundry trace ID on Case Detail** — already capture `traceparent`; render a copyable trace link in the workflow timeline.
14. **D365 SLA timer + Power BI median-4d KPI** — configure the SLA on the SE Customer Service env once it's up.
15. **Cross-border consent enforcement** — gate the cross-border submission on `consent_cross_border = true` (toggle exists on `/consent` but is not checked yet).
16. **CSAT post-completion survey** + Fabric ingest for the +38 % satisfaction KPI.
17. **Recorded live walk-through** — once 1–9 are wired, play Anna DK → SE on the live tenant, capture screen + Foundry trace + LA run history; promote row 1 to 🟢.

### What is missing to play the demo end-to-end (🔴 ordered backlog · legacy single-rail view)

Kept for reference — the per-item detail above supersedes this list once the D365 Customer Service envs are live.

1. **Once-Only pre-fill** from DK CPR / Folkeregister into step 1 of the wizard (today Anna re-keys her name, address, employer). Needs a `dk-cpr-facade` Function/HTTP endpoint reading from External ID claims + a stub CPR dataset.
2. **Cross-border submission path** — re-route Apply Residency from `POST /citizen-applications/` (single-country) to **enqueue on `cross-border-coordination` Service Bus** when destination ≠ origin. Front-end change + APIM op + LA trigger.
3. **eIDAS-bridge HTTP action** — replace `eidasValidationEndpoint` placeholder with a real validator (or a clearly-labeled mock that returns `eIDAS High` for the demo); produce a **signed-claims JWT** envelope so DK PII never crosses the border in the clear.
4. **DK → SE handoff in the LA** — implement the `Call_DK_residency_facade → Build_signed_claims → Post_to_SE_D365_cases` chain end-to-end against the real (or stub) endpoints; surface the resulting case ID back to APIM.
5. **SE D365 instance / queue / SLA timer** — provision a SE Customer Service queue (or stub it on the same DK org with a `country='SE'` view) so the case actually lands; configure the 4-day SLA. Caseworker UI shares the wider D5/D7 backlog; until then a Power Apps interim is acceptable.
6. **Translator agent invocation on outbound** — call the Translator agent in the LA to produce the SV body + EN summary for the notification.
7. **ACS push + email notification** — implement `Send_notification` HTTP action against ACS; produce templates `residency-approved.sv-SE.html` and `residency-approved.en.html`.
8. **Microsoft Entra Verified ID** — provision a Verified ID issuer on the platform tenant, define a `NordicResidencyCredential` schema, issue from the LA after caseworker approval.
9. **SE portal auto-onboarding** — accept the Verified ID at `udcspse.ciamlogin.com` via External ID's Verified ID custom-policy hook so Anna lands authenticated without re-registering.
10. **Foundry trace ID on `My Cases` / `Case detail`** — already capture `traceparent`; render a copyable trace link in the case detail timeline so the demo can end on "open the Foundry trace, every prompt is auditable".
11. **D365 SLA timer + Power BI median-4d KPI** — configure the SLA in D365 once the SE queue is up, build a Power BI tile fed by the Fabric gold layer.
12. **Cross-border consent enforcement** — the toggle exists on `/consent` but is not actually checked by the residency LA; gate the cross-border submission on `consent_cross_border = true`.
13. **CSAT post-completion survey** — emit a 1-question rating after notification delivery; capture in Fabric for the +38 % satisfaction KPI.
14. **Recorded live walk-through** — once 1–9 are wired, play Anna DK → SE on the live tenant, capture screen + Foundry trace + LA run history; promote row 1 to 🟢.

### Reasonable order of attack

A → 1, 2, 3, 4 (the cross-border submission rail, Anna's side) ·
B → 5, 6, 7 (the SE landing and the notification loop) ·
C → 8, 9 (Verified ID + auto-onboarding, the showcase finish) ·
D → 10, 11, 12, 13 (audit, KPI, governance polish) ·
E → 14 (record the walk-through, flip 🟢).

A + B together unblock a credible MVP walk-through (Anna submits → SE caseworker approves → Anna receives notification) without Verified ID. C is the marquee finale and adds 2–3 days on top.

## What I can show right now (no further work)

1. Architecture & navigation: home, `/demos`, persona panel, footer.
2. **D3 DK auth path**: pick Danmark → Sign in / Create account → CIAM hosted page on `udcspdk.ciamlogin.com` → return to portal authenticated.
3. Multi-tenant gating: ✓/⚠ markers per country card on `/login` show governance posture.

## How to test D3 end-to-end on the portal

1. Open https://udcsp.fredgis.com in an **InPrivate / Incognito** window (forces a fresh token).
2. On `/login`, click the **Danmark 🇩🇰** card → **Create account** (first run) or **Sign in**.
3. You land on `udcspdk.ciamlogin.com` hosted page → sign up with any email + OTP, or sign in with an existing local user. Accept the consent prompt the first time.
4. You're redirected to the portal authenticated. Header shows `Hi {firstName} 🇩🇰`.
5. Go to **Apply for Child Benefit** (or `/apply/child-benefit`). Fill the form (child name, DOB, etc.) and **Submit**.
   - Expect a green confirmation toast with a `caseId` (`UDCSP-DK-…`).
6. Open **My cases** (`/my-cases`). The new case appears in the list with status **Open** within ~10 s.
7. (Optional verification — Azure portal)
   - **Logic App** `udcsp-dk-dev-application-intake` → *Runs history*: latest run = ✅ Succeeded, all 3 Foundry agent actions green, `Create_D365_case` returns 204.
   - **Dataverse** `https://org939d8f07.crm4.dynamics.com` → *Advanced find* on **Tasks** filtered by `Subject begins with [UDCSP-` → new row present.

If step 5 returns 401 → token expired, sign out + sign in again.
If step 6 is empty → check APIM trace on `GET /case-management` for the Dataverse error.

## Unblock backlog (in suggested order)

1. **APIM**
   - Replace `foundry-topic-router-agent-endpoint` placeholder with the real Foundry agent endpoint.
   - Add CORS policy allowing `https://udcsp.fredgis.com` (and a `*.azurestaticapps.net` preview pattern for PR slots).
   - **Unblocks**: D1 chat, in-app chat for D3.
2. **App registrations on SE + NO** (5 min each, follow `installation.md` POST CONFIGURATION steps 1-3).
   - Set `VITE_EXTERNAL_ID_CLIENT_ID_SE` and `VITE_EXTERNAL_ID_CLIENT_ID_NO` in `apps/web/.env`, rebuild + deploy.
   - **Unblocks**: D2, D3-SE.
3. **APIM `/cases` route + D365 bridge** (read view of cases by UPN).
   - **Unblocks**: D4.
4. **Voice runtime** (`apps/voice/call-automation`): ACS event subscription + warm transfer policy on agent-topic-router.
   - **Unblocks**: D5, then D8.
5. **Consent ledger** service + storage account.
   - **Unblocks**: D6.
6. **Back-office / M365 connector / Purview / Event Grid** for D7, D9, D10.

## Recent commits relevant to this tracker

- **Today (Foundry v1 migration)** — Deleted 7 classic assistants. Rewrote `Import-FoundryAgent.ps1` to call new Agents v1 API (`/agents` with `kind: prompt`, no API key, Entra-only auth). Recreated all 7 agents via the new API; eligibility & caseworker-helper bumped to v2 after switching from `gpt-5.5` (no quota) to `gpt-5.4`. Deployed model `gpt-5.4` on `udcspai`. Updated `architecture.md` Foundry section to reflect the new identity model.
- **Today (Option B wiring, see commit log)** — Foundry: gpt-5.4-mini deployed + 7 assistants created on `udcspai/udcsp` project. APIM DK named-values filled (logicapp callback, foundry endpoints, d365 url, OIDC config, audience, portal-origin). Global CORS policy on `udcsp-dk-prod-apim`. Subscription-key disabled on all 11 APIs. Web `apiFetch` acquires bearer for `api://<dk-clientId>/access_as_user` per current country. Apply Child Benefit page now POSTs and shows correlationId.
- `2dfa7e5` — CIAM authority fix (drop `/SignUpSignIn` from path).
- `c59fb25` — Per-country `VITE_EXTERNAL_ID_CLIENT_ID_{DK,SE,NO}` + correct PCA per redirect.
- `bbe61d7` — POST CONFIGURATION section in `installation.md` + UserBadge "Sign in" without flag.
- `efb22e6` — AuthGate, UserBadge, DemosIndexPage, identity-aware ChatWidget, MyCases empty-state.
- `35a93f7` — Country picker on `/login`.

## Foundry agents (DK/SE/NO — same project, **new Agents v1 API**)

> ⚠️ **Migration done** — All 7 agents were originally created as **classic Assistants** (Assistants v1 API on `/assistants`). The Foundry portal flagged them as legacy with the message _"Classic agents — Assistants are not yet supported, save as a new agent powered by the updated API"_. We deleted the 7 classic assistants and recreated them using the **new Agents v1 API** (`/agents`, `kind: prompt`, name+version identity, Entra-only auth, no API key). The importer `foundry/scripts/Import-FoundryAgent.ps1` was rewritten accordingly — see commit log.

Project endpoint: `https://udcspai.services.ai.azure.com/api/projects/udcsp` · API version: `v1`

| Agent | Identity (name) | Latest version | Model deployment |
|---|---|---|---|
| Classifier | `udcsp-classifier` | `:1` | `gpt-5.4-mini` |
| Eligibility | `udcsp-eligibility` | `:2` | `gpt-5.4` (was `gpt-5.5`, no quota in `swedencentral`) |
| Document extractor | `udcsp-doc-extractor` | `:1` | `gpt-5.4-mini` |
| Citizen assistant | `udcsp-citizen-assistant` | `:1` | `gpt-5.4` |
| Topic router | `topic-router` | `:1` | `gpt-5.4` |
| Caseworker helper | `udcsp-caseworker-helper` | `:2` | `gpt-5.4` (was `gpt-5.5`, no quota) |
| Translator | `udcsp-translator` | `:1` | `gpt-5.4` |

Model deployments on `udcspai`: `gpt-5.4-mini` and `gpt-5.4` (both GlobalStandard, 100 k TPM). `gpt-5.5` could not be deployed (zero quota in this region as of today).

**No more `asst_*` IDs.** Agents are referenced by `<name>` and optionally `<name>:<version>`. Update `foundry-*-agent-endpoint` named values in APIM to use the new format (e.g. `https://udcspai.services.ai.azure.com/api/projects/udcsp|udcsp-classifier`) — done.

## Demo 3 (Maria · DK · PL · Windows Narrator) — current state

Reference script: `docs/biz/uses.md` Demo 3 (Maria Kowalska, Windows Narrator, Polish UI in Denmark).

Everything required by the script is shipped. The DK / SE / NO code paths are identical — pick any country profile and play the same script.

| Script element | State |
|---|:-:|
| External ID sign-in (DK · SE · NO tenants) | 🟢 |
| Polish UI (`pl.json`, full HomePage + footer + Apply forms + Compliance + Login + Cases + Consent + Demos translated) | 🟢 |
| axe-core CI gate (WCAG 2.1 AA, fails on serious / critical) | 🟢 `.github/workflows/web-axe.yml` |
| Keyboard-only navigation + landmarks + visible focus | 🟢 |
| Site-wide route-change announcer + cookie-banner a11y fix | 🟢 `apps/web/src/components/RouteAnnouncer.tsx` |
| Citizen Assistant (consent-gated contextual help) | 🟢 |
| Document Extractor on lease / payslip (MI-proxy upload to country lake) | 🟢 |
| Translator agent in the LA (PL → DA · SV · NB for caseworker) | 🟢 `Call_translator_to_caseworker_locale` |
| Eligibility reasoning visible to citizen | 🟢 |
| Submit → country D365 queue (DK / SE / NO) | 🟢 LA `Create_D365_case` writes to `tasks` |
| Confirmation: estimated decision date + tracking deep link | 🟢 |
| GDPR Art. 17 erasure | 🟢 stub certificate; real Priva connector pending |
| Live walk-through with Windows Narrator recorded | 🟢 |

**Demo flipped to 🟢 once the live walk-through with Windows Narrator on Edge (Polish UI) was recorded.**

### How to test Demo 3 with Windows Narrator (10 min)

Windows Narrator is the screen reader built into Windows 10/11. It speaks aloud what is on the screen and lets you navigate the page with the keyboard. No installation needed — it is part of Windows.

1. **Start Narrator** — press `Windows + Ctrl + Enter`. The same shortcut stops it. (Alternative: Settings → Accessibility → Narrator → toggle on.)
2. **(Optional) Add the Polish voice** — Settings → Time & Language → Language → Add a language → Polish → Speech. Then Settings → Accessibility → Narrator → Voice = Polish (Paulina or Zofia).
3. **Open the portal** — https://udcsp.fredgis.com (Edge or any Chromium browser).
4. **Switch the UI to Polish** — language switcher in the top-right header → "Polski". Narrator now reads the entire page in Polish.
5. **Sign in as a Danish resident** — country card *Danmark* → *Sign in / Create account* → CIAM hosted page → return.
6. **Run the apply flow** — Tab to *"Apply for child benefit"*, Enter → upload `sample_payslip_maria_kowalska.pdf` → confirm extracted fields → submit. Useful Narrator shortcuts: `Caps Lock + H` jump heading, `Caps Lock + F` jump form field, `Caps Lock + K` jump link, `Caps Lock + Space` toggle browse / focus mode.
7. **What you should hear in Polish**: page title, every form label, the AI-disclosure banner, the document-extractor result card, the eligibility reasoning, the confirmation card and the case-reference number. Route changes are announced by the site-wide `RouteAnnouncer`.
8. **Verify the AI / data path** — Azure portal → Logic App `udcsp-dk-dev-application-intake` → *Runs history*: latest run = ✅ *Succeeded*; the new `Call_translator_to_caseworker_locale` step is green; `Create_D365_case` returns 204. Dataverse (`https://org939d8f07.crm4.dynamics.com`) → *Tasks* → new row with subject `[UDCSP-DK] …`.
9. **Trigger the axe-core CI run** — push any change under `apps/web/**` (or run the workflow manually from the *Actions* tab → *web-axe* → *Run workflow*). Confirm 0 serious + 0 critical violations across `/`, `/login`, `/demos`, `/consent`.

The same flow works with NVDA, JAWS or VoiceOver — only the modifier key differs. The accessibility implementation is screen-reader agnostic.

## D3 wiring decisions (resolved 2026-05-13)

1. **DK SPA app reg — `access_as_user` scope** ✅ exposed + self-pre-authorised. See `installation.md` Step 3.5.

2. **Logic App agent invocations** ✅ Resolved with **pattern (a) hybrid**: agent `instructions` and `model` are stored as workflow parameters (auto-synced from `foundry/agents/*/system-prompt.md` + `agent.yaml`) and the Logic App POSTs directly to `https://udcspai.services.ai.azure.com/api/projects/udcsp/openai/v1/responses` with MI auth (audience `https://ai.azure.com`). No separate wrapper Function or APIM op needed for the LA path. APIM agent-* APIs (still configured for the SPA-facing chat path) use the same pattern with named values.

3. **D365 case write** ✅ Logic App system-assigned MI granted **System Customizer + Basic User** in Dataverse (Application User with `applicationid = 8596ea8e-…`). HTTP action posts to `/api/data/v9.2/tasks` (NOT `/incidents` — Customer Service is not installed in `org939d8f07`). Body shape: `{subject:"[UDCSP-DK] <topic>", description:"citizenUpn: … | text: …", prioritycode:1}`.

4. **APIM `citizen-applications` POST** ✅ policy on `post-citizen-applications-submit` decodes the bearer JWT inline, extracts `preferred_username`, calls the LA callback URL (stored as secret named value `logicapp-intake-dk-callback`), returns `202 {correlationId, status, laStatus}`.

5. **APIM `case-management` GET/POST** ✅ both ops have policies that authenticate to Dataverse with APIM system MI (also Application User in `org939d8f07`, same role-grants). GET returns `tasks` filtered by `startswith(subject,'[UDCSP-')` — `MyCasesPage` parses the OData envelope and maps to its `Case` shape.

6. **APIM `citizen-applications` DELETE** ✅ (`operations/delete-citizen-applications-by-id.xml`, commit `db29abb`) — `MyCasesPage` Remove button now calls `DELETE /citizen-applications/{activityid}` end-to-end. Policy: validates External ID JWT → extracts `preferred_username`/`email`/`emails`/`upn` (`citizenUpn`) → GETs the `task` row → checks `description` contains `citizenUpn: <caller>` (IDOR guard, returns 403 if not owner; 404 if row gone) → parses the JSON tail of `description` (after `| text: `) to extract `documentBlobUrl` → if present, fires a blob `DELETE` against `udcspdkprodlake/citizen-uploads/...` using APIM MI (`Storage Blob Data Contributor` granted in `Install-Apim.psm1` line 258, `x-ms-version: 2021-06-08`, `ignore-error="true"` so a missing/old blob doesn't block the row deletion) → DELETEs the Dataverse row (204/200/404 → 204; else 502 with the upstream body for triage). Companion SPA fix (commit `3ad73f5`): `MyCasesPage` no longer merges remote+local — when the back-end responds, it shows remote rows only (the prior merge produced two cards per case because remote ids = `activityid` GUID and local cache ids = `correlationId` returned by POST, which never collide; clicking the local card sent a non-existent GUID to the DELETE op and the row stayed on Dataverse). Local cache is now only the offline fallback when APIM is unreachable. Cascade verified end-to-end: Dataverse `task` row gone + uploaded PDF removed from `udcspdkprodlake`. Install script auto-deploys this on a fresh env: `openapi.yaml` defines the `DELETE /{applicationId}` op (so `az apim api import` creates it), and `Install-Apim.psm1` lines 184-207 PUT the operation policy from `operations/*.xml` — no manual step.

## Caseworker UI strategy (D7)

Today the citizen-side LA writes to the `task` activity entity in `org939d8f07` (UDCSP system tenant) — caseworker identity is therefore an Entra user in the **system tenant**, not in any of the per-country External ID tenants. That separation is intentional: caseworkers operate on cases from any country, while citizens authenticate through their country's CIAM.

Two paths exist:

1. **Power Apps Model-Driven app on `task`** — buildable in ~30 min today. Pros: unblocks D7 immediately, uses the rows the LAs are already writing, no extra licence. Cons: `task` is a generic activity (no `gps_citizencountry`, no `gps_aiconfidence`) so the caseworker view is plain.
2. **Wait for D365 Customer Service licence + migrate to `incident`** — ~1-2 days once the licence lands. Pros: native case management UI (queues, SLA, knowledge base, omni-channel), proper case schema, out-of-the-box dashboards. Cons: blocked on procurement.

**Recommendation**: build the Power Apps shell now (just enough to demo D7 routing + AI confidence overlay) and migrate when the licence lands. The migration is well documented under § "Reminder — when D365 Customer Service licence is acquired" — only the LA action `Create_D365_case` and the APIM `case-management` policies need to flip from `tasks` to `incidents`. The Power Apps view can be deleted at that point in favour of the native incident model-driven app.

## 🔔 Reminder — when D365 Customer Service licence is acquired

Today the demo writes cases to the generic `task` activity entity (no `incident` table in this env). Once Customer Service is installed, swap back:

1. **Logic App `udcsp-{c}-dev-application-intake` → `Create_D365_case`**
   - URL: `…/api/data/v9.2/tasks` → `…/api/data/v9.2/incidents`
   - Body: `{subject, description, prioritycode}` → `{title, description, caseorigincode:3, customerid_contact@odata.bind:"/contacts(<guid>)"}`
   - Param `d365CasesEndpoint` value updated accordingly.

2. **APIM `case-management` policies**
   - `post-case-management-cases`: `rewrite-uri /tasks` → `/incidents`; rebuild body to incident schema.
   - `get-case-management-cases`: `rewrite-uri /tasks` → `/incidents`; replace `$filter=startswith(subject,'[UDCSP-')` with per-citizen filter `_customerid_value eq <contactId>` (resolved from JWT `preferred_username`); `$select` → `incidentid,title,ticketnumber,statecode,statuscode,createdon,prioritycode`.

3. **SPA `apps/web/src/pages/MyCasesPage.tsx`**
   - Field map: `activityid` → `incidentid`, `subject` → `title`, surface `ticketnumber`.
   - `STATE_LABEL` → `{0:'Active', 1:'Resolved', 2:'Cancelled'}`.

4. Apply the same on SE + NO once their Logic Apps are wired.

## Maintenance rule

When you finish wiring a demo, edit only its row (state + columns), bump the bundle hash at the top, append a one-line entry to "Recent commits", and do not rewrite the rest of the file.
