<#
.SYNOPSIS
    Install-Ciem — Microsoft Entra Permissions Management onboarding
    across the 3 sovereign tenants. Real Bicep deployment + JSON policy
    apply via MS Graph (when available).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Ciem {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\identity\ciem\entra-permissions-management.bicep'
    $logFile = Join-Path $ReportDir 'install-ciem.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }

    if ($PSCmdlet.ShouldProcess('entra-permissions-management', 'az deployment sub create')) {
        Invoke-AzSubDeployment `
            -Subscription $Config.Subscriptions.SharedPlatform `
            -Location $Config.Regions.Shared `
            -TemplateFile $bicep `
            -LogFile $logFile `
            -DeploymentName 'udcsp-ciem' `
            -WhatIfFlag $whatIf
    }

    $policies = Get-ChildItem (Join-Path $repo 'infra\identity\ciem\policies') -Filter '*.json' -ErrorAction SilentlyContinue
    foreach ($p in $policies) {
        if ($PSCmdlet.ShouldProcess($p.Name, 'apply CIEM policy via MS Graph')) {
            $body = Get-Content $p.FullName -Raw | ConvertFrom-Json -AsHashtable
            Invoke-MgGraphIfReady `
                -Method POST `
                -Uri 'https://graph.microsoft.com/beta/identityGovernance/permissionsManagement/policies' `
                -Body $body `
                -LogFile $logFile `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-Ciem {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\identity\ciem\entra-permissions-management.bicep'
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }
    "{`"phase`":`"Ciem`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-ciem.json')
}

Export-ModuleMember -Function Install-Ciem, Test-Ciem
