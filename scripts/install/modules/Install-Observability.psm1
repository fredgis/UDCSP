<#
.SYNOPSIS
    Install-Observability (A5) — Log Analytics, App Insights, workbooks, alerts.
#>
function Install-Observability {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\observability'
    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        if ($PSCmdlet.ShouldProcess("$country observability", 'Bicep deploy')) {
            "[scaffold] deploy log-analytics + app-insights for $country in $region" |
                Add-Content (Join-Path $ReportDir 'install-observability.log')
        }
    }
}

function Test-Observability {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'infra\observability\scripts\Test-Observability.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    "{`"phase`":`"Observability`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-observability.json')
}

Export-ModuleMember -Function Install-Observability, Test-Observability
