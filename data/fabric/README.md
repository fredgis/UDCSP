# UDCSP Data Platform — Microsoft Fabric

## Purpose
Scaffolds the A4 Fabric data platform for Denmark, Sweden and Norway: F-SKU capacities, sovereign workspaces, bronze/silver/gold lakehouses, Dataverse mirroring ingestion, Real-Time Intelligence, DirectLake semantic model and Power BI report layout.

## Deploy
1. Deploy `capacities/fabric-capacity-*.bicep` with `country`, `env`, `location` and `capacitySku` parameters.
2. Run `scripts/Deploy-Fabric.ps1 -Environment dev -WorkspaceConfig workspaces/workspace-config.json` after authenticating to Azure/Fabric.
3. Import lakehouse metadata, notebooks, pipelines and semantic model definitions.

## Test
Run `scripts/Test-Fabric.ps1 -Country dk -Offline`. In a tenant, pass `-WorkspaceId` and `-FabricToken` to execute the KPI notebook and validate the gold schema.

## Tear-down
Remove imported Fabric items, delete workspaces, then delete country capacities. Preserve OneLake data exports if audit retention is active.

## Owner
A4 — Data Platform (Microsoft Fabric).
