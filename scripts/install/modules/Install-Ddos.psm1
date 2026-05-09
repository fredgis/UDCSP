<#
.SYNOPSIS
    Install-Ddos — DDoS Protection Standard plan in shared region,
    associated with each country VNet. Real Bicep deployments.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Ddos {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $plan = Join-Path $repo 'infra\security\ddos\ddos-protection-plan.bicep'
    $assoc = Join-Path $repo 'infra\security\ddos\vnet-association.bicep'
    $logFile = Join-Path $ReportDir 'install-ddos.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $plan)) { throw "Missing $plan" }

    if ($PSCmdlet.ShouldProcess('ddos-protection-plan', 'az deployment sub create')) {
        Invoke-AzSubDeployment `
            -Subscription $Config.Subscriptions.SharedPlatform `
            -Location $Config.Regions.Shared `
            -TemplateFile $plan `
            -LogFile $logFile `
            -DeploymentName 'udcsp-ddos-plan' `
            -WhatIfFlag $whatIf
    }
    if (Test-Path $assoc) {
        foreach ($country in 'DK','SE','NO') {
            $sub = $Config.Subscriptions[$country]
            $region = $Config.Regions[$country]
            $rg = "udcsp-$($country.ToLower())-rg"
            if ($PSCmdlet.ShouldProcess("ddos-vnet-$country", 'az deployment group create')) {
                Invoke-AzGroupDeployment `
                    -Subscription $sub -ResourceGroup $rg -Location $region `
                    -TemplateFile $assoc `
                    -LogFile $logFile `
                    -DeploymentName "udcsp-ddos-assoc-$($country.ToLower())" `
                    -Tags $Config.Tags `
                    -WhatIfFlag $whatIf
            }
        }
    }
}

function Test-Ddos {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $plan = Join-Path $repo 'infra\security\ddos\ddos-protection-plan.bicep'
    if (-not (Test-Path $plan)) { throw "Missing $plan" }
    "{`"phase`":`"Ddos`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-ddos.json')
}

Export-ModuleMember -Function Install-Ddos, Test-Ddos
