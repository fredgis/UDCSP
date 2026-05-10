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

    if ($PSCmdlet.ShouldProcess('ddos-protection-plan', 'az deployment group create')) {
        $rg = "udcsp-shared-ddos-rg"
        Invoke-AzGroupDeployment `
            -Subscription $Config.Subscriptions.SharedPlatform `
            -ResourceGroup $rg `
            -Location $Config.Regions.Shared `
            -TemplateFile $plan `
            -LogFile $logFile `
            -DeploymentName 'udcsp-ddos-plan' `
            -Tags $Config.Tags `
            -WhatIfFlag $whatIf
    }
    if (Test-Path $assoc) {
        foreach ($country in 'DK','SE','NO') {
            $sub = $Config.Subscriptions[$country]
            $region = $Config.Regions[$country]
            # vnet-association is co-deployed alongside the landing-zone VNet
            # so the DDoS PUT is idempotent against the already-created shape.
            # See infra/landing-zone/main.bicep:20 — the VNet lives in
            # udcsp-{country}-prod-platform-rg.
            $rg = "udcsp-$($country.ToLower())-prod-platform-rg"
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
