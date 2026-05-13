# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox.
Update one row at a time as we wire each demo.

- **Web SWA** — https://icy-dune-01c23d903.7.azurestaticapps.net
- **Last bundle deployed** — `D3-end-to-end` (Logic App MI → Foundry direct + Dataverse `tasks`; APIM POST /citizen-applications wired to LA; APIM GET /case-management → Dataverse with MI)

Legend: 🟢 fully E2E · 🟡 partial / UI-only · 🔴 not wired

## Demo status

| #  | Demo                                  | State | What works today                                                                 | What blocks full E2E                                                                 |
|----|---------------------------------------|:-----:|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| D1 | Citizen public chat                   | 🟡    | Widget renders, anonymous greeting, sends message                                 | APIM `agent-topic-router` backend = `placeholder.local`, no SWA CORS                 |
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

Today's demo persists cases in the generic Dataverse `task` activity entity because `org939d8f07.crm4.dynamics.com` has **no `incident` table** (Customer Service is not installed). Once the licence is provisioned and Customer Service is installed in this environment, swap the demo back to the proper case model.

**Where to verify / install:**

| What | URL |
|---|---|
| Power Platform admin centre (envs, licences, install Customer Service) | https://admin.powerplatform.microsoft.com/environments |
| This env's detail page | https://admin.powerplatform.microsoft.com/manage/environments/4e78b019-9c4a-f111-b31f-000d3a67b66d |
| Power Apps maker (apps + solutions list) | https://make.powerapps.com (top-right env picker → select `org939d8f07`) |
| Solutions in this env | https://make.powerapps.com/environments/4e78b019-9c4a-f111-b31f-000d3a67b66d/solutions |
| Tables in this env | https://make.powerapps.com/environments/4e78b019-9c4a-f111-b31f-000d3a67b66d/entities |
| Dataverse model-driven apps for this env | https://org939d8f07.crm4.dynamics.com/main.aspx?forceUCI=1&pagetype=apps |
| Dynamics 365 home (app launcher) | https://home.dynamics.com |
| Web API root (sanity check `incidents` shows up after install) | https://org939d8f07.crm4.dynamics.com/api/data/v9.2/ |

**Install Customer Service:** Power Platform admin → *Resources → Dynamics 365 apps → Install app → Customer Service Hub* (target env `org939d8f07`). After install, `incident`, `case`, `customerservicestakeholder`, `queueitem`, etc. become available.

**Changes to revert/upgrade once `incident` is available:**

1. **Logic App `udcsp-dk-dev-application-intake`** — `Create_D365_case` action:
   - URL `…/api/data/v9.2/tasks` → `…/api/data/v9.2/incidents`
   - Body: replace `{subject, description, prioritycode}` with `{title, description, caseorigincode:3, customercontacted:false, customerid_contact@odata.bind:"/contacts(<guid>)"}` (resolve contact by `citizenUpn` first, fall back to a default demo contact).
   - Stored param `d365CasesEndpoint` → `https://org939d8f07.crm4.dynamics.com/api/data/v9.2/incidents`.

2. **APIM `case-management` policies**:
   - `post-case-management-cases`: `rewrite-uri /tasks` → `/incidents`; rebuild body to incident schema (drop the `[UDCSP-…] ` subject prefix — replaced by `caseorigincode` + `customerid`).
   - `get-case-management-cases`: `rewrite-uri /tasks` → `/incidents`; `$filter` `startswith(subject,'[UDCSP-')` → real per-citizen filter `_customerid_value eq <contactId>` (resolved from the JWT `preferred_username` claim via a `send-request` to `/contacts?$filter=emailaddress1 eq '<upn>'`); `$select` updated to `incidentid,title,ticketnumber,statecode,statuscode,createdon,prioritycode`.

3. **SPA `MyCasesPage.tsx`**:
   - Field map: `activityid` → `incidentid`; `subject` → `title`; add `ticketnumber` (the human-readable case number) to the displayed row.
   - State labels: `STATE_LABEL` for incident is `{0:'Active', 1:'Resolved', 2:'Cancelled'}`.

4. **Custom table option (preferred over OOB `incident`)** — if you want UDCSP-specific columns, create a custom `gps_case` table in a UDCSP solution with: `gps_citizenupn`, `gps_country` (DK/SE/NO option set), `gps_topic`, `gps_status`, `gps_classifierscore`, `gps_eligibilityverdict`, `gps_extracteddocs` (json), `gps_correlationid`. Then point all of the above at `/gps_cases` instead of `/incidents`. Lets us keep the demo isolated from Customer Service business rules.

5. **Documentation sync** — update `docs/tech/architecture.md` §7 (Case Management) and `docs/tech/installation.md` POST CONFIGURATION Step 7 to mention `incident` (or `gps_case`) instead of the placeholder `task`. Bump `inprogress.md` *Last bundle deployed* line.

6. **Per-country roll-out** — repeat the LA + APIM rewrites on SE (`udcsp-se-prod-apim` + `udcsp-se-dev-application-intake`) and NO (`udcsp-no-…`).

## Maintenance rule

When you finish wiring a demo, edit only its row (state + columns), bump the bundle hash at the top, append a one-line entry to "Recent commits", and do not rewrite the rest of the file.
