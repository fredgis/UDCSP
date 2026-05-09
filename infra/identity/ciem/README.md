# Entra Permissions Management / CIEM

UDCSP uses three sovereign citizen tenants plus a shared workforce tenant. PIM gives just-in-time activation for privileged work; CIEM adds continuous posture by detecting unused permissions, over-privileged identities and anomalous cross-zone access after roles are assigned.

`entra-permissions-management.bicep` onboards the three country subscriptions and the shared workforce/federation subscription by granting the CIEM collector least-privilege Reader access. AWS and GCP onboarding blocks are included as commented placeholders so the same posture model can extend to future multi-cloud landing zones.

## Policy templates

| Policy | Purpose |
|---|---|
| `policies/least-privilege-baseline.json` | Alerts on identities with permissions unused for more than 30 days and recommends access review or role reduction. |
| `policies/cross-tenant-anomaly.json` | Alerts on access paths that cross sovereign/workforce zones outside approved administration patterns. |

Run `scripts/Test-Ciem.ps1 -Offline` to validate local assets without Azure access.
