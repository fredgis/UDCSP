# UDCSP - Cosmos DB infrastructure (per-country sovereign zones)

This folder defines the **operational, low-latency document store** used by
the platform for **draft applications, slot-filling cache and ephemeral
session state**. It is the realisation in Bicep of the role attributed to
Cosmos DB in [`docs/tech/data.md` Zone 1](../../../docs/tech/data.md#3-the-five-storage-zones)
and [`architecture.md` §8](../../../docs/tech/architecture.md#8-data--analytics-architecture-microsoft-fabric).

## Why Cosmos DB and not Dataverse?

| Concern | Dataverse | Cosmos DB |
|---|---|---|
| Schema-flex, per-citizen draft documents | Slow (table create/alter) | Native (one container, JSON docs) |
| Sub-50 ms write latency at p95 | No (D365 BPF overhead) | Yes (write region pinned per country) |
| TTL-based auto-purge of abandoned drafts | Manual | Native (`defaultTtl`) |
| Cross-partition aggregations on draft funnel | N/A | N/A (we mirror to OneLake Bronze for that) |

So Cosmos owns the **hot, ephemeral, per-citizen** state; Dataverse owns the
**case lifecycle and the audit trail** that has to survive 7-10 years.

## Per-country isolation

Three Cosmos DB accounts, one per sovereign zone, each pinned to its
country's primary Azure region (DK -> North Europe, SE -> Sweden Central,
NO -> Norway East), with continuous backup, customer-managed key from the
country Key Vault, and Microsoft Entra ID-only authentication (no master
keys). Cross-region replication is **disabled**: a DK draft never leaves
North Europe.

## Containers

| Container | Partition key | TTL | Purpose |
|---|---|---|---|
| `application-drafts`  | `/citizenId` | 30 days  | Saved-but-not-submitted application forms |
| `slot-filling-cache`  | `/sessionId` | 24 hours | Conversational form-filling state across turns |
| `session-state`       | `/sessionId` | 8 hours  | Per-channel session continuity (web -> voice handover) |

## Files

| File | Purpose |
|---|---|
| `cosmos-account.bicep` | Per-country Cosmos DB account + database + 3 containers + diagnostic-settings to Log Analytics + Private Endpoint binding |
| `parameters/dk.bicepparam` | DK params (region pin, KV ref) |
| `parameters/se.bicepparam` | SE params |
| `parameters/no.bicepparam` | NO params |

## Owner

Agent A4 (data plane) co-owns with A8 (case management).
