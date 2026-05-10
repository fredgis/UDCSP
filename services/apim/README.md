# UDCSP API Management (A7)

## Purpose
Premium multi-region gateway for citizen, caseworker, partner eIDAS, internal AI, D365, document, notification, and GDPR data-export APIs for DK, SE, and NO.

## Deploy
Deployed by `scripts\install\modules\Install-Apim.psm1` (invoked by `scripts\install\Install-UDCSP.ps1` Apim phase). Bicep template `apim.bicep` is applied per sovereign zone (DK/SE/NO), then OpenAPI specs + policies under `services/apim/apis/*` are imported, then Defender for APIs onboarding runs. Do not invoke deployment manually.

## Test
Run `scripts\Test-Apim.ps1 -GatewayUrl https://<name>.azure-api.net -Token <jwt>` for 200/401/429 smoke checks.

## Tear-down
Delete the APIM deployment stack or resource group.

## Owner
A7 Integration & Workflow.
