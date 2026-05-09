# UDCSP - PostgreSQL infrastructure

## Purpose

This folder defines one Azure Database for PostgreSQL Flexible Server per country (`dk`, `se`, `no`). It replaces Azure SQL Database for reference data and glossaries, and replaces part of Cosmos DB for application drafts older than 24 hours using JSONB partitioned by `citizenId` with `pg_partman` for TTL partitioning.

## Sovereignty model

Each server is pinned to its country Azure region: DK `northeurope`, SE `swedencentral`, NO `norwayeast`. Public access is disabled, Private Link lands in the country VNet, authentication is Microsoft Entra ID only, backups stay country-controlled, and CMK is wrapped by the country Key Vault key `udcsp-postgres-cmk`.

## GDPR/AI Act anchors

- GDPR Art. 5: purpose limitation and minimisation are enforced by separating reference, draft and glossary databases.
- GDPR Art. 32: CMK, TLS/private access, Entra-only auth and diagnostics provide confidentiality and auditability.
- EU AI Act Art. 26(6): this is not the AI trace store; AI traces continue to go to Application Insights and OneLake, not PostgreSQL.

## How to deploy

```powershell
az deployment group create `
  --resource-group udcsp-dk-data `
  --template-file .\infra\data\postgresql\postgresql-flexible.bicep `
  --parameters .\infra\data\postgresql\parameters\dk.bicepparam
```

Repeat with `se` or `no` parameter files for the other sovereign zones.

## How to validate

```powershell
.\infra\data\postgresql\scripts\Test-Postgres.ps1 -Country dk -Offline
```

Remove `-Offline` in a configured tenant to run Azure what-if and the server output checks.
