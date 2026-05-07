# UDCSP Logic Apps Standard (A7)

## Purpose
Stateful orchestration for intake, cross-border residency, decisions, GDPR SAR, AI shadow-mode, and human escalation with W3C trace context, App Insights dimensions, and Purview-compatible lineage events.

## Deploy
Run `scripts\Deploy-LogicApps.ps1 -Country dk -Environment dev -ResourceGroupName <rg> -AppInsightsConnectionString <cs>` after storage/network/Key Vault are available.

## Test
Run `scripts\Test-LogicApps.ps1 -BaseUrl <workflow-host-url> -Token <jwt>` to trigger synthetic workflow payloads.

## Tear-down
Delete the Logic Apps resource group or deployment stack.

## Owner
A7 Integration & Workflow.
