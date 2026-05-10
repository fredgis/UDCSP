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

    # bicep targetScope = 'tenant' AND ciemPrincipalId is a mandatory
    # parameter (service principal object ID of the Permissions
    # Management collector). Without a real principal ID we cannot
    # deploy. Operators populate $Config.Ciem.PrincipalId after
    # registering the CIEM enterprise app in Entra ID.
    if (-not $Config.ContainsKey('Ciem') -or -not $Config.Ciem.PrincipalId) {
        Write-Log -LogFile $logFile -Message "[skip] Config.Ciem.PrincipalId is missing; CIEM onboarding deferred until the Permissions Management service principal is registered."
        return
    }

    $subs = @{
        DK = $Config.Subscriptions['DK']
        SE = $Config.Subscriptions['SE']
        NO = $Config.Subscriptions['NO']
        Shared = $Config.Subscriptions['SharedPlatform']
    }
    $azureSubscriptions = @(
        [ordered]@{ name='udcsp-dk-sovereign';     tenantType='sovereign-country'; country='dk';     subscriptionId=$subs.DK }
        [ordered]@{ name='udcsp-se-sovereign';     tenantType='sovereign-country'; country='se';     subscriptionId=$subs.SE }
        [ordered]@{ name='udcsp-no-sovereign';     tenantType='sovereign-country'; country='no';     subscriptionId=$subs.NO }
        [ordered]@{ name='udcsp-workforce-shared'; tenantType='workforce';         country='shared'; subscriptionId=$subs.Shared }
    )
    $ciemParams = [ordered]@{
        '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
        contentVersion = '1.0.0.0'
        parameters = [ordered]@{
            ciemPrincipalId    = @{ value = $Config.Ciem.PrincipalId }
            azureSubscriptions = @{ value = $azureSubscriptions }
        }
    }
    $paramsFile = Join-Path $ReportDir 'ciem.parameters.json'
    $ciemParams | ConvertTo-Json -Depth 8 | Set-Content $paramsFile -Encoding utf8

    if ($PSCmdlet.ShouldProcess('entra-permissions-management', 'az deployment tenant create')) {
        Invoke-AzTenantDeployment `
            -Location $Config.Regions.Shared `
            -TemplateFile $bicep `
            -ParametersFile $paramsFile `
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
