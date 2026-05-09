[CmdletBinding()]
param([switch] $Offline)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')

foreach ($file in @('bastion.bicep', 'nsg-bastion.bicep', 'README.md')) {
  if (-not (Test-Path (Join-Path $root $file))) {
    throw "Missing required Bastion asset: $file"
  }
}

$bastion = Get-Content -Path (Join-Path $root 'bastion.bicep') -Raw
foreach ($country in @('dk', 'se', 'no')) {
  if ($bastion -notmatch "'$country'") {
    throw "bastion.bicep does not define country $country"
  }
}
foreach ($required in @("name: 'Standard'", 'enableIpConnect: true', 'enableTunneling: true', 'publicIPAllocationMethod: ''Static''')) {
  if ($bastion -notmatch [regex]::Escape($required)) {
    throw "bastion.bicep missing expected setting: $required"
  }
}

$nsg = Get-Content -Path (Join-Path $root 'nsg-bastion.bicep') -Raw
foreach ($port in @("'443'", "'4443'", "'22'", "'3389'")) {
  if ($nsg -notmatch [regex]::Escape($port)) {
    throw "nsg-bastion.bicep missing port $port"
  }
}

if (-not $Offline) {
  Write-Warning 'Online Azure validation is not implemented in this scaffold; rerun with -Offline for deterministic repository validation.'
}

[pscustomobject]@{
  Component = 'Azure Bastion'
  Mode = if ($Offline) { 'Offline' } else { 'OfflineScaffold' }
  CountryHosts = 3
  Status = 'Passed'
}
