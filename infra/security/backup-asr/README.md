# Backup and Azure Site Recovery

UDCSP uses one Recovery Services vault per country, deployed in that country's Azure region and encrypted with the country Key Vault CMK. Production uses geo-redundant backup storage; non-production uses zone-redundant storage to reduce cost while preserving local resilience testing.

## Policies

- `udcsp-postgres-daily`: daily backup with 12 weekly, 12 monthly and 5 yearly recovery points.
- `udcsp-storage-daily`: daily backup aligned to the retention matrix in `data.md` for documents, transcripts and operational evidence.
- `udcsp-vm-daily`: daily backup for any IaaS VM dependency.

## BCDR targets

The architecture sets citizen-facing channel SLO at 99.9%. These modules support:

- RPO: 15 minutes for replicated IaaS workloads, 24 hours for native PaaS backup where service-native HA is primary.
- RTO: 4 hours for citizen channels and caseworker-critical recovery paths.
- Evidence: immutable vault soft delete, backup policy definitions, restore test records and ASR replication policy exports for ISO 27001 and NIS2 audits.

## Sovereignty

ASR is same-country only. Denmark fails over only to a Danish region/zone, Sweden only to Sweden, and Norway only to Norway. Cross-border failover is prohibited because it would move restricted citizen workloads outside their sovereign zone.

## Test

```powershell
.\scripts\Test-BackupAsr.ps1 -Offline
```

