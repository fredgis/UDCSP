<#
.SYNOPSIS
    Install-LandingZone — MG hierarchy, networking, Key Vault, ACR,
    Storage per sovereign country zone. Real Bicep deployment.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-LandingZone {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)

    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\landing-zone'
    $main = Join-Path $bicepRoot 'main.bicep'
    $logFile = Join-Path $ReportDir 'install-landing-zone.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $main)) { throw "Missing $main" }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $param = Join-Path $bicepRoot "parameters\$($country.ToLower()).bicepparam"
        if ($PSCmdlet.ShouldProcess("$country landing zone", 'az deployment sub create')) {
            Invoke-AzSubDeployment `
                -Subscription $sub `
                -Location    $region `
                -TemplateFile $main `
                -ParametersFile $param `
                -LogFile     $logFile `
                -DeploymentName "udcsp-landing-zone-$($country.ToLower())" `
                -WhatIfFlag  $whatIf
        }
    }
}

function Test-LandingZone {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\landing-zone'
    $required = @(
        (Join-Path $bicepRoot 'main.bicep'),
        (Join-Path $bicepRoot 'modules\networking.bicep'),
        (Join-Path $bicepRoot 'modules\keyvault.bicep'),
        (Join-Path $bicepRoot 'modules\storage.bicep'),
        (Join-Path $bicepRoot 'modules\acr.bicep')
    )
    $missing = $required | Where-Object { -not (Test-Path $_) }
    if ($missing) { throw "Missing landing-zone artefacts: $($missing -join ', ')" }
    "{`"phase`":`"LandingZone`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-landing-zone.json')
}

Export-ModuleMember -Function Install-LandingZone, Test-LandingZone
