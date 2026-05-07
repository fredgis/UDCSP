[CmdletBinding()]
param([switch]$Offline,[string]$PurviewAccountName,[string]$Token = $env:PURVIEW_TOKEN)
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$required = 'NordicNationalID','HealthEntitlementCode','EligibilityScore','AIPromptText','AIDecisionTrace'
$found = Get-ChildItem (Join-Path $root 'classifications\*.json') | ForEach-Object { $_.BaseName }
$missing = $required | Where-Object { $_ -notin $found }
if ($missing) { throw "Missing classifications: $($missing -join ', ')" }
if (-not (Test-Path (Join-Path $root 'lineage\lineage-diagram.md'))) { throw 'Missing lineage diagram.' }
if ($Offline -or -not $PurviewAccountName) { Write-Host 'Offline Purview validation passed.'; exit 0 }
if (-not $Token) { throw 'Token is required for online Purview validation.' }
# TODO: case-study scaffold - query Atlas classifications and lineage process entities from the Purview endpoint.
Write-Host "TODO: online Purview validation for $PurviewAccountName."
