# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox.
Update one row at a time as we wire each demo.

- **Web SWA** — https://icy-dune-01c23d903.7.azurestaticapps.net
- **Last bundle deployed** — `2dfa7e5` (CIAM authority fix)

Legend: 🟢 fully E2E · 🟡 partial / UI-only · 🔴 not wired

## Demo status

| #  | Demo                                  | State | What works today                                                                 | What blocks full E2E                                                                 |
|----|---------------------------------------|:-----:|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| D1 | Citizen public chat                   | 🟡    | Widget renders, anonymous greeting, sends message                                 | APIM `agent-topic-router` backend = `placeholder.local`, no SWA CORS                 |
| D2 | NO citizen sign-in                    | 🔴    | Country card shows ⚠                                                              | App reg on `udcspno.onmicrosoft.com` not created (no `VITE_EXTERNAL_ID_CLIENT_ID_NO`) |
| D3 | DK citizen sign-up + sign-in          | 🟡    | Country picker → CIAM hosted page → callback → badge `Hi {first} 🇩🇰`              | No `/apply` flow because no APIM→D365 bridge yet                                      |
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

- `2dfa7e5` — CIAM authority fix (drop `/SignUpSignIn` from path).
- `c59fb25` — Per-country `VITE_EXTERNAL_ID_CLIENT_ID_{DK,SE,NO}` + correct PCA per redirect.
- `bbe61d7` — POST CONFIGURATION section in `installation.md` + UserBadge "Sign in" without flag.
- `efb22e6` — AuthGate, UserBadge, DemosIndexPage, identity-aware ChatWidget, MyCases empty-state.
- `35a93f7` — Country picker on `/login`.

## Maintenance rule

When you finish wiring a demo, edit only its row (state + columns), bump the bundle hash at the top, append a one-line entry to "Recent commits", and do not rewrite the rest of the file.
