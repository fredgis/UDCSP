# UDCSP Security & Compliance (A3)

## Purpose
Defender for Cloud plans, Sentinel workspace onboarding, analytics rules, SOAR playbook sample, policy baseline, and GDPR/EU AI Act DPIA artefacts.

## Deploy
Deploy `defender/defender-for-cloud.bicep` at subscription scope and `sentinel/sentinel-workspace.bicep` into the platform resource group.

## Test
```powershell
.\scripts\Test-SecurityBaseline.ps1 -SubscriptionId <id>
```

## Tear-down
Disable Sentinel, remove analytics/playbooks, then disable Defender plans only after workloads are removed.

## Owner
A3 — Security & Compliance.
