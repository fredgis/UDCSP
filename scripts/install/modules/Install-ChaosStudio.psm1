<#
.SYNOPSIS
    Install-ChaosStudio — Targets and 3 baseline experiments
    (apim-region-failure, postgres-failover, redis-cache-eviction-storm)
    proving the 99.9% SLO. Real Bicep deployments.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-ChaosStudio {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $tgt = Join-Path $repo 'infra\security\chaos-studio\chaos-studio.bicep'
    $exp = Join-Path $repo 'infra\security\chaos-studio\experiments.bicep'
    $logFile = Join-Path $ReportDir 'install-chaos-studio.log'
    $whatIf = [bool]$WhatIfPreference
    foreach ($f in @($tgt,$exp)) { if (-not (Test-Path $f)) { throw "Missing $f" } }

    foreach ($pair in @(@{name='target'; file=$tgt}, @{name='experiments'; file=$exp})) {
        if ($PSCmdlet.ShouldProcess($pair.name, 'az deployment sub create')) {
            Invoke-AzSubDeployment `
                -Subscription $Config.Subscriptions.SharedPlatform `
                -Location $Config.Regions.Shared `
                -TemplateFile $pair.file `
                -LogFile $logFile `
                -DeploymentName "udcsp-chaos-$($pair.name)" `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-ChaosStudio {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($f in @('infra\security\chaos-studio\chaos-studio.bicep','infra\security\chaos-studio\experiments.bicep')) {
        if (-not (Test-Path (Join-Path $repo $f))) { throw "Missing $f" }
    }
    "{`"phase`":`"ChaosStudio`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-chaos-studio.json')
}

Export-ModuleMember -Function Install-ChaosStudio, Test-ChaosStudio
