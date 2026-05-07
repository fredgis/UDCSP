# UDCSP Voice & Channels

## Purpose
Azure Communication Services, IVR, Azure AI Speech, transcription, escalation, and SMS/email notification scaffold for A10.

## Dev setup
Install Azure PowerShell/Bicep in the deployment environment only. Placeholder numbers, resource names, and endpoints must be supplied by platform teams before execution.

## Build
Bicep files are deployable modules. No local build is required for YAML/JSON templates.

## Test
`scripts/Test-Voice.ps1` performs a synthetic-call placeholder assertion once ACS test hooks are provisioned.

## Deploy
`scripts/Deploy-Voice.ps1` validates parameters and shows the Azure deployment command; replace placeholders with environment values in CI.

## Owner
Frontend & Channels build agent — work package A10.
