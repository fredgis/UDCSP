# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox.
Update one row at a time as we wire each demo.

- **Web SWA** — https://icy-dune-01c23d903.7.azurestaticapps.net
- **Last bundle deployed** — `D3-SPA-rework + chat-wired` (functional forms with stepper / file upload / reasoning panel / consent toggles; Citizen Assistant wired to Foundry topic-router via APIM MI; country flags in header)

Legend: 🟢 fully E2E · 🟡 partial / UI-only · 🔴 not wired

## Demo status

| #  | Demo                                  | State | What works today                                                                 | What blocks full E2E                                                                 |
|----|---------------------------------------|:-----:|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| D1 | Citizen public chat                   | 🟢    | APIM `agent-topic-router` rewritten to call Foundry `/openai/v1/responses` with MI; CORS open for SWA + localhost. ChatLauncher (floating 💬) for authenticated users routes to per-country APIM. | Add SE + NO once their app reg + APIM exist. |
| D2 | NO citizen sign-in                    | 🔴    | Country card shows ⚠                                                              | App reg on `udcspno.onmicrosoft.com` not created (no `VITE_EXTERNAL_ID_CLIENT_ID_NO`) |
| D3 | DK citizen sign-up + sign-in          | 🟢    | Full chain: SPA sign-in → APIM `POST /citizen-applications` (JWT validated, UPN extracted from token) → Logic App `udcsp-dk-dev-application-intake` → 3 Foundry agents (classifier / eligibility / doc-extractor) via MI on `https://ai.azure.com` → Dataverse `tasks` row created via MI. Verified end-to-end 2026-05-13 (run `08584229100…`). | Production hardening: replace `task` entity with custom `gps_case` table; add error-handling for agent JSON; persist correlationId. |
| D3-SE | SE citizen sign-in                  | 🔴    | Country card shows ⚠                                                              | App reg on `udcspse.onmicrosoft.com` not created                                      |
| D4 | My cases                              | 🟢    | `MyCasesPage` calls APIM `GET /case-management` → Dataverse OData `/tasks?$filter=startswith(subject,'[UDCSP-')`. APIM uses MI on Dataverse. Cases submitted via D3 appear here. | TODO: filter by `preferred_username` claim once `gps_case` custom table has a citizen-UPN field. |
| D5 | Voice intake → warm transfer          | 🔴    | —                                                                                 | ACS Call Automation runtime not invoked, Foundry topic-router tool call disabled     |
| D6 | Consent ledger                        | 🔴    | Route exists                                                                      | Backend service + ledger storage not wired                                            |
| D7 | Agent assist (back-office)            | 🔴    | —                                                                                 | Foundry tools, M365 connector, D365 actions pending                                   |
| D8 | Multi-channel handoff                 | 🔴    | UI placeholders                                                                   | Depends on D1 + D5                                                                    |
| D9 | Compliance audit trail                | 🔴    | —                                                                                 | Purview / log routing not enabled                                                     |
| D10| Outage proactive notification         | 🔴    | —                                                                                 | Event Grid + Notification Hub not wired                                               |

## What I can show right now (no further work)

1. Architecture & navigation: home, `/demos`, persona panel, footer.
2. **D3 DK auth path**: pick Danmark → Sign in / Create account → CIAM hosted page on `udcspdk.ciamlogin.com` → return to portal authenticated.
3. Multi-tenant gating: ✓/⚠ markers per country card on `/login` show governance posture.

## How to test D3 end-to-end on the portal

1. Open https://icy-dune-01c23d903.7.azurestaticapps.net in an **InPrivate / Incognito** window (forces a fresh token).
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
   - Add CORS policy allowing `https://icy-dune-01c23d903.7.azurestaticapps.net` (and a `*.azurestaticapps.net` preview pattern for PR slots).
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

## Demo 3 (Maria · SE · PL) — gap vs script

Reference script: `docs/biz/demos.md` Demo 3 (Maria Kowalska, NVDA, PL UI in Sweden).

| Script element | Current state | What's missing |
|---|---|---|
| SE External ID sign-in (PL → SE tenant) | 🔴 | App reg on `udcspse.onmicrosoft.com`, set `VITE_EXTERNAL_ID_CLIENT_ID_SE`, rebuild SPA |
| PL locale (ICU MessageFormat) | 🟡 EN/FR/DA only | Add `pl` bundle in `apps/web/src/locales/`, register in i18n provider |
| axe-core CI gate (zero serious WCAG 2.1 AA) | 🔴 | Add `@axe-core/cli` step in SWA build workflow, fail on serious+critical |
| NVDA-friendly form (landmarks/labels/focus) | 🟡 not audited | Run axe + manual NVDA pass on `/apply/*` |
| Citizen Assistant (PL contextual help) | 🔴 | Unblock D1 first (real APIM agent endpoint + CORS), then add PL `instructions` overlay |
| Document Extractor on PL lease | 🟡 agent exists (used by D3-DK) | Wire upload → extractor in apply form |
| Translator (PL → SV for KB / caseworker) | 🟡 agent exists, not invoked | Add Translator call in LA after extractor |
| Eligibility reasoning visible to citizen | 🟡 LA returns confidence only | Surface `reasoning` field on confirmation page |
| Submit → SE D365 queue | 🔴 | Clone D3-DK pattern: LA `udcsp-se-dev-application-intake` + APIM `POST /citizen-applications` SE policy + Application User on Dataverse SE env |
| Confirmation: estimated decision date + tracking | 🔴 | Add to `ApplyConfirmationPage` |
| Post-submission CSAT (per language) | 🔴 | Out of scope until D6 |

**Minimum slice to play the script live** (in order):
1. SE app reg + `VITE_EXTERNAL_ID_CLIENT_ID_SE` → rebuild SPA → unlocks login.
2. `pl.json` locale + lang switcher → unlocks PL UI.
3. Clone D3-DK Logic App + APIM policies for SE → unlocks submission.
4. Add reasoning panel on confirmation page → satisfies AI Act talking point.
5. axe-core CI step → satisfies "zero serious violations" claim.

D1 (Citizen Assistant in PL) and post-submit CSAT remain out of scope for the live walk-through; can be narrated.

### Demo 3 transposed to DK — what's still missing

If we re-skin the Maria script onto the DK channel (identity + submit + my-cases already 🟢):

| Script element | Gap on DK |
|---|---|
| Polish UI (or any minority lang) | No `pl` bundle in `apps/web/src/locales/` (have EN/FR/DA). Add `pl.json` or narrate in DA. |
| axe-core CI gate (zero serious WCAG 2.1 AA) | No axe step in SWA build workflow. |
| NVDA / WCAG audit on `/apply/child-benefit` | Never run. Labels, focus order, landmarks unverified. |
| Citizen Assistant contextual help in-form | D1 widget = placeholder (`agent-topic-router` backend `placeholder.local`, no CORS). |
| Document Extractor as user-facing confirmation step | Today extractor runs in LA *after* submit. Need SPA upload → direct agent call → show extracted fields for user validation. |
| Translator inside the flow | Agent exists, never invoked. Insert in LA after extractor or call from SPA on uploaded PDF. |
| Eligibility reasoning visible to citizen | LA returns `confidence` + `reasoning`, confirmation page shows neither. |
| Confirmation page enriched: estimated decision date + tracking link | Currently toast + redirect only. |
| Per-language post-submit CSAT | 0%. Out of scope until D6. |

**Minimum slice to play Demo 3 on DK live**:
1. Add `pl.json` locale + language picker (or play in DA, say "PL parity").
2. Add axe-core step in SWA workflow, fail on serious+critical.
3. NVDA pass + label/focus fixes on `ApplyChildBenefitPage`.
4. Add "Why this decision" panel on `ApplyConfirmationPage` reading the `reasoning` field already returned by the eligibility agent.
5. Enrich confirmation: estimated date (J+4) + screen-reader-friendly `/my-cases/{id}` link.

Pure blockers to narrate if time-boxed: in-form Citizen Assistant (D1), Translator in flow, CSAT.

## D3 wiring decisions (resolved 2026-05-13)

1. **DK SPA app reg — `access_as_user` scope** ✅ exposed + self-pre-authorised. See `installation.md` Step 3.5.

2. **Logic App agent invocations** ✅ Resolved with **pattern (a) hybrid**: agent `instructions` and `model` are stored as workflow parameters (auto-synced from `foundry/agents/*/system-prompt.md` + `agent.yaml`) and the Logic App POSTs directly to `https://udcspai.services.ai.azure.com/api/projects/udcsp/openai/v1/responses` with MI auth (audience `https://ai.azure.com`). No separate wrapper Function or APIM op needed for the LA path. APIM agent-* APIs (still configured for the SPA-facing chat path) use the same pattern with named values.

3. **D365 case write** ✅ Logic App system-assigned MI granted **System Customizer + Basic User** in Dataverse (Application User with `applicationid = 8596ea8e-…`). HTTP action posts to `/api/data/v9.2/tasks` (NOT `/incidents` — Customer Service is not installed in `org939d8f07`). Body shape: `{subject:"[UDCSP-DK] <topic>", description:"citizenUpn: … | text: …", prioritycode:1}`.

4. **APIM `citizen-applications` POST** ✅ policy on `post-citizen-applications-submit` decodes the bearer JWT inline, extracts `preferred_username`, calls the LA callback URL (stored as secret named value `logicapp-intake-dk-callback`), returns `202 {correlationId, status, laStatus}`.

5. **APIM `case-management` GET/POST** ✅ both ops have policies that authenticate to Dataverse with APIM system MI (also Application User in `org939d8f07`, same role-grants). GET returns `tasks` filtered by `startswith(subject,'[UDCSP-')` — `MyCasesPage` parses the OData envelope and maps to its `Case` shape.

### Production-hardening backlog (not blocking demo)
- Replace `task` activity with a custom `gps_case` table that has explicit `gps_citizenupn`, `gps_country`, `gps_topic`, `gps_status` columns; APIM GET would then filter by the user's UPN claim instead of returning all UDCSP-tagged tasks.
- Apply the same wiring on SE + NO Logic Apps + APIMs (currently DK only).
- Re-enable Purview lineage publish once `purviewLineageTopicEndpoint` is no longer `placeholder.local`.
- Add `<jwt-validate-entra>` re-check in the LA path so an attacker can't replay the LA SAS callback URL directly. Today APIM is the only entry point that knows the SAS; consider rotating it.

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
