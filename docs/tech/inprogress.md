# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox.
Update one row at a time as we wire each demo.

- **Web SWA** — https://icy-dune-01c23d903.7.azurestaticapps.net
- **Last bundle deployed** — `option-B-D3-wiring + foundry-v1-migration` (classic assistants deleted, agents recreated via new Agents v1 API; importer rewritten)

Legend: 🟢 fully E2E · 🟡 partial / UI-only · 🔴 not wired

## Demo status

| #  | Demo                                  | State | What works today                                                                 | What blocks full E2E                                                                 |
|----|---------------------------------------|:-----:|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| D1 | Citizen public chat                   | 🟡    | Widget renders, anonymous greeting, sends message                                 | APIM `agent-topic-router` backend = `placeholder.local`, no SWA CORS                 |
| D2 | NO citizen sign-in                    | 🔴    | Country card shows ⚠                                                              | App reg on `udcspno.onmicrosoft.com` not created (no `VITE_EXTERNAL_ID_CLIENT_ID_NO`) |
| D3 | DK citizen sign-up + sign-in          | 🟡    | Country picker → CIAM hosted page → callback → badge `Hi {first} 🇩🇰`. Apply form POSTs to APIM `citizen-applications`, CORS OK, JWT validation active. | Need: (1) Expose `access_as_user` scope on DK SPA app reg + grant admin consent; (2) Logic App downstream agent calls — see §"Known gaps"; (3) D365 connection in Logic App for `Create_D365_case`. |
| D3-SE | SE citizen sign-in                  | 🔴    | Country card shows ⚠                                                              | App reg on `udcspse.onmicrosoft.com` not created                                      |
| D4 | My cases                              | 🟡    | Page protected by AuthGate, fetches `${VITE_APIM_BASE_URL}/cases`, empty-state OK | APIM `/cases` route + D365 bridge missing                                             |
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

## Known gaps to push D3 to 🟢

1. **DK SPA app reg** (portal action — required, ~5 min):
   - Azure portal → Entra → App registrations → DK SPA app `2f69440c-f6c8-49f2-847f-e2f63e376102`
   - **Expose an API** → set Application ID URI → `api://2f69440c-f6c8-49f2-847f-e2f63e376102`
   - **Add a scope** → name `access_as_user`, who can consent: Admins and users, admin consent display name "Access UDCSP API as user"
   - **Add a client application** → enter the SPA's own clientId `2f69440c-…` and tick the new scope
   - **API permissions** → Add a permission → My APIs → pick the same app → delegated `access_as_user` → Grant admin consent
   - Without this, `acquireTokenSilent` returns `null` and APIM 401s with "JWT not present".

2. **Logic App agent invocations** — the `application-intake` workflow has 3 `Call_X_agent` HTTP actions that POST raw JSON to the Foundry endpoint. With the **new Agents v1 API**, agents are invoked via the OpenAI-compatible Responses API at `POST /api/projects/<project>/openai/v1/responses` with body `{ model: "<deployment>", input: "<text>", … }`. Two viable patterns:
   - **(a) Inline in the Logic App** — call `/openai/v1/responses` directly, but you lose the agent's stored `instructions`/`tools` (you'd have to re-pass them in the request → defeats the point of the agent registry).
   - **(b) Wrap each agent in an Azure Function or APIM operation that uses the Foundry SDK** — the SDK resolves agent name → version → instructions → model deployment server-side. The Logic App then calls the wrapper with `{agent: "udcsp-classifier", input: "..."}`. **Recommended.**

3. **D365 connection**: `Create_D365_case` action needs a Dataverse API connection (or service principal + bearer to `https://org939d8f07.crm4.dynamics.com/api/data/v9.2`). The `d365-dataverse-url` named value is set but the Logic App still uses the old HTTP action with no auth.

4. **APIM `citizen-applications` GET path**: currently routes to the Logic App POST URL. We need a separate route that queries D365 for cases by UPN claim. Options: add a new APIM operation backed by Dataverse OData with policy `set-backend-service` + `set-header Authorization`, or a Function.

## Maintenance rule

When you finish wiring a demo, edit only its row (state + columns), bump the bundle hash at the top, append a one-line entry to "Recent commits", and do not rewrite the rest of the file.
