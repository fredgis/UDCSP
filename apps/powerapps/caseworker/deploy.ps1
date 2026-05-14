# Deploy the UDCSP Caseworker model-driven Power App to one or more
# Power Platform environments.
#
# Prerequisite: the udcsp_application table + the UDCSP Caseworker
# model-driven app have been authored ONCE in -SourceEnv via
# make.powerapps.com (see apps/powerapps/caseworker/README.md §"How to
# access the Power App").
#
# This script:
#   1. Locates pac.exe (PATH or %LOCALAPPDATA%\Microsoft\PowerAppsCLI\)
#   2. Runs `pac auth create --url <SourceEnv>` interactively if needed
#   3. Exports the UDCSPCore solution from -SourceEnv with embedded
#      customizations
#   4. For each -TargetEnvs entry: pac auth create + pac solution import
#      with --publish-changes
#
# Usage:
#   .\apps\powerapps\caseworker\deploy.ps1 `
#     -SourceEnv https://org939d8f07.crm4.dynamics.com `
#     -TargetEnvs @(
#       'https://udcspdk.crm4.dynamics.com',
#       'https://udcspse.crm4.dynamics.com',
#       'https://udcspno.crm4.dynamics.com'
#     )

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [string] $SourceEnv,

  [Parameter(Mandatory=$true)]
  [string[]] $TargetEnvs,

  [string] $SolutionName = 'UDCSPCore',

  [string] $OutDir = (Join-Path $PSScriptRoot 'out')
)

$ErrorActionPreference = 'Stop'

function Find-Pac {
  $cmd = Get-Command pac.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $root = Join-Path $env:LOCALAPPDATA 'Microsoft\PowerAppsCLI'
  if (Test-Path $root) {
    $found = Get-ChildItem $root -Recurse -Filter pac.exe -ErrorAction SilentlyContinue |
             Sort-Object FullName -Descending | Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  throw "pac.exe not found. Install via: winget install Microsoft.PowerAppsCLI"
}

$Pac = Find-Pac
Write-Host "Using pac at $Pac"

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$ZipPath = Join-Path $OutDir "$SolutionName.zip"

Write-Host "==> Authenticating against source $SourceEnv"
& $Pac auth create --url $SourceEnv

Write-Host "==> Selecting source org $SourceEnv"
& $Pac org select --environment $SourceEnv

Write-Host "==> Exporting solution $SolutionName from $SourceEnv -> $ZipPath"
& $Pac solution export `
  --name $SolutionName `
  --path $ZipPath `
  --include general,customization,autonumbering `
  --overwrite

if (-not (Test-Path $ZipPath)) {
  throw "Export failed: $ZipPath not produced"
}
Write-Host "==> Exported $((Get-Item $ZipPath).Length / 1KB) KB"

foreach ($target in $TargetEnvs) {
  Write-Host "`n==> Importing into $target"
  & $Pac auth create --url $target
  & $Pac org select --environment $target
  & $Pac solution import --path $ZipPath --publish-changes --force-overwrite
  Write-Host "==> Published to $target"
}

Write-Host "`nDone. Open the Power App in each environment via:"
foreach ($target in @($SourceEnv) + $TargetEnvs) {
  Write-Host "  $target/main.aspx?appname=udcsp_caseworker"
}
