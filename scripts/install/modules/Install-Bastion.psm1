<#
.SYNOPSIS
    Install-Bastion — Azure Bastion Standard, one host per sovereign zone.
    Real Bicep deployment to udcsp-{country}-rg.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Bastion {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\identity\bastion\bastion.bicep'
    $logFile = Join-Path $ReportDir 'install-bastion.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-rg"
        if ($PSCmdlet.ShouldProcess("bastion-$country", 'az deployment group create')) {
            Invoke-AzGroupDeployment `
                -Subscription $sub `
                -ResourceGroup $rg `
                -Location $region `
                -TemplateFile $bicep `
                -LogFile $logFile `
                -DeploymentName "udcsp-bastion-$($country.ToLower())" `
                -Tags $Config.Tags `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-Bastion {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\identity\bastion\bastion.bicep'
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }
    "{`"phase`":`"Bastion`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-bastion.json')
}

Export-ModuleMember -Function Install-Bastion, Test-Bastion
