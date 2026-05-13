# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox.
Update one row at a time as we wire each demo.

- **Web SWA** — https://icy-dune-01c23d903.7.azurestaticapps.net
- **Last bundle deployed** — `option-B-D3-wiring` (Foundry agents created + APIM DK named-values + CORS + auth bearer in MyCases & Apply)

Legend: 🟢 fully E2E · 🟡 partial / UI-only · 🔴 not wired

## Demo status

| #  | Demo                                  | State | What works today                                                                 | What blocks full E2E                                                                 |
|----|---------------------------------------|:-----:|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| D1 | Citizen public chat                   | 🟡    | Widget renders, anonymous greeting, sends message                                 | APIM `agent-topic-router` backend = `placeholder.local`, no SWA CORS                 |
| D2 | NO citizen sign-in                    | 🔴    | Country card shows ⚠                                                              | App reg on `udcspno.onmicrosoft.com` not created (no `VITE_EXTERNAL_ID_CLIENT_ID_NO`) |
| D3 | DK citizen sign-up + sign-in          | 🟡    | Country picker → CIAM hosted page → callback → badge `Hi {first} 🇩🇰`. Apply form POSTs to APIM `citizen-applications`, CORS OK, JWT validation active. | Need: (1) Expose `access_as_user` scope on DK SPA app reg + grant admin consent; (2) Logic App workflow uses `When_HTTP_request_received` ✓ but downstream Foundry calls are plain HTTP-POST while agents need assistants v2 ceremony (thread→message→run→poll); (3) D365 connection in Logic App for `Create_D365_case`. |
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

- **Today (Option B wiring, see commit log)** — Foundry: gpt-5.4-mini deployed + 7 assistants created on `udcspai/udcsp` project. APIM DK named-values filled (logicapp callback, foundry endpoints, d365 url, OIDC config, audience, portal-origin). Global CORS policy on `udcsp-dk-prod-apim`. Subscription-key disabled on all 11 APIs. Web `apiFetch` acquires bearer for `api://<dk-clientId>/access_as_user` per current country. Apply Child Benefit page now POSTs and shows correlationId.
- `2dfa7e5` — CIAM authority fix (drop `/SignUpSignIn` from path).
- `c59fb25` — Per-country `VITE_EXTERNAL_ID_CLIENT_ID_{DK,SE,NO}` + correct PCA per redirect.
- `bbe61d7` — POST CONFIGURATION section in `installation.md` + UserBadge "Sign in" without flag.
- `efb22e6` — AuthGate, UserBadge, DemosIndexPage, identity-aware ChatWidget, MyCases empty-state.
- `35a93f7` — Country picker on `/login`.

## Foundry assistants (DK/SE/NO — same project)

| Agent | Assistant ID |
|---|---|
| classifier | `asst_3SWiMWRyKZqjwUkgKYQyl7QF` |
| eligibility | `asst_RMWVNzumtr5adX6uDQSYhbnW` |
| doc-extractor | `asst_ZsWlz5yIIz0tVeUYy92pxSYn` |
| citizen-assistant | `asst_l6aogVJaMQ5oaMCN660uBuN1` |
| topic-router | `asst_E4PMNIg1yyOO4uS733GilH9V` |
| caseworker-helper | `asst_k4B3ElxnUoQWjc5Yf3EgvZKj` |
| translator | `asst_AANWllHeEf8qjy9fmPVLUHFC` |

Project endpoint: `https://udcspai.services.ai.azure.com/api/projects/udcsp` · Model deployment: `gpt-5.4-mini` (GlobalStandard, 100k TPM).

## Known gaps to push D3 to 🟢

1. **DK SPA app reg** (portal action): Expose API → add scope `access_as_user` → add itself as authorized client → admin consent. Without this `acquireTokenSilent` returns null and APIM rejects with 401.
2. **Logic App agent invocations**: each `Call_X_agent` action posts JSON to a single URL. Foundry assistants need 4 calls (create thread, post message, run, poll). Either:
   - (a) Add 4 Logic App actions per agent, or
   - (b) Wrap each agent in a small Function/APIM operation that exposes a synchronous POST.
3. **D365 connection**: `Create_D365_case` action needs a Dataverse API connection (or service principal + bearer to `https://org939d8f07.crm4.dynamics.com/api/data/v9.2`). The `d365-dataverse-url` named value is set but the Logic App still uses the old HTTP action with no auth.
4. **APIM `citizen-applications` GET path**: currently routes to the Logic App POST URL. We need a separate route that queries D365 for cases by UPN claim. Options: add a new APIM operation backed by Dataverse OData with policy `set-backend-service` + `set-header Authorization`, or a Function.

## Maintenance rule

When you finish wiring a demo, edit only its row (state + columns), bump the bundle hash at the top, append a one-line entry to "Recent commits", and do not rewrite the rest of the file.
