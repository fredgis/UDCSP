# Confidential Compute

UDCSP deploys one confidential Azure Container Apps environment per country. This preserves sovereign network boundaries and keeps Danish, Swedish and Norwegian citizen PII in the local VNet while still using a common deployment pattern. The default workload profile is `Confidential-Standard-NC8as-T4-v5`; if quota or regional availability blocks that SKU, pass a confidential `D4as_v5`-backed workload profile type approved for the target region.

The Eligibility Pre-Assessor is a high-risk EU AI Act use case. In the DK → SE residency transfer flow, citizen PII and eligibility claims are purpose-bound, but orchestration still handles sensitive facts before calling Foundry. Running this wrapper in a TEE reduces host/operator exposure: request normalisation, PII minimisation, prompt-hash generation and response hashing happen inside SEV-SNP-backed confidential nodes.

## Attestation flow

1. Container starts on confidential nodes.
2. The sidecar/bootstrap process requests an AMD SEV-SNP attestation report.
3. The report is validated against Azure Attestation policy.
4. Only after successful attestation does the app accept Foundry endpoint configuration and process inference requests.
5. Each request emits `traceparent`, hashes and model metadata to the Confidential Ledger and richer telemetry to App Insights/Fabric.

The actual model call still goes to Foundry. The confidential app is the secure PII-handling and orchestration layer around that call.

## Test

```powershell
.\scripts\Test-ConfidentialCompute.ps1 -Offline
```

