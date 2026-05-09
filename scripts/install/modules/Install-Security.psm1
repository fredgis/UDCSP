<#
.SYNOPSIS
    Install-Security — Defender for Cloud, Defender for APIs, Sentinel,
    Azure Policy. Real Bicep deployments per subscription.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Security {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $defender = Join-Path $repo 'infra\security\defender\defender-for-cloud.bicep'
    $sentinel = Join-Path $repo 'infra\security\sentinel\sentinel-workspace.bicep'
    $logFile  = Join-Path $ReportDir 'install-security.log'
    $whatIf   = [bool]$WhatIfPreference
    foreach ($f in @($defender, $sentinel)) { if (-not (Test-Path $f)) { throw "Missing $f" } }

    foreach ($scope in 'DK','SE','NO','SharedPlatform') {
        $sub = $Config.Subscriptions[$scope]
        if (-not $sub) { continue }
        $region = if ($scope -eq 'SharedPlatform') { $Config.Regions.Shared } else { $Config.Regions[$scope] }
        if ($PSCmdlet.ShouldProcess("$scope defender", 'az deployment sub create')) {
            Invoke-AzSubDeployment `
                -Subscription $sub -Location $region `
                -TemplateFile $defender `
                -LogFile $logFile `
                -DeploymentName "udcsp-defender-$($scope.ToLower())" `
                -WhatIfFlag $whatIf
        }
        if ($PSCmdlet.ShouldProcess("$scope sentinel", 'az deployment sub create')) {
            Invoke-AzSubDeployment `
                -Subscription $sub -Location $region `
                -TemplateFile $sentinel `
                -LogFile $logFile `
                -DeploymentName "udcsp-sentinel-$($scope.ToLower())" `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-Security {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $required = @(
        'infra\security\defender\defender-for-cloud.bicep',
        'infra\security\sentinel\sentinel-workspace.bicep',
        'governance\dpia\dpia-template.md',
        'governance\dpia\dpia-eligibility-model.md'
    )
    foreach ($r in $required) {
        $p = Join-Path $repo $r
        if (-not (Test-Path $p)) { throw "Missing security artefact: $r" }
    }
    "{`"phase`":`"Security`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-security.json')
}

Export-ModuleMember -Function Install-Security, Test-Security
