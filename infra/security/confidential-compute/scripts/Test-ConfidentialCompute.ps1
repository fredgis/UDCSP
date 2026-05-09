[CmdletBinding()]
param(
    [switch]$Offline,
    [string]$EnvironmentTemplate = (Join-Path $PSScriptRoot '..\confidential-compute.bicep'),
    [string]$AppTemplate = (Join-Path $PSScriptRoot '..\eligibility-confidential-app.bicep')
)

$ErrorActionPreference = 'Stop'
$envTemplate = Resolve-Path $EnvironmentTemplate
$appTemplate = Resolve-Path $AppTemplate
$combined = (Get-Content -Raw -Path $envTemplate) + "`n" + (Get-Content -Raw -Path $appTemplate)

$required = @(
    'Microsoft.App/managedEnvironments',
    'workloadProfiles',
    'Confidential-Standard-NC8as-T4-v5',
    'infrastructureSubnetId',
    'Microsoft.App/containerApps',
    'udcspacr.azurecr.io/eligibility-tee:latest',
    'REQUIRE_ATTESTATION'
)

foreach ($needle in $required) {
    if ($combined -notmatch [regex]::Escape($needle)) {
        throw "Missing expected confidential compute marker: $needle"
    }
}

if (-not $Offline) {
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        throw 'Azure CLI is required unless -Offline is specified.'
    }
    az bicep build --file $envTemplate | Out-Null
    az bicep build --file $appTemplate | Out-Null
}

Write-Host 'Confidential Compute checks passed.'

