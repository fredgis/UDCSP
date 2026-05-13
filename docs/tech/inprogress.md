# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox.
Update one row at a time as we wire each demo.

- **Web SWA** — https://icy-dune-01c23d903.7.azurestaticapps.net
- **Last bundle deployed** — `D3-cross-country-end-to-end` (per-country payslip storage in DK/SE/NO blob lakes via APIM MI proxy; case workflow timeline; consent enforcement on chat + apply pages; GDPR Art. 17 erasure stub; My Cases progress bar)

Legend: 🟢 fully E2E · 🟡 partial / UI-only · 🔴 not wired

## Demo status

**Status legend** — 🟢 played live end-to-end · 🟡 built & wired, not yet played live · 🔴 not built / placeholders only.

| #  | Demo                                  | State | What works today                                                                 | What blocks full E2E                                                                 |
|----|---------------------------------------|:-----:|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| D1 | Citizen public chat                   | 🟢    | APIM `agent-topic-router` (DK · SE · NO) calls Foundry `udcsp-citizen-assistant` via MI; consent-gated by `aiAssistant`; auto-scroll on new message; CORS open. Smoked EN + DA. | — |
| D2 | NO citizen sign-in                    | 🟡    | App reg + APIM + LA + storage in NO — same code path as DK/SE. | Not yet played live; needs a Norwegian persona walk-through. |
| D3-DK | DK citizen submission              | 🟡    | Country-agnostic chain end-to-end: SPA sign-in → APIM `POST /citizen-applications` (JWT validated) → `udcsp-dk-dev-application-intake` → 4 Foundry agents → Dataverse `tasks`. **Document upload** persists to `udcspdkprodlake/citizen-uploads` via APIM MI proxy `POST /documents/upload-url`. Last 3 LA runs ✅ Succeeded. Workflow timeline rendered on `/cases/:id`. | One full live walk-through with a DK persona since the post-payslip-pivot rebuild — the smoke test (Anna Kristensen, child benefit) ran but the new MI-proxy upload + workflow-timeline UX hasn't been demoed end-to-end yet. |
| D3-SE / D3-NO | Same script, other countries | 🟡    | Symmetric backend (APIM ops, LAs Enabled, storage lakes, RBAC) provisioned identically. | Not yet played live; needs SE/NO persona run. |
| D4 | My cases                              | 🟡    | `MyCasesPage` shows progress bar `Step N/7 completed · next: …`; cancel + delete; refresh; merges `GET /case-management` with local cache. | Not yet played live; depends on D3 having run. Filter by `preferred_username` once `gps_case` ships. |
| D5 | Voice intake → warm transfer          | 🔴    | —                                                                                 | ACS Call Automation runtime not invoked, Foundry topic-router tool call disabled     |
| D6 | Consent ledger + GDPR erasure         | 🟡    | Consent toggles propagate via `udcsp:consent-changed`; `aiAssistant` hides ChatLauncher; `crossBorder`/`notifications` show banner on apply pages. **GDPR Art. 17** stub `POST /gdpr/erasure-request` returns Priva-style certificate + 30-day ETA; SPA wipes local cache. | Not yet played live. Real Priva integration deferred to E5 licence. |
| D7 | Agent assist (back-office)            | 🟡    | Caseworker-helper Foundry agent + APIM op deployed. | No caseworker UI built — see § "Caseworker UI strategy". |
| D8 | Multi-channel handoff                 | 🔴    | UI placeholders                                                                   | Depends on D5                                                                        |
| D9 | Compliance audit trail                | 🟡    | LA publishes lineage event; APIM logs traceparent. | Purview lineage endpoint still `placeholder.local`; Power BI tile not built.         |
| D10| Outage proactive notification         | 🔴    | —                                                                                 | Event Grid + Notification Hub not wired                                              |

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

The DK/SE/NO code paths are now identical — pick any country profile and play the script. The remaining gaps are **content**, not infrastructure.

| Script element | State | What's missing |
|---|:-:|---|
| External ID sign-in (DK · SE · NO tenants) | 🟢 | — |
| PL locale (ICU MessageFormat) | 🟡 EN/FR/DA | Add `pl.json` in `apps/web/src/locales/` (EN strings still satisfy axe + NVDA) |
| axe-core CI gate (zero serious WCAG 2.1 AA) | 🟡 | Add `@axe-core/cli` step in SWA build workflow |
| NVDA-friendly form (landmarks/labels/focus) | 🟢 | Manual NVDA pass on `/apply/*` recommended |
| Citizen Assistant (contextual help) | 🟢 | Consent-gated; PL contextual overrides optional |
| Document Extractor on lease/payslip | 🟢 | Upload → blob (country lake) → extractor → fields shown for confirmation |
| Translator (PL → SV for KB / caseworker) | 🟡 agent exists | Insert in LA after extractor (one HTTP action) |
| Eligibility reasoning visible to citizen | 🟢 | Confidence + decision shown on confirmation card and case detail |
| Submit → country D365 queue (DK/SE/NO) | 🟢 | LA `Create_D365_case` writes to `tasks` activity in `org939d8f07` |
| Confirmation: estimated decision date + tracking | 🟢 | Card + `/cases/:id` deep link with workflow timeline |
| GDPR Art. 17 erasure | 🟢 | Stub certificate; real Priva connector pending |
| Per-language post-submission CSAT | 🔴 | Out of scope until D6 evolves |

**Caseworker UI strategy** — see § below; not required to play the script.

## D3 wiring decisions (resolved 2026-05-13)

1. **DK SPA app reg — `access_as_user` scope** ✅ exposed + self-pre-authorised. See `installation.md` Step 3.5.

2. **Logic App agent invocations** ✅ Resolved with **pattern (a) hybrid**: agent `instructions` and `model` are stored as workflow parameters (auto-synced from `foundry/agents/*/system-prompt.md` + `agent.yaml`) and the Logic App POSTs directly to `https://udcspai.services.ai.azure.com/api/projects/udcsp/openai/v1/responses` with MI auth (audience `https://ai.azure.com`). No separate wrapper Function or APIM op needed for the LA path. APIM agent-* APIs (still configured for the SPA-facing chat path) use the same pattern with named values.

3. **D365 case write** ✅ Logic App system-assigned MI granted **System Customizer + Basic User** in Dataverse (Application User with `applicationid = 8596ea8e-…`). HTTP action posts to `/api/data/v9.2/tasks` (NOT `/incidents` — Customer Service is not installed in `org939d8f07`). Body shape: `{subject:"[UDCSP-DK] <topic>", description:"citizenUpn: … | text: …", prioritycode:1}`.

4. **APIM `citizen-applications` POST** ✅ policy on `post-citizen-applications-submit` decodes the bearer JWT inline, extracts `preferred_username`, calls the LA callback URL (stored as secret named value `logicapp-intake-dk-callback`), returns `202 {correlationId, status, laStatus}`.

5. **APIM `case-management` GET/POST** ✅ both ops have policies that authenticate to Dataverse with APIM system MI (also Application User in `org939d8f07`, same role-grants). GET returns `tasks` filtered by `startswith(subject,'[UDCSP-')` — `MyCasesPage` parses the OData envelope and maps to its `Case` shape.

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
