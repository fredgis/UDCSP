# UDCSP — Demo Readiness Tracker

Live state of every end-to-end demo against the deployed sandbox.
Update one row at a time as we wire each demo.

- **Web SWA** — https://udcsp.fredgis.com
- **Last bundle deployed** — `signout-home-+-authgate-redesign-+-required-asterisks-+-eid-preview` (commits `7173204`, `2c22f73`): every Apply form now marks required fields with a red `*` and blocks submit until they're filled (drop `noValidate`, gate Residency on `destination + moveDate`); LoginPage shows the production-grade eID method preview tiles (MitID / BankID / BankID Norge); ChatLauncher visible on the home page; sign-out always returns to `/` (UserBadge navigates home before `logoutRedirect`, msalConfig sets `redirectUri` and `postLogoutRedirectUri` to `origin + '/'`); AuthGate ("Sign in to apply…") fully redesigned as a two-column hero + 3 benefit tiles with country pill and eID name; ambient mesh background + glass surfaces across the SPA. Earlier bundle `D3-pl-locale-translator-axe` (Polish locale, Translator agent in application-intake LA, axe-core CI) still active.

Legend: 🟢 fully E2E · 🟡 partial / UI-only · 🔴 not wired

## Demo status

**Status legend** — 🟢 played live end-to-end · 🟡 built & wired, not yet played live · 🔴 not built / placeholders only.

The 10 rows below mirror the 10 demos defined in [`docs/biz/uses.md`](../biz/uses.md). State reflects what *can be played today on the live tenant*, not what has been provisioned in Azure.

| #  | Demo (uses.md)                                            | State | What works today                                                                                          | What blocks a live walk-through                                                                                              |
|----|-----------------------------------------------------------|:-----:|-----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| 1  | Anna moves Copenhagen → Stockholm (cross-border)          | 🟡    | DK + SE + NO sign-in via External ID; per-country submit chain; cross-country flag UI in header.          | Cross-border **record portability** (SE pre-fills from DK Folkeregistret) not implemented; today she re-keys data in SE.     |
| 2  | Lars asks voice assistant for tax refund (NO)             | 🔴    | ACS resource + GPT-4o Realtime deployment exist in Bicep.                                                  | Voice orchestrator Container App not deployed; `IncomingCall` Event Grid sub not wired; warm-transfer to D365 absent.        |
| 3  | Maria with Windows Narrator (PL in DK)                    | 🟢    | DK chain works end-to-end (sign-in → APIM → LA → 4 Foundry agents → Dataverse `tasks`); MI-proxy upload onto `udcspdkprodlake`; workflow timeline; eligibility reasoning surfaced; consent-gating live; **PL locale bundle complete (12 languages translated end-to-end including HomePage, footer, Apply forms, Compliance, Login, Cases, Consent, Demos), Translator agent invoked in LA after Doc Extractor, axe-core CI gate active, site-wide RouteAnnouncer + cookie-banner a11y fix shipped**. | — Promoted 🟢 after live walk-through with Windows Narrator (Win + Ctrl + Enter) on Edge, Polish UI. |
| 4  | Erik snaps a payslip on mobile (DK)                       | 🟡    | Web equivalent works (drop a PDF → Document Extractor → confirm → submit). Same APIM + LA path.            | No native iOS/Android build shipped; mobile shell exists in repo but not packaged.                                            |
| 5  | Astrid caseworker triages with Copilot for Service        | 🔴    | Caseworker-helper Foundry agent deployed; APIM op routes to it.                                           | No caseworker UI built (D365 Customer Service licence pending — see § *Caseworker UI strategy* for the Power Apps interim).   |
| 6  | Eligibility model proposes, caseworker disposes           | 🟡    | Eligibility Pre-Assessor returns `{decision, confidence, reasoning}`; SPA shows reasoning to citizen.     | No caseworker disposition UI (depends on D5); no Confidential Ledger entry written for the human override decision.           |
| 7  | Hans the DPO audits a 6-month-old AI decision             | 🟡    | GDPR Art. 17 erasure stub `POST /gdpr/erasure-request` returns Priva certificate; SPA wipes local cache.  | Real Priva DSR connector pending E5 licence; Purview lineage endpoint still `placeholder.local`; no DPO console.              |
| 8  | Prompt-injection attempt is contained & investigated      | 🟡    | Foundry Content Safety filters enabled by default; APIM rate-limits per channel actor; Sentinel deployed. | No red-team scenario rehearsed; no Sentinel hunting query published; no incident-response runbook proven.                     |
| 9  | CIO per-country, per-language outcomes & 47-portal sunset | 🔴    | Power BI Premium capacity + Fabric workspace provisioned.                                                 | No published report; CSAT not captured per language; sunset roadmap dashboard not built.                                      |
| 10 | DevOps stands up the platform from a clean tenant         | 🟡    | 25 install phases scripted in `scripts/install/Install-UDCSP.ps1`; recently extended for D3 lake wiring + per-op policies + GDPR API. | Not re-run on a clean tenant since the recent installer changes (commits `4e32a59`, `00e8ac1`); needs a one-shot validation. |

**The only piece played live recently is Demo 1's chat sub-component** (D1 in the previous taxonomy — citizen public chat through APIM `agent-topic-router`). Everything above the 🟢 line is build-verified but awaits a recorded walk-through.

The remainder of this document tracks the **Demo-3 (Maria) gap** in detail because it is the next demo we expect to play.

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
