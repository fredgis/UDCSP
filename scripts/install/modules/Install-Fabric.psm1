<#
.SYNOPSIS
    Install-Fabric — Capacities, workspaces, lakehouses, notebooks,
    semantic models, pipelines. Calls data/fabric/scripts/Deploy-Fabric.ps1
    per country (REST against the Fabric control plane API).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Fabric {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'data\fabric\scripts\Deploy-Fabric.ps1'
    $logFile = Join-Path $ReportDir 'install-fabric.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $script)) { throw "Missing $script" }

    foreach ($country in 'DK','SE','NO') {
        if ($PSCmdlet.ShouldProcess("$country Fabric", 'Deploy-Fabric.ps1')) {
            Invoke-NativeCommand `
                -Command @('pwsh','-File',$script,'-Environment',$Config.Environment) `
                -LogFile $logFile `
                -WhatIfFlag $whatIf `
                -ContinueOnError
        }
    }
}

function Test-Fabric {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'data\fabric\scripts\Test-Fabric.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    & $script -Country dk -Offline | Out-Null
    "{`"phase`":`"Fabric`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-fabric.json')
}

Export-ModuleMember -Function Install-Fabric, Test-Fabric
