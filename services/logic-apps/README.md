# UDCSP Logic Apps Standard (A7)

## Purpose
Stateful orchestration for intake, cross-border residency, decisions, GDPR SAR, AI shadow-mode, and human escalation with W3C trace context, App Insights dimensions, and Purview-compatible lineage events.

## Deploy
Deployed by `scripts\install\modules\Install-LogicApps.psm1` (invoked by `scripts\install\Install-UDCSP.ps1` LogicApps phase). Bicep templates `workspace.bicep` and `servicebus/servicebus.bicep` are applied per sovereign zone, then workflow folders are pushed via the platform CI. Do not invoke deployment manually.

## Test
Run `scripts\Test-LogicApps.ps1 -BaseUrl <workflow-host-url> -Token <jwt>` to trigger synthetic workflow payloads.

## Tear-down
Delete the Logic Apps resource group or deployment stack.

## Owner
A7 Integration & Workflow.
