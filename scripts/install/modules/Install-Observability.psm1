<#
.SYNOPSIS
    Install-Observability — Log Analytics, App Insights, workbooks, alerts.
    Real Bicep deployments per sovereign country zone.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Observability {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\observability'
    $logFile = Join-Path $ReportDir 'install-observability.log'
    $whatIf = [bool]$WhatIfPreference

    $bicepFiles = Get-ChildItem -Path $bicepRoot -Filter '*.bicep' -File -ErrorAction SilentlyContinue
    if (-not $bicepFiles) { throw "No Bicep files under $bicepRoot" }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-observability-rg"
        foreach ($f in $bicepFiles) {
            if ($PSCmdlet.ShouldProcess("$($f.BaseName)-$country", 'az deployment group create')) {
                Invoke-AzGroupDeployment `
                    -Subscription $sub -ResourceGroup $rg -Location $region `
                    -TemplateFile $f.FullName `
                    -LogFile $logFile `
                    -DeploymentName "udcsp-obs-$($f.BaseName)-$($country.ToLower())" `
                    -Tags $Config.Tags `
                    -WhatIfFlag $whatIf
            }
        }
    }
}

function Test-Observability {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\observability'
    if (-not (Get-ChildItem -Path $bicepRoot -Filter '*.bicep' -File -ErrorAction SilentlyContinue)) {
        throw "No Bicep templates under $bicepRoot"
    }
    "{`"phase`":`"Observability`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-observability.json')
}

Export-ModuleMember -Function Install-Observability, Test-Observability
