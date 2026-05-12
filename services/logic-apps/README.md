# UDCSP Logic Apps (A7)

## Purpose
Stateful orchestration for intake, cross-border residency, decisions, GDPR SAR, AI shadow-mode, archive handover, and human escalation with W3C trace context, App Insights dimensions, and Purview-compatible lineage events.

## Two tiers — picked by `-Environment`

| Environment | Runtime | Resource type | Why |
|---|---|---|---|
| `prod` | **Logic Apps Standard** (Workflow Standard WS1) | `Microsoft.Web/sites` (`functionapp,workflowapp`) on a `Microsoft.Web/serverfarms` plan | VNet integration, stateful semantics, no cold start, in-app Service Bus connector (data stays inside the country trust boundary). Requires `Total VMs ≥ 1` App Service quota per regional resource group. |
| `dev` / `test` | **Logic Apps Consumption** | `Microsoft.Logic/workflows@2019-05-01` | Multitenant, pay-per-execution, no VM quota — works in MCAPS sandbox subs. Service Bus triggers are auto-converted to HTTP `Request` triggers; the original queue name is preserved in metadata. |

See [`docs/tech/architecture.md` — Logic Apps tier choice](../../docs/tech/architecture.md#logic-apps-tier-choice--standard-prod-vs-consumption-devtest) and [`docs/biz/datacompliance.md` — Logic Apps tier](../../docs/biz/datacompliance.md#logic-apps-tier--production-vs-sandbox) for the rationale and the pre-production quota action.

## Deploy
Deployed by `scripts\install\modules\Install-LogicApps.psm1` (invoked by `scripts\install\Install-UDCSP.ps1` LogicApps phase). The module:
1. Deploys per-country Service Bus + Event Grid (both tier-independent).
2. If `env=prod`: deploys `workspace.bicep`, then `func azure logicapp publish` each workflow folder.
3. If `env=dev|test`: rewrites each `workflow.json` (strips `_comment` keys, swaps to the 2016-06-01 Consumption schema, converts Service Bus `ServiceProvider` triggers to HTTP `Request`), then PUTs `Microsoft.Logic/workflows@2019-05-01` via `az rest`.

Do not invoke deployment manually.

## Test
Run `scripts\Test-LogicApps.ps1 -BaseUrl <workflow-host-url> -Token <jwt>` to trigger synthetic workflow payloads.

## Tear-down
Delete the per-country resource group `udcsp-{dk,se,no}-logicapps-rg` or the deployment stack.

## Owner
A7 Integration & Workflow.
