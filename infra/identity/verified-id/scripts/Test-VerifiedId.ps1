[CmdletBinding()]
param([switch] $Offline)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')

$requiredFiles = @(
  'verified-id-issuer.bicep',
  'credential-contracts\udcsp-residency-credential.json',
  'credential-contracts\udcsp-eligibility-receipt.json',
  'credential-contracts\udcsp-eudi-wallet-bridge.json',
  'presentation-policies\udcsp-residency-credential.json',
  'presentation-policies\udcsp-eligibility-receipt.json',
  'presentation-policies\udcsp-eudi-wallet-bridge.json',
  'README.md'
)

foreach ($file in $requiredFiles) {
  $path = Join-Path $root $file
  if (-not (Test-Path $path)) {
    throw "Missing required Verified ID asset: $file"
  }
}

Get-ChildItem -Path (Join-Path $root 'credential-contracts') -Filter '*.json' | ForEach-Object {
  $json = Get-Content -Path $_.FullName -Raw | ConvertFrom-Json
  foreach ($field in @('subjectId', 'issuedAt', 'validUntil')) {
    if (-not ($json.required -contains $field)) {
      throw "$($_.Name) does not require $field"
    }
  }
}

Get-ChildItem -Path (Join-Path $root 'presentation-policies') -Filter '*.json' | ForEach-Object {
  $json = Get-Content -Path $_.FullName -Raw | ConvertFrom-Json
  if ($json.openid4vp.responseType -ne 'vp_token') {
    throw "$($_.Name) is not configured for OpenID4VP vp_token"
  }
}

if (-not $Offline) {
  Write-Warning 'Online Azure validation is not implemented in this scaffold; rerun with -Offline for deterministic repository validation.'
}

[pscustomobject]@{
  Component = 'Verified ID'
  Mode = if ($Offline) { 'Offline' } else { 'OfflineScaffold' }
  Contracts = 3
  PresentationPolicies = 3
  Status = 'Passed'
}
