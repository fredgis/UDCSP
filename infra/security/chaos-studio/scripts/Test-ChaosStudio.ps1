[CmdletBinding()]
param(
    [switch]$Offline,
    [string]$Path = (Join-Path $PSScriptRoot '..')
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path $Path
$files = @('chaos-studio.bicep', 'experiments.bicep') | ForEach-Object { Join-Path $root $_ }
$combined = ($files | ForEach-Object { Get-Content -Raw -Path $_ }) -join "`n"

$required = @(
    'Microsoft.Chaos/experiments',
    'apim-region-failure',
    'postgres-failover',
    'redis-cache-eviction-storm',
    'Container Apps',
    'D365'
)

foreach ($needle in $required) {
    if ($combined -notmatch [regex]::Escape($needle)) {
        throw "Missing expected Chaos marker: $needle"
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

Write-Host 'Chaos Studio checks passed.'

