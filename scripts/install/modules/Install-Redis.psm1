<#
.SYNOPSIS
    Install-Redis — Azure Cache for Redis Enterprise, one per sovereign
    zone. Real Bicep deployment.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Redis {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\data\redis\redis-enterprise.bicep'
    $logFile = Join-Path $ReportDir 'install-redis.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $param = Join-Path $repo "infra\data\redis\parameters\$($country.ToLower()).bicepparam"
        if ($PSCmdlet.ShouldProcess("redis-$country", 'az deployment sub create')) {
            Invoke-AzSubDeployment `
                -Subscription $sub -Location $region `
                -TemplateFile $bicep `
                -ParametersFile $param `
                -LogFile $logFile `
                -DeploymentName "udcsp-redis-$($country.ToLower())" `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-Redis {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\data\redis\redis-enterprise.bicep'
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }
    "{`"phase`":`"Redis`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-redis.json')
}

Export-ModuleMember -Function Install-Redis, Test-Redis
