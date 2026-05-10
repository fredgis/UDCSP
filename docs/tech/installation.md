# UDCSP — Installation Guide

> **Audience.** Platform engineers and reviewers performing a clean install of the **Unified Digital Citizen Services Platform** on a sacrificial Microsoft Cloud tenant.
>
> **Outcome.** Every component referenced by [`architecture.md`](./architecture.md) provisioned in dependency order, smoke-tested, and ready to drive the 10 acceptance scenarios in [`recipe.md`](./recipe.md).

> [!TIP]
> **Storage architecture context.** Read [`data.md`](./data.md) before installing — it explains what each storage component is for and why it's needed (5 zones, retention matrix, GDPR + AI Act + ePrivacy compliance mapping).

The remainder of this document is organised in the **exact order an operator goes through** to take a clean tenant to a fully running platform. Each section is a step you finish before moving to the next:

1. [Topology you will install](#1-topology-you-will-install)
2. [Prepare the operator workstation](#2-prepare-the-operator-workstation)
3. [Prepare the Microsoft Cloud tenants](#3-prepare-the-microsoft-cloud-tenants)
4. [Configure the install (`udcsp.config.psd1`)](#4-configure-the-install-udcspconfigpsd1)
5. [Validate before deploying (`-TestOnly` then `-WhatIf`)](#5-validate-before-deploying)
6. [First-pass install (every phase except `Voice` and `QA`)](#6-first-pass-install-every-phase-except-voice-and-qa)
7. [Configure the `Voice` phase from first-pass outputs and re-run](#7-configure-the-voice-phase-from-first-pass-outputs-and-re-run)
8. [Optional — bind a real PSTN number](#8-optional--bind-a-real-pstn-number)
9. [Post-install validation (smoke + recipe)](#9-post-install-validation)
10. [Tear-down](#10-tear-down)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Topology you will install

The installer provisions **three sovereign country zones** (Denmark, Sweden, Norway) plus a **shared analytics + governance zone**, all under a unified management-group hierarchy.

```mermaid
graph TB
  Root[Tenant Root MG]:::mg
  Root --> UDCSP[UDCSP MG]:::mg
  UDCSP --> Platform[Platform MG]:::mg
  UDCSP --> WLDK[Workloads-DK MG]:::mg
  UDCSP --> WLSE[Workloads-SE MG]:::mg
  UDCSP --> WLNO[Workloads-NO MG]:::mg
  Platform --> Sub_Platform[Sub: Platform-Shared]:::sub
  WLDK --> Sub_DK[Sub: Workloads-DK]:::sub
  WLSE --> Sub_SE[Sub: Workloads-SE]:::sub
  WLNO --> Sub_NO[Sub: Workloads-NO]:::sub
  classDef mg fill:#1565c0,stroke:#0d47a1,color:#fff
  classDef sub fill:#2ea44f,stroke:#238636,color:#fff
```

Each country sub gets its own landing zone, External ID tenant, Microsoft Fabric capacity, APIM region, Logic Apps workspace, D365 environment, ACS resource and Foundry project, plus the conversational data layer (PostgreSQL Flexible Server, Redis Enterprise, voice-recordings & email-attachments ADLS accounts, AI Search index, Event Hubs capture). Cross-zone analytics, governance and SOC tooling sit in the shared sub.

---

## 2. Prepare the operator workstation

The installer module phases call real CLIs. The table below lists the **mandatory** tools (used by every install) and the **conditionally required** tools (used by specific phases — if a CLI is missing the module logs a clear `[skip]` line so the rest of the run continues, but the corresponding component will not be deployed).

| Tool | Mandatory? | Used by | Install |
|---|---|---|---|
| PowerShell | ✅ Always | Orchestrator + every module | <https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell> |
| Azure CLI (`az`) 2.60+ | ✅ Always | LandingZone, Bastion, CIEM, Security, DDoS, BackupAsr, ConfidentialLedger, ChaosStudio, Observability, Postgres, Redis, ConfidentialCompute, VerifiedId, Identity (Bicep parts), Apim, LogicApps (Bicep parts), Purview, Voice | <https://learn.microsoft.com/en-us/cli/azure/install-azure-cli> + `az bicep upgrade` |
| `Microsoft.Graph` PowerShell SDK 2.x | ⚠️ For Graph phases | Identity (user flows / extensions / CA / PIM), VerifiedId (credential contracts), CIEM (policies), Priva (DSR policies) | `Install-Module Microsoft.Graph -Scope CurrentUser` then `Connect-MgGraph -Scopes "Application.ReadWrite.All Policy.ReadWrite.ConditionalAccess Policy.ReadWrite.PermissionGrant ..."` |
| Power Platform CLI (`pac`) | ⚠️ For D365 | D365 (solution import) | <https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction> |
| Node.js 20 LTS + `npm` | ⚠️ For Apps | Apps (web build, mobile build) | <https://nodejs.org> |
| Static Web Apps CLI (`swa`) | ⚠️ For web deploy | Apps | `npm i -g @azure/static-web-apps-cli` |
| Expo EAS CLI (`eas`) | ⚠️ For mobile build | Apps | `npm i -g eas-cli` |
| Azure Functions Core Tools (`func`) v4 | ⚠️ For Logic Apps | LogicApps (workflow publish) | <https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local> |
| Python 3.11 | ⚠️ For synthetic data | SyntheticData (generators) | <https://www.python.org/downloads/> |
| Git 2.43+ | ✅ Always | Working copy of this repo | <https://git-scm.com> |

A single bootstrap script installs everything except `az` and `pac` (those have their own MSIs):

```powershell
pwsh ./scripts/dev/Bootstrap-DevEnv.ps1
```

After the workstation is ready, log in to all required control planes:

```powershell
az login                                                # Azure
az account set --subscription <SharedPlatform-sub-id>   # default sub for shared deployments
Connect-MgGraph -Scopes "Application.ReadWrite.All",`
                        "Policy.ReadWrite.ConditionalAccess",`
                        "Policy.ReadWrite.PermissionGrant",`
                        "User.ReadWrite.All",`
                        "Directory.ReadWrite.All",`
                        "VerifiableCredential.Create.All",`
                        "PrivacyManagement.ReadWrite.All"
pac auth create --environment https://udcspdk.crm4.dynamics.com   # repeat for SE / NO
```

> The installer pre-flights `az login` once at the top and refuses to start a real install if you are not authenticated. `pac` / `Connect-MgGraph` / `npm` / `swa` / `eas` / `func` are checked lazily by each module — if missing, that module emits a `[skip]` line and the rest of the run continues, so a partial install is always restartable with `-Phase <name>`.

---

## 3. Prepare the Microsoft Cloud tenants

You need owner-level access to:

1. A **Microsoft Entra tenant** (workforce) — for caseworker / SOC / DPO identities.
2. **Three Azure subscriptions** (or three resource-group quotas in one subscription if running a demo), one per country — `udcsp-dk`, `udcsp-se`, `udcsp-no`.
3. **One shared Azure subscription** for cross-zone analytics & governance.
4. **Three D365 Customer Service environments** (one per country) — sandbox SKU is fine for the case study.
5. **Three Microsoft Entra External ID tenants** — `udcspdk.onmicrosoft.com`, `udcspse.onmicrosoft.com`, `udcspno.onmicrosoft.com` (or your own naming).
6. A **Microsoft Foundry workspace** with model quota for the agents listed in `foundry/agents/`.

**Capacity** to deploy: APIM Premium (multi-region), Microsoft Fabric F-SKU per country, ACS, AI Foundry hub & projects, AI Speech, Document Intelligence, Sentinel, Defender for Cloud, Key Vault Premium, ADLS Gen2.

Additional quota and permission checks for the conversational data layer:

| Requirement | Scope | Notes |
|---|---|---|
| Quota: 6 additional Storage accounts per environment | Azure subscription or country resource groups | 3 countries × 2 new ADLS Gen2 accounts: `udcspvox*` and `udcspeml*` |
| Quota: 3 Azure AI Search services per environment | Azure subscription | One S1 service per country for per-citizen conversational memory |
| Quota: 3 Event Hubs namespaces per environment | Azure subscription | One Standard namespace per country for ACS event capture |
| Permission: Owner on the country resource group | Azure RBAC | Required for CMK linkage between the new resources and the country Key Vault |
| Permission: Power Platform admin on each Dataverse environment | Power Platform | Required to install D365 solutions and enable the Foundry → Dataverse `bot_session` mirror table |

> **Power Platform environments must exist *before* the `D365` phase runs.** Create one Production environment per country (no sample apps, no Dataverse currency override):
>
> ```powershell
> pac admin create --name UDCSP-DK --type Production --region europe        --currency DKK --language 1030
> pac admin create --name UDCSP-SE --type Production --region 'sweden'      --currency SEK --language 1053
> pac admin create --name UDCSP-NO --type Production --region 'norway'      --currency NOK --language 1044
> ```
>
> Capture each environment URL into `D365EnvironmentUrls` in `udcsp.config.psd1` (next section).

> **DNS + TLS for the citizen surfaces.** The Front Door + APIM phases assume the operator owns the apex zone `udcsp.{dk,se,no}` (or your equivalent) and have delegated NS records pointing at `infra/landing-zone/modules/networking.bicep` outputs. The installer provisions Front-Door-managed certificates for every `*.udcsp.{dk,se,no}` host, but it cannot delegate DNS for you. If you do not own these zones yet, register them before §5.

> **EU residency note.** Every workload region MUST be in EU geography (`westeurope`, `northeurope`, `swedencentral`, `norwayeast`). The installer refuses to deploy to non-EU regions.

---

## 4. Configure the install (`udcsp.config.psd1`)

The installer reads configuration from `scripts/install/config/udcsp.config.psd1`. Copy the template and fill in:

```powershell
Copy-Item scripts/install/config/udcsp.config.template.psd1 scripts/install/config/udcsp.config.psd1
notepad scripts/install/config/udcsp.config.psd1
```

Mandatory keys:

```powershell
@{
  TenantId                = '<entra-tenant-guid>'
  Subscriptions = @{
    SharedPlatform = '<sub-guid>'
    DK             = '<sub-guid>'
    SE             = '<sub-guid>'
    NO             = '<sub-guid>'
  }
  ExternalIdTenants = @{
    DK = 'udcspdk.onmicrosoft.com'
    SE = 'udcspse.onmicrosoft.com'
    NO = 'udcspno.onmicrosoft.com'
  }
  D365EnvironmentUrls = @{
    DK = 'https://udcspdk.crm4.dynamics.com'
    SE = 'https://udcspse.crm4.dynamics.com'
    NO = 'https://udcspno.crm4.dynamics.com'
  }
  FoundryWorkspace = @{
    Subscription  = '<sub-guid>'
    ResourceGroup = 'udcsp-shared-foundry'
    Name          = 'udcsp-foundry'
    Region        = 'swedencentral'
  }
  Environment = 'prod'   # one of dev|test|preprod|prod
  Regions = @{
    DK = 'northeurope'
    SE = 'swedencentral'
    NO = 'norwayeast'
  }
}
```

The `Voice = @{ dk = @{…}; se = @{…}; no = @{…} }` block ships **placeholders** — leave them as-is for now. They will be filled in [§ 7](#7-configure-the-voice-phase-from-first-pass-outputs-and-re-run), after the first install pass produces the Container Apps environment IDs, KV secret URIs, App Insights connection strings and D365 queue GUIDs the voice runtime needs.

Secrets (External ID signing keys, D365 application-user secrets, Foundry deployment keys) are fetched **just-in-time** from a bootstrap Key Vault — the installer's first task is to provision that vault under the shared platform subscription and prompt for any secret it cannot resolve.

---

## 5. Validate before deploying

### 5.1 Offline component self-test (no deployments)

Walk every phase's preconditions, configuration parsing and module wiring without touching Azure:

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -TestOnly -Environment dev
```

A green run here means the config file parses, every install module loads without error, every per-phase `Test-<Phase>` precondition function passes, and every Bicep template / helper script the installer is going to invoke exists at the expected path. **It does not call Azure**, so it cannot prove that quotas, subscriptions or RBAC are right — that is what `-WhatIf` (next section) is for.

### 5.2 What-if (dry-run)

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -WhatIf
```

Shows every Bicep what-if and APIM/Logic Apps/D365 deployment plan without applying anything. **Required before any `-Environment prod` install.**

### 5.3 Production runs require `-Force`

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -Environment prod -Force
```

Without `-Force`, an `-Environment prod` invocation prints a warning and exits without making any changes. `-WhatIf`, `-TestOnly`, and `-SmokeOnly` against `prod` do **not** require `-Force`.

---

## 6. First-pass install (every phase except `Voice` and `QA`)

> **What "deploy" means here.** Every Install-* module in `scripts/install/modules/` invokes the **real** Azure CLI / `pac` / `npm` / `swa` / `eas` / `func` / MS Graph commands needed to provision its component into the operator's tenant. There is no scaffold mode: when you run the command below you actually create resource groups, deploy Bicep, push container images, import D365 solutions, build the SPA, register Foundry agents, etc. Logs of every external command (with stdout, stderr and exit code) land in `scripts/install/reports/<runStamp>/install-<phase>.log` for traceability.

The simplest and recommended path:

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -Environment dev -ExcludePhase Voice,QA
```

This runs every phase **except `Voice` and `QA`** sequentially in dependency order, idempotent, with a coloured progress log and a JSON report under `scripts/install/reports/<timestamp>/`. We defer:

- **`Voice`** because its config block needs values produced by the earlier phases (Container Apps env IDs, KV secret URIs, App Insights connection strings, D365 queue GUIDs) — see [§ 7](#7-configure-the-voice-phase-from-first-pass-outputs-and-re-run).
- **`QA`** because its smoke gate exercises the deployed Voice runtime — it can only be green after Voice is up.

Once first-pass is green, you'll harvest the Voice config in [§ 7](#7-configure-the-voice-phase-from-first-pass-outputs-and-re-run), then run the second pass (`-Phase QA` — DAG resolution pulls in `Voice` and the smoke gate).

### 6.1 The 25 phases, in install order

| # | Phase | Module | What it deploys |
|--:|---|---|---|
| 1 | `LandingZone` | `Install-LandingZone.psm1` | MG hierarchy, RGs, networking, Key Vault, ACR, Storage |
| 2 | `Identity` | `Install-Identity.psm1` | External ID tenants, custom user flows, Microsoft Entra ID, Conditional Access, PIM |
| 3 | `VerifiedId` | `Install-VerifiedId.psm1` | Microsoft Entra Verified ID issuer + verifier (EUDI Wallet bridge, eIDAS 2.0) |
| 4 | `Bastion` | `Install-Bastion.psm1` | Azure Bastion Standard (per country) — sole admin shell ingress |
| 5 | `Ciem` | `Install-Ciem.psm1` | Microsoft Entra Permissions Management (CIEM) onboarding for the 3 sovereign tenants |
| 6 | `Security` | `Install-Security.psm1` | Defender for Cloud, Defender for APIs, Sentinel, Azure Policy, DPIA artefacts |
| 7 | `Ddos` | `Install-Ddos.psm1` | Azure DDoS Protection Standard plans + VNet associations |
| 8 | `BackupAsr` | `Install-BackupAsr.psm1` | Azure Backup vaults + policies + Azure Site Recovery (per country, geo-paired) |
| 9 | `ConfidentialLedger` | `Install-ConfidentialLedger.psm1` | Tamper-evident ledger for AI Act high-risk decisions (Art. 26(6)) |
| 10 | `ChaosStudio` | `Install-ChaosStudio.psm1` | Azure Chaos Studio targets + monthly experiments validating the 99.9 % SLO |
| 11 | `Observability` | `Install-Observability.psm1` | Log Analytics, App Insights, workbooks, alerts, correlation pipelines |
| 12 | `Fabric` | `Install-Fabric.psm1` | Capacities, workspaces, lakehouses, notebooks, semantic models, Power BI Premium reports (`data/fabric/power-bi/`) |
| 13 | `Postgres` | `Install-Postgres.psm1` | PostgreSQL Flexible Server (per country) — replaces Azure SQL + Cosmos persistent workloads |
| 14 | `Redis` | `Install-Redis.psm1` | Azure Cache for Redis Enterprise (per country) — slot-filling + ephemeral state for the topic-router |
| 15 | `SyntheticData` | `Install-SyntheticData.psm1` | Generates and seeds personas, applications, conversations, eval datasets in `data/synthetic/` |
| 16 | `Foundry` | `Install-Foundry.psm1` | Hub & projects, agents (incl. **`topic-router`** which absorbs Copilot Studio), prompts, eval suites, Content Safety, AI Act registry, App Insights / Dataverse `bot_session` mirror |
| 17 | `ConfidentialCompute` | `Install-ConfidentialCompute.psm1` | Confidential Container Apps (TEE / SEV-SNP) for Eligibility Pre-Assessor inference |
| 18 | `Apim` | `Install-Apim.psm1` | APIM instance(s), products, APIs, policies, named values — incl. the single `agent-topic-router` facade used by chat **and** voice |
| 19 | `LogicApps` | `Install-LogicApps.psm1` | Standard workspaces, workflows, connections, Service Bus, Event Grid |
| 20 | `D365` | `Install-D365.psm1` | Solutions, BPFs, queues, SLAs, Copilot for Service, Power Automate. **Produces** `d365TransferTargetId` and `d365VoiceQueueId` consumed by the Voice phase in [§ 7](#7-configure-the-voice-phase-from-first-pass-outputs-and-re-run). |
| 21 | `Apps` | `Install-Apps.psm1` | Static Web Apps + mobile builds + i18n catalogues; citizen insights via Chart.js components in `apps/web/src/components/insights/` |
| 22 | `Voice` | `Install-Voice.psm1` | ACS resource (per country), GPT-4o Realtime deployment, voice orchestrator Container App (`apps/voice/call-automation/Dockerfile` → ACR push → `Deploy-Voice.ps1`), Event Grid `IncomingCall` subscription, IVR dialogs. **Requires the Voice config block from [§ 7](#7-configure-the-voice-phase-from-first-pass-outputs-and-re-run) to fully succeed.** |
| 23 | `Purview` | `Install-Purview.psm1` | Account, sources, classifications, labels, DLP, sharing policies, Foundry agent custom-type lineage |
| 24 | `Priva` | `Install-Priva.psm1` | Microsoft Priva Privacy Management — DSR system of record + Risk Management policies, wired to the GDPR Logic Apps |
| 25 | `QA` | `Install-QA.psm1` | Wires CI eval / E2E / security / conformance pipelines to GitHub Actions |

> The installer declares this DAG at `scripts/install/Install-UDCSP.ps1:99-125` and refuses to run a phase whose prerequisites are missing.

### 6.2 Re-running a single phase

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -Phase Foundry,D365,Apps -Environment dev
```

Useful after a code change. Each module also exposes a `Test-<Phase>` function for offline validation:

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -TestOnly -Phase Foundry
```

---

## 7. Configure the `Voice` phase from first-pass outputs and re-run

The voice runtime (`apps/voice/call-automation/`) is the only phase that reads a deeply per-country block from `udcsp.config.psd1`. Most fields are produced by **earlier phases**, hence the two-pass workflow.

### 7.1 Harvest first-pass outputs

Read `scripts/install/reports/<runStamp>/install-report.json` and the Azure portal for each field below. For the case-study demo, filling **DK** alone is enough.

| Field in `Voice.<country>` | Source phase | Where to read it |
|---|---|---|
| `containerAppsEnvironmentId` | `LandingZone` | Resource ID of the per-country Container Apps env |
| `userAssignedIdentityId` | `Identity` | Resource ID of the per-country UAMI created for the voice orchestrator |
| `image` | (manual) | `<acr>.azurecr.io/udcsp/voice-orchestrator:<tag>` — built from `apps/voice/call-automation/Dockerfile`, pushed to the ACR provisioned in `LandingZone` |
| `azureOpenAiAccountName`, `azureOpenAiEndpoint` | `Foundry` | Azure OpenAI resource hosting the GPT-4o Realtime deployment |
| `apimBaseUrl` | `Apim` | Public APIM gateway URL (e.g. `https://api.udcsp.dk`) |
| `cognitiveServicesEndpoint` | `Foundry` (or a sibling Speech resource) | Cognitive Services / Speech endpoint for STT-fallback |
| `acsConnectionStringSecretUri`, `voiceClientSecretUri` | `LandingZone` (Key Vault) | Key Vault secret URIs (the secrets themselves are seeded by the bootstrap KV step) |
| `voiceClientId` | `Identity` | Client ID of the App Registration with the `voice-orchestrator` app role |
| `appInsightsConnectionString` | `Observability` | Connection string of the per-country App Insights component |
| `publicHostname` | (DNS) | FQDN you point at the Container App (or use the default `*.azurecontainerapps.io`) |
| `d365TransferTargetId`, `d365VoiceQueueId` | `D365` | Power Apps maker portal → Customer Service admin centre → **Workstreams** → your voice workstream → **Queue** GUID + **Transfer target** GUID. See [`docs/biz/voice.md`](../biz/voice.md) §10 for the click-path. |
| `deadLetterStorageAccountId` | `LandingZone` | Resource ID of the storage account used for Event Grid dead-lettering |
| `acsResourceName` | `Voice` (created on first pass `-WhatIf`) | Name of the per-country ACS resource — pre-created by the Voice Bicep before the orchestrator is deployed |
| `env`, `location`, `resourceGroup` | (config) | Plain values you choose |

### 7.2 Edit the config file

Open `scripts/install/config/udcsp.config.psd1` and replace the placeholders for at least one country.

### 7.3 Re-run the Voice phase

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -Phase Voice -Environment dev
```

The DAG resolver re-includes Voice's prerequisites (`LogicApps`, `Foundry`, and their own deps) — every Bicep deploy is idempotent so this is safe and takes only seconds for the already-up phases. If you want to deploy the orchestrator alone (e.g. after a code change), add `-ExcludePhase LandingZone,Identity,VerifiedId,Bastion,Ciem,Security,Ddos,BackupAsr,ConfidentialLedger,ChaosStudio,Observability,Fabric,Postgres,Redis,SyntheticData,Foundry,ConfidentialCompute,Apim,LogicApps,D365,Apps`.

### 7.4 Run the QA smoke gate

After Voice is green, run the deferred `QA` phase so the smoke gate exercises the live voice runtime:

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -Phase QA -Environment dev
```

> **Why not auto-resolve?** The installer is intentionally agnostic to your tenant naming and DNS strategy. The two-pass workflow keeps the config file declarative and re-runnable on any tenant.

---

## 8. Optional — bind a real PSTN number

Required only for the live voice demo in [`recipe.md`](./recipe.md) Scenario 2. After acquiring a Nordic toll-free or local number through ACS:

```powershell
pwsh apps/voice/scripts/Bind-AcsNumber.ps1 -Country dk -Env dev `
  -PhoneNumber +45XXXXXXXX -AcsResourceName udcsp-dk-acs `
  -ResourceGroup udcsp-dk-voice -OrchestratorFqdn voice-dk.udcsp.dk `
  -NumberType tollFree
```

The script overwrites the matching `placeholder: true` entry in `apps/voice/acs/phone-number-bindings.yaml` in-place, so the next `Install-Voice` run re-binds without operator action.

---

## 9. Post-install validation

### 9.1 Smoke + evaluator HTML report

```powershell
pwsh ./scripts/install/Install-UDCSP.ps1 -Phase QA -SmokeOnly -EvaluatorMode
```

`-EvaluatorMode` writes `scripts/install/reports/<runStamp>/install-report.html` in addition to the JSON report — this is the single artefact the case-study evaluator opens.

The QA phase smoke kicks off:

1. `tests/e2e/tests/scenario-09-devops-installer.spec.ts` — installer reproducibility check.
2. `tests/eval/pipelines/nightly-classifier.yaml` — reduced sample.
3. `tests/accessibility/automated/axe-runner.spec.ts` — homepage axe scan.
4. `tests/load/k6/citizen-application-submit.k6.js` — short ramp.

A **green** smoke gate prints the platform's URLs to console.

### 9.2 Walk through the recipe (10 acceptance scenarios)

```powershell
code ./docs/tech/recipe.md
```

The recipe exercises every layer of the platform — citizen voice call, web journey, mobile payslip OCR, caseworker triage, eligibility human-in-the-loop, DPO DSR, prompt-injection containment, executive workspace, DevOps reproducibility — and is the canonical proof that the platform satisfies the case study.

### 9.3 Conversational data smoke checks

Add these to your post-install checklist:

- **SMS** — send a test SMS via the platform; verify it lands in the `sms_activity` Dataverse table and in the `acs-events/` ADLS container.
- **Voice** — make a test voice call; verify the `.wav` lands in the `voice-recordings/` ADLS account, the STT transcript is stored alongside it, and the dialog turn is emitted by the Foundry `topic-router` into App Insights traces (mirrored nightly to the Dataverse `bot_session` table).
- **Email** — send a test email with attachment; verify the body is in the `email_activity` Dataverse table and the attachment is in the `email-attachments/` ADLS account, not in Dataverse.
- **Foundry trace** — trigger a Foundry agent invocation; verify the trace is in App Insights and mirrored to OneLake Bronze.
- **Right-to-erasure** — `POST /privacy/erase/{test_citizen_id}`; verify deletion cascades across all 5 zones within 30 minutes in test mode.

---

## 10. Tear-down

```powershell
pwsh ./scripts/cleanup/Remove-UDCSP.ps1 -Environment dev -Confirm
```

Removes every resource group tagged `costCenter=UDCSP` across all configured subscriptions, deletes External ID tenants flagged disposable, and unregisters Purview sources. Refuses to run against `prod` unless `-Force` is supplied.

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Pre-flight aborts with `Azure CLI is not logged in` | `az login` not done in this shell | `az login` then `az account set --subscription <id>` |
| `Install-D365` fails with `pac: command not found` | Power Platform CLI missing | Install per [§ 2](#2-prepare-the-operator-workstation), then `pac auth create --environment <env-url>` for each country |
| `Install-LogicApps` fails with `func: command not found` on workflow publish | Azure Functions Core Tools v4 missing | `npm i -g azure-functions-core-tools@4 --unsafe-perm true` (or use the [installer per OS](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)) |
| `Install-Apps` logs `[skip] swa CLI not found` / `[skip] eas CLI not found` | Static Web Apps / Expo CLIs missing | `npm i -g @azure/static-web-apps-cli eas-cli` then re-run `-Phase Apps` |
| `Install-Identity` / `Install-VerifiedId` / `Install-Ciem` / `Install-Priva` log `[skip] Microsoft.Graph not connected` | `Connect-MgGraph` not run in the current shell | Run the `Connect-MgGraph -Scopes …` command from [§ 2](#2-prepare-the-operator-workstation), then re-run the affected phase. Bicep parts of these phases run regardless. |
| `Install-Identity` fails on External ID user-flow upload | `TenantId` in config doesn't match the External ID tenant | Re-check the `ExternalIdTenants` block; the installer will attempt with the right tenant when corrected |
| `Install-Fabric` returns `403 CapacityNotFound` | Fabric F-SKU not provisioned in the country region | Provision the capacity in Azure Portal → re-run with `-Phase Fabric` |
| `Install-Foundry` fails on model deployment | Quota exhausted in the Foundry region | Request quota in Foundry portal or change region in config |
| `Install-Apim` slow on first run | Premium APIM cold start ≈ 45 minutes | Expected. The installer streams progress every 60 s. |
| `Install-Voice` complains about missing fields | First-pass outputs not yet harvested into the `Voice = @{ … }` block | Follow [§ 7](#7-configure-the-voice-phase-from-first-pass-outputs-and-re-run) then re-run `-Phase Voice` |
| Cross-border test fails (DK→SE) | Identity bridge claim mapping wrong | Re-deploy `infra/identity/external-id/user-flows/eidas-claims-extension.json` (External ID custom-authentication extension) and re-run scenario 01 |
| `Test-Observability` reports broken trace | Correlation header dropped at APIM | Verify `services/apim/policies/correlation-id.xml` is attached to all APIs |

Reports for every run are written under `scripts/install/reports/<timestamp>/install-report.json` and include the exact phase, status, duration, error stack and remediation hint.

---

> Need clarification on what a phase deploys and why? See [`architecture.md`](./architecture.md) (per-section deep dive) and [`data.md`](./data.md) (storage zones, retention, compliance).
