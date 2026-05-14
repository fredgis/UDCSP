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

## Use the live web fallback today

No Dataverse needed:

```powershell
cd apps\web
npm install
npm run dev
# open http://localhost:5173/caseworker
```

Sign in with any of the three configured citizen identities, submit an
application from `/apply/residency` or `/apply/child-benefit`, then switch
to `/caseworker` — the case appears in the queue with the AI verdict, the
extracted document fields, the workflow timeline and the approve / reject /
request-more-info buttons.

The same page is deployed at <https://udcsp.fredgis.com/caseworker>.

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
