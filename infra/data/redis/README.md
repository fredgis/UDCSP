# UDCSP - Redis Enterprise infrastructure

## Purpose

This folder defines one Azure Cache for Redis Enterprise cluster per country. Redis replaces the ephemeral Cosmos DB workloads: `slot-filling-cache` with 24 hour `EXPIRE`, `session-state` with 8 hour `EXPIRE`, and `application-drafts-ephemeral` with 30 minute `EXPIRE` before forms are committed to PostgreSQL.

## Sovereignty model

Each cluster is pinned to the country region (DK `northeurope`, SE `swedencentral`, NO `norwayeast`), exposed only through Private Link in the country VNet, encrypted with the country Key Vault key `udcsp-redis-cmk`, monitored by the country Log Analytics workspace and tagged for citizen-confidential data residency.

## Why Enterprise tier

Enterprise tier is the target because the UDCSP data plane requires CMK encryption, Microsoft Entra authentication, Private Endpoint isolation, TLS 1.2 minimum and production capacity headroom. The template keeps a `Basic_C0` parameter override for dev experiments, but sovereign deployments should use `Enterprise_E10`.

## GDPR Art. 5(1)(c) data minimisation via TTL

Redis is intentionally non-durable for these workloads. Application code must set `EXPIRE` on every write: 24 hours for slot filling, 8 hours for session state and 30 minutes for in-flight drafts. Durable drafts move to PostgreSQL JSONB.

## How to deploy

```powershell
az deployment group create `
  --resource-group udcsp-dk-data `
  --template-file .\infra\data\redis\redis-enterprise.bicep `
  --parameters .\infra\data\redis\parameters\dk.bicepparam
```

## How to validate

```powershell
.\infra\data\redis\scripts\Test-Redis.ps1 -Country dk -Offline
```
