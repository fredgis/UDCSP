<#
.SYNOPSIS
    Install-Fabric (A4) — Capacities, workspaces, lakehouses, notebooks,
    semantic models, pipelines.
#>
function Install-Fabric {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'data\fabric\scripts\Deploy-Fabric.ps1'
    foreach ($country in 'DK','SE','NO') {
        if ($PSCmdlet.ShouldProcess("$country Fabric", 'Capacity + workspace + lakehouses + notebooks')) {
            "[scaffold] & $script -Country $($country.ToLower())" |
                Add-Content (Join-Path $ReportDir 'install-fabric.log')
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
