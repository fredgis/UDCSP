[CmdletBinding()]
param(
    [switch]$Offline,
    [string]$PlanTemplate = (Join-Path $PSScriptRoot '..\ddos-protection-plan.bicep'),
    [string]$AssociationTemplate = (Join-Path $PSScriptRoot '..\vnet-association.bicep')
)

$ErrorActionPreference = 'Stop'
$plan = Resolve-Path $PlanTemplate
$association = Resolve-Path $AssociationTemplate
$combined = (Get-Content -Raw -Path $plan) + "`n" + (Get-Content -Raw -Path $association)

$required = @(
    'Microsoft.Network/ddosProtectionPlans',
    'enableDdosProtection: true',
    'ddosProtectionPlan',
    "purpose: 'ddos-l3l4'",
    'ddosProtectionPlanId'
)

foreach ($needle in $required) {
    if ($combined -notmatch [regex]::Escape($needle)) {
        throw "Missing expected DDoS marker: $needle"
    }
}

if (-not $Offline) {
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        throw 'Azure CLI is required unless -Offline is specified.'
    }
    az bicep build --file $plan | Out-Null
    az bicep build --file $association | Out-Null
}

Write-Host 'DDoS checks passed.'

