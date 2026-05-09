[CmdletBinding()]
param(
    [switch]$Offline
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $Root 'priva-config.yaml'
$PolicyPath = Join-Path $Root 'priva-policies'
$TemplatePath = Join-Path $Root 'dsr-templates'

function Assert-Contains {
    param([string]$Text, [string]$Needle, [string]$Message)
    if ($Text -notmatch [regex]::Escape($Needle)) {
        throw $Message
    }
}

if (-not $Offline) {
    Write-Warning 'Online Priva API validation is not implemented in this repository scaffold. Running offline consistency checks.'
}

$config = Get-Content -Raw -Path $ConfigPath
foreach ($requestType in @('access','erasure','rectification','restriction','portability','objection','automated-decision-making')) {
    Assert-Contains $config "- $requestType" "Missing DSR request type: $requestType"
}
foreach ($source in @('postgresql','redis','adlsGen2','dataverse','fabricLakehouses')) {
    Assert-Contains $config "$source`:" "Missing data source: $source"
}
Assert-Contains $config 'standardDays: 30' 'Missing 30-day standard SLA'
Assert-Contains $config 'months: 2' 'Missing two-month complex-request extension'
Assert-Contains $config 'dsrAuditLogs: "P7Y"' 'Missing seven-year DSR audit retention'
Assert-Contains $config 'excludeLayers:' 'Missing Fabric exclusion configuration'
Assert-Contains $config '- bronze' 'Fabric bronze layer must be excluded'

foreach ($policy in @('data-minimization-policy.json','transfer-policy.json','dsr-routing-policy.json')) {
    $fullPath = Join-Path $PolicyPath $policy
    if (-not (Test-Path $fullPath)) { throw "Missing policy: $policy" }
    Get-Content -Raw -Path $fullPath | ConvertFrom-Json | Out-Null
}

$languages = @('da','sv','nb','nn','se','en','de','fr','pl','ar','uk','fi')
foreach ($lang in $languages) {
    foreach ($kind in @('acknowledgement','completion')) {
        $template = Join-Path $TemplatePath "dsr-$kind-$lang.md"
        if (-not (Test-Path $template)) { throw "Missing template: $template" }
        $text = Get-Content -Raw -Path $template
        Assert-Contains $text '{{privaRequestId}}' "Template $template missing Priva request placeholder"
    }
}

Write-Host 'Priva offline smoke test passed.'
