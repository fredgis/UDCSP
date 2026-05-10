# Logic Apps Event Grid (A7)

## Purpose
Per-country **domain-events topic** (`udcsp-{country}-{env}-domain-events`) that the Logic Apps workflows publish to. Schemas for the five published event types live next to this README in `schemas/`.

## Published event types
- `CitizenApplicationSubmitted`
- `EligibilityAssessed`
- `CaseDecided`
- `AccessRequestCompleted`
- `ContentSafetyHit`

## Deploy
Deployed by `scripts\install\modules\Install-LogicApps.psm1` (Bicep template `topic-subscriptions.bicep`). Only the **topic** is provisioned at install time; the webhook **subscription** stays unconfigured (`logicAppWebhookEndpoint = ''`) so publishers can emit events immediately while ops wires concrete consumers (Logic App workflows, Service Bus relays, Sentinel webhooks, etc.) post-install.

## Wire a consumer (post-install)
```pwsh
az deployment group create `
  --resource-group udcsp-{country}-logicapps-rg `
  --template-file services/logic-apps/eventgrid/topic-subscriptions.bicep `
  --parameters country={country} env={env} `
  logicAppWebhookEndpoint=https://<consumer-host>/api/<path>
```

## Owner
A7 Integration & Workflow.
