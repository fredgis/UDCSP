[CmdletBinding()]
param(
    [switch]$Offline,
    [string]$TemplatePath = (Join-Path $PSScriptRoot '..\confidential-ledger.bicep')
)

$ErrorActionPreference = 'Stop'
$template = Resolve-Path $TemplatePath
$content = Get-Content -Raw -Path $template

$required = @(
    'Microsoft.ConfidentialLedger/ledgers',
    "ledgerType: 'Public'",
    'aadBasedSecurityPrincipals',
    "ledgerRoleName: 'Contributor'",
    "ledgerRoleName: 'Reader'",
    'ApplicationLogs',
    'ledgerUri',
    'identityServiceUri'
)

foreach ($needle in $required) {
    if ($content -notmatch [regex]::Escape($needle)) {
        throw "Missing expected Confidential Ledger marker: $needle"
    }
}

if (-not $Offline) {
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        throw 'Azure CLI is required unless -Offline is specified.'
    }
    az bicep build --file $template | Out-Null
}

Write-Host 'Confidential Ledger checks passed.'

