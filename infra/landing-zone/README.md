# UDCSP Landing Zone & DevOps (A1)

## Purpose
Subscription-scoped Bicep scaffold for DK/SE/NO sovereign zones: resource group, hub/spoke networking, private Key Vault, ADLS Gen2, Premium ACR, policy guardrails, and management-group hierarchy notes.

## Deploy
```powershell
.\scripts\deploy.ps1 -Country dk -Environment prod -Location northeurope
```
The script runs `az deployment sub what-if` first, then prompts before `az deployment sub create`.

## Test
```powershell
.\scripts\validate.ps1
```
Runs subscription-scope validation for DK, SE, and NO parameter files.

## Tear-down
Delete the `udcsp-<country>-<env>-platform-rg` resource group and remove policy assignments/management groups only after downstream agents have been torn down.

## Owner
A1 — Landing Zone & DevOps.
