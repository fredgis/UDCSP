# UDCSP Data Governance — Microsoft Purview

## Purpose
A13 scaffold for Microsoft Purview: account deployment, data-source registrations, classifications, sensitivity labels, DLP, data-sharing policies and source-to-report lineage for the UDCSP data estate.

## Deploy
Deploy `account/purview-account.bicep`, then run `scripts/Register-PurviewSources.ps1 -PurviewAccountName <name>` with an authenticated Azure session and Purview data-plane access.

## Test
Run `scripts/Test-Purview.ps1 -Offline` to validate local policy/classification metadata. In a tenant, provide `-PurviewAccountName` to verify classifications and lineage via the Purview REST API.

## Tear-down
Disable scans, export catalog evidence needed for retention, remove source registrations and delete the Purview account after soft-delete retention checks.

## Owner
A13 — Data Governance (Microsoft Purview).
