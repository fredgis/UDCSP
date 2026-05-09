[CmdletBinding()]
param([switch] $Offline)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')

foreach ($file in @('entra-permissions-management.bicep', 'subscription-onboarding.bicep', 'policies\least-privilege-baseline.json', 'policies\cross-tenant-anomaly.json', 'README.md')) {
  if (-not (Test-Path (Join-Path $root $file))) {
    throw "Missing required CIEM asset: $file"
  }
}

$bicep = (Get-Content -Path (Join-Path $root 'entra-permissions-management.bicep') -Raw) + (Get-Content -Path (Join-Path $root 'subscription-onboarding.bicep') -Raw)
foreach ($marker in @('udcsp-dk-sovereign', 'udcsp-se-sovereign', 'udcsp-no-sovereign', 'udcsp-workforce-shared', 'Microsoft.Authorization/roleAssignments')) {
  if ($bicep -notmatch [regex]::Escape($marker)) {
    throw "CIEM Bicep missing expected onboarding marker: $marker"
  }
}

Get-ChildItem -Path (Join-Path $root 'policies') -Filter '*.json' | ForEach-Object {
  $json = Get-Content -Path $_.FullName -Raw | ConvertFrom-Json
  foreach ($property in @('id', 'name', 'severity', 'condition', 'actions')) {
    if (-not $json.PSObject.Properties.Name.Contains($property)) {
      throw "$($_.Name) missing property $property"
    }
  }
}

if (-not $Offline) {
  Write-Warning 'Online Azure validation is not implemented in this scaffold; rerun with -Offline for deterministic repository validation.'
}

[pscustomobject]@{
  Component = 'CIEM'
  Mode = if ($Offline) { 'Offline' } else { 'OfflineScaffold' }
  AzureSubscriptions = 4
  Policies = 2
  Status = 'Passed'
}
