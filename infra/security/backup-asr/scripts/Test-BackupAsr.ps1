[CmdletBinding()]
param(
    [switch]$Offline,
    [string]$Path = (Join-Path $PSScriptRoot '..')
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path $Path
$files = @(
    'recovery-services-vault.bicep',
    'recovery-services-vault-country.bicep',
    'backup-policies.bicep',
    'site-recovery.bicep'
) | ForEach-Object { Join-Path $root $_ }

$combined = ($files | ForEach-Object { Get-Content -Raw -Path $_ }) -join "`n"
$required = @(
    'Microsoft.RecoveryServices/vaults',
    'GeoRedundant',
    'ZoneRedundant',
    'keyUri',
    'udcsp-postgres-daily',
    'udcsp-storage-daily',
    'udcsp-vm-daily',
    'same-country',
    'replicationPolicies'
)

foreach ($needle in $required) {
    if ($combined -notmatch [regex]::Escape($needle)) {
        throw "Missing expected Backup/ASR marker: $needle"
    }
}

if (-not $Offline) {
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        throw 'Azure CLI is required unless -Offline is specified.'
    }
    foreach ($file in $files) {
        az bicep build --file $file | Out-Null
    }
}

Write-Host 'Backup/ASR checks passed.'

