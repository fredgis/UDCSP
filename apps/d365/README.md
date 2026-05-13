# UDCSP Dynamics 365 Customer Service (A8)

## Purpose
Unmanaged D365 solution **skeletons** for shared application case tables, BPF, queues, SLAs, Copilot for Service, Power Automate, and Dataverse-to-Fabric mirroring.

## Status — scaffold only

The four solution folders (`solutions/UDCSP_Core`, `UDCSP_DK`, `UDCSP_SE`, `UDCSP_NO`) ship a canonical `Other/Solution.xml` (publisher `UDCSP`, prefix `udcsp`, option-value prefixes 71510-71513) but **empty `<RootComponents />`**. The XMLs under each `customizations/` subfolder are descriptive scaffolds — they document the intended schema (entities, BPFs, forms, queues, SLAs, Copilot for Service prompts) but are **not in canonical Dataverse XML format**, so `pac solution pack` cannot include them.

## Deploy
Driven by `scripts/install/modules/Install-D365.psm1` (LogicApps phase orchestrates this). For each country in `D365EnvironmentUrls` (`scripts/install/config/udcsp.config.psd1`):
1. `pac org select --environment <url>` — pivot the active connection.
2. `pac solution pack --packagetype Unmanaged --zipfile <report>/d365-packed/<name>.zip --folder solutions/<name>` — build the zip from `Other/`.
3. `pac solution import --path <zip> --publish-changes --environment <url>` — import.

The `Test-PacStdoutForError` helper surfaces server-side failures even when `pac` returns exit 0 (a pac CLI quirk).

## Materialising real entities

To go beyond the empty publisher and have working tables/forms for the demos:

1. Open https://make.powerapps.com/environments/<env>/solutions and pick `UDCSPCore`.
2. Author the four core tables in the maker UI: `udcsp_application`, `udcsp_eligibility_assessment`, `udcsp_consent_record`, `udcsp_country_zone`. Add forms, views, BPFs, queues and SLAs as described in `customizations/` (treat those scaffolds as the spec).
3. Export back to source: `pac solution export --name UDCSPCore --path apps/d365/solutions/UDCSP_Core --managed false --include autonumbersettings,calendarsettings,customization,emailtracking,externalapplications,general,marketing,outlooksynchronization,relationshiproles,sales`. Power Platform Build Tools will produce a canonical `Other/Solution.xml` with populated `<RootComponents>` and `Entities/<Name>/Entity.xml` files.
4. Commit the result, re-run the installer — DK/SE/NO get the real schema.

## Test
Run `scripts/Test-D365.ps1 -EnvironmentUrl <url> -AccessToken <token>` to create a synthetic application and validate BPF/SLA wiring.

## Tear-down
Delete imported unmanaged solutions or reset the sandbox environment.

## Owner
A8 Case Management.
