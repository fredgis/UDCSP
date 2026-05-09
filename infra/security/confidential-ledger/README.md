# Confidential Ledger

Deploys one shared Azure Confidential Ledger in the `westeurope` federation hub for the three UDCSP zones.

EU AI Act Art. 26(6) requires deployers of high-risk AI systems to keep automatically generated logs. The Eligibility Pre-Assessor is classified high-risk, so every inference needs an immutable, append-only record that auditors can verify was not rewritten after a benefit recommendation.

Foundry managed identities and Logic Apps managed identities are granted the `udcsp-ai-act-writer` operating role by mapping their Entra object IDs to the ledger `Contributor` role. The auditor group is granted `udcsp-auditor-reader` by mapping its object ID to the ledger `Reader` role. Certificate/shared-key access is not used.

For each Eligibility inference, the orchestration layer writes:

- `decision-id`
- `prompt-hash`
- `output-hash`
- `model-version`
- `traceparent`

The ledger complements, but does not replace, Foundry traces in Application Insights and Fabric. App Insights/Fabric keep rich telemetry, prompts, retrieved chunks, latency and evaluation data; Confidential Ledger stores the tamper-evident proof record that ties those traces to a regulator-verifiable decision lineage.

## Deploy

```powershell
az deployment group create `
  --resource-group <hub-rg> `
  --template-file .\confidential-ledger.bicep `
  --parameters logAnalyticsWorkspaceId=<workspace-id> writerPrincipalIds='["<mi-object-id>"]' auditorReaderPrincipalIds='["<group-object-id>"]'
```

## Test

```powershell
.\scripts\Test-ConfidentialLedger.ps1 -Offline
```

