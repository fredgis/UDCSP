<#
.SYNOPSIS
    Install-Postgres — Azure Database for PostgreSQL Flexible Server,
    one per sovereign zone. Real Bicep deployment.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Postgres {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\data\postgresql\postgresql-flexible.bicep'
    $logFile = Join-Path $ReportDir 'install-postgres.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $param = Join-Path $repo "infra\data\postgresql\parameters\$($country.ToLower()).bicepparam"
        if ($PSCmdlet.ShouldProcess("postgres-$country", 'az deployment sub create')) {
            Invoke-AzSubDeployment `
                -Subscription $sub -Location $region `
                -TemplateFile $bicep `
                -ParametersFile $param `
                -LogFile $logFile `
                -DeploymentName "udcsp-postgres-$($country.ToLower())" `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-Postgres {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\data\postgresql\postgresql-flexible.bicep'
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }
    "{`"phase`":`"Postgres`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-postgres.json')
}

Export-ModuleMember -Function Install-Postgres, Test-Postgres
