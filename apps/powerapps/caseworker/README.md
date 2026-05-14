# UDCSP Caseworker — Power App (D365 substitute)

## Why this exists

UDCSP runs on three sovereign Microsoft 365 / Power Platform tenants (DK, SE,
NO) but the demo doesn't pay for a Dynamics 365 Customer Service licence.
This folder ships a **model-driven Power App** that uses the same custom
Dataverse table (`udcsp_application`) that the production D365 deployment
would use, so the caseworker journey is provable end-to-end without a CE
licence — and the day a real D365 environment is provisioned, the same XML
just imports straight into it because both stacks are built on Dataverse.

## What's in the box

| File | Purpose |
| --- | --- |
| `caseworker-app.xml` (in `apps/d365/solutions/UDCSP_Core/customizations/apps/`) | Site map, components and ribbon commands of the model-driven app. |
| `udcsp_application.xml`, `udcsp_eligibility_assessment.xml`, `udcsp_caseworker_decision.xml`, `udcsp_consent_record.xml`, `udcsp_country_zone.xml` | Tables consumed by the app. |
| `application-main-form.xml` | Tabbed form (Summary · AI pre-assessment · Documents · Consents · Caseworker decision · Audit). |
| `caseworker-views.xml` | Saved queries surfaced in the site map (My open · SLA at risk · By type · By country · Decided last 30 days …). |
| `apps/web/src/pages/CaseworkerPage.tsx` | **Live web fallback at `/caseworker`** — same UX as the model-driven app, runs today against the local case store + APIM `GET /citizen-applications/`. This is what the user sees when there's no Dataverse environment yet. |

## How a single app serves DK + SE + NO

* **One Dataverse table** (`udcsp_application`) per environment with the same
  schema. Country is a column (`udcsp_country` / `udcsp_destinationcountry`),
  not a per-country table.
* **Country gating** is done with security roles + view filters, not with
  three separate apps:
  * Caseworkers in DK get the role `UDCSP DK Caseworker` → views default to
    the `Denmark Inbox` and `Cross-Border Residency Inbound` (where
    `destinationCountry == dk`).
  * Cross-border officers get the role `UDCSP Nordic Cross-Border` → see all
    three inboxes.
* **Both application types in the same app**: residency-transfer and child &
  family benefit point at the same table; the form's *Summary* tab uses
  `visible-when` rules on `udcsp_applicationtype` to show only the relevant
  section (residency details vs. child & income details).

## Deploy to a real Power Platform environment

Prerequisite: `pac` CLI (Power Platform CLI) installed and authenticated.

```powershell
# 1. Install pac (one-off, requires .NET SDK 6+)
dotnet tool install -g Microsoft.PowerApps.CLI.Tool

# 2. Auth + pivot to the target environment
pac auth create --url https://<env>.crm4.dynamics.com
pac org select --environment https://<env>.crm4.dynamics.com

# 3. Pack the unmanaged solution that contains tables + form + views + app
pac solution pack `
  --packagetype Unmanaged `
  --zipfile out\UDCSPCore.zip `
  --folder apps\d365\solutions\UDCSP_Core

# 4. Import + publish
pac solution import --path out\UDCSPCore.zip --publish-changes

# 5. Repeat for the country overlays (UDCSP_DK / UDCSP_SE / UDCSP_NO)
foreach ($c in 'DK','SE','NO') {
  pac solution pack --packagetype Unmanaged `
    --zipfile out\UDCSP_$c.zip --folder apps\d365\solutions\UDCSP_$c
  pac solution import --path out\UDCSP_$c.zip --publish-changes
}
```

> ⚠️ The XML files under `apps/d365/solutions/UDCSP_Core/customizations/`
> are **descriptive scaffolds** (see `apps/d365/README.md`). They document
> the intended schema but `pac solution pack` won't include them as-is —
> the canonical workflow is to author the four tables once in
> `make.powerapps.com`, then export back with
> `pac solution export --include customization` to get the proper
> `Other/Solution.xml` and `Entities/<table>/Entity.xml` files. The
> scaffolds in this repo are the authoritative spec for that one-time
> manual authoring.

## How to access the Power App

> ⚠️ **Today the Power App is not yet accessible** — it requires a one-off
> manual authoring pass in `make.powerapps.com` because `pac solution pack`
> cannot synthesise a packageable solution from descriptive scaffold XML
> (Dataverse needs a real `Other/Solution.xml` + per-table `Entity.xml` that
> can only be produced by `pac solution export` *after* the table exists).
> The procedure below gets you to a clickable URL once.

### One-off bootstrap (≈ 5-15 min, run once)

**Two options** — pick the scripted one (Option A) to skip ~40 manual column clicks.

#### Option A — scripted table provisioning (recommended)

```powershell
az login                            # interactive, opens browser
.\apps\powerapps\caseworker\bootstrap-udcsp-application.ps1 `
  -EnvUrl https://org939d8f07.crm4.dynamics.com
```

The script `bootstrap-udcsp-application.ps1` calls the Dataverse Web API
with your Az CLI bearer token and creates the `udcsp_application` table
plus all 40+ columns (idempotent — re-running skips existing). Picklist
columns are created as plain String for simplicity (the SPA already
sends the right string values like `residency-transfer`, `se`,
`approved`); convert to Choice in Maker later if you want enum
validation. Only **steps 4-5 below remain** after the script.

#### Option B — fully manual

1. Sign in to <https://make.powerapps.com> with the tenant admin account
   (`frgisber@microsoft.com` for the dev sandbox) and switch to the
   **UDCSP-Dev** environment (org URL `org939d8f07.crm4.dynamics.com`).
   The DK / SE / NO sovereign environments are still placeholders in
   `docs/installation.md` — provision them later.
2. **Tables → New table** named `udcsp_application`. Add the columns
   listed in `apps/d365/solutions/UDCSP_Core/customizations/entities/udcsp_application.xml`
   (subject + description are not enough — you need at minimum
   `udcsp_citizenupn`, `udcsp_country`, `udcsp_destinationcountry`,
   `udcsp_applicationtype`, `udcsp_aidecision`, `udcsp_aiconfidence`,
   `udcsp_caseworkerdecision`, `udcsp_workflowstate`, `udcsp_payload`).
3. Repeat for `udcsp_eligibility_assessment`,
   `udcsp_caseworker_decision`, `udcsp_consent_record`,
   `udcsp_country_zone` (specs in the same `entities/` folder).
4. **Apps → New app → Model-driven**, name **UDCSP Caseworker**, attach
   the `udcsp_application` table as the primary entity. Add the form and
   views from `application-main-form.xml` + `caseworker-views.xml` (copy
   the field lists, the form designer is interactive).
5. **Publish**. The app gets a stable URL of the form

   ```text
   https://org939d8f07.crm4.dynamics.com/main.aspx?appid=<APP_GUID>
   ```

   Bookmark it — that's the caseworker entry point. The GUID also appears
   in `make.powerapps.com → Apps → ... → Details`.

### After bootstrap: replicate to other envs (scripted)

Once steps 1-5 are done **once**, export the resulting solution and
replay it on every other Power Platform environment. The script below
lives at `apps\powerapps\caseworker\deploy.ps1`:

```powershell
.\apps\powerapps\caseworker\deploy.ps1 `
  -SourceEnv https://org939d8f07.crm4.dynamics.com `
  -TargetEnvs @(
    'https://udcspdk.crm4.dynamics.com',
    'https://udcspse.crm4.dynamics.com',
    'https://udcspno.crm4.dynamics.com'
  )
```

It runs `pac solution export --include customization` against
`-SourceEnv`, then `pac solution import --publish-changes` against each
`-TargetEnv`. It auto-locates `pac.exe` under
`%LOCALAPPDATA%\Microsoft\PowerAppsCLI\` if it isn't already on `PATH`.

### Citizen-side access (works today, no Power App needed)

Citizens never use the Power App — they use the SPA at
<https://udcsp.fredgis.com> (`/apply/residency`, `/apply/child-benefit`,
`/cases`). The cases they create are persisted to Dataverse `tasks` (and
soon `udcsp_application`) by the application-intake Logic App and
re-hydrated cross-device by the new APIM operation policy
`services/apim/apis/citizen-applications/operations/get-citizen-applications-list.xml`.

## How the data flows

```
Citizen portal
   │
   │ POST /citizen-applications/  (APIM)
   ▼
Service Bus  applications-intake
   │
   ▼
Logic App  application-intake          ──────────────────────────────────────────────┐
   │  Foundry Classifier (intent)                                                    │
   │  Foundry Eligibility Pre-Assessor (TEE — Confidential ACI)                      │
   │  Foundry Document Extractor                                                     │
   │  Foundry Translator → caseworker locale                                         │
   │  POST udcsp_application  (Dataverse Web API — explicit field-by-field mapping)  │
   │  Publish lineage event → Purview                                                │
   ▼                                                                                  │
Dataverse  udcsp_application  ◀───── Caseworker Power App / /caseworker  ─────────────┘
                              ◀───── Citizen /cases (read-only)
```

## Owner

A8 Case Management.
