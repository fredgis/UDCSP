# UDCSP API Management (A7)

## Purpose
Premium multi-region gateway for citizen, caseworker, partner eIDAS, internal AI, D365, document, notification, and GDPR data-export APIs for DK, SE, and NO.

## Deploy
Run `scripts\Deploy-Apim.ps1 -Country dk -Environment dev -ResourceGroupName <rg> -PublisherEmail <mail>` after agent-platform supplies networking and Key Vault.

## Test
Run `scripts\Test-Apim.ps1 -GatewayUrl https://<name>.azure-api.net -Token <jwt>` for 200/401/429 smoke checks.

## Tear-down
Delete the APIM deployment stack or resource group.

## Owner
A7 Integration & Workflow.
