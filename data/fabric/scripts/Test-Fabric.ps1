[CmdletBinding()]
param(
  [ValidateSet('dk','se','no')][string]$Country = 'dk',
  [switch]$Offline,
  [string]$WorkspaceId,
  [string]$FabricToken
)
$schemaPath = Join-Path $PSScriptRoot '..\lakehouses\tables\schema-description.json'
$schema = Get-Content $schemaPath -Raw | ConvertFrom-Json
$expected = 'applications_decisions','ai_decisions','conversations','sla_events'
$missing = $expected | Where-Object { $_ -notin $schema.tables.name }
if ($missing) { throw "Gold schema missing tables: $($missing -join ', ')" }
if ($Offline -or -not $WorkspaceId) { Write-Host "Offline Fabric validation passed for $Country."; exit 0 }
if (-not $FabricToken) { throw 'FabricToken is required for online notebook execution.' }
# TODO: case-study scaffold - call Fabric Jobs API to run 03_silver_to_gold_kpis.py, then query DirectLake table metadata.
Write-Host "TODO: online Fabric notebook execution for workspace $WorkspaceId."
