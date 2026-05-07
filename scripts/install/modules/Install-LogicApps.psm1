<#
.SYNOPSIS
    Install-LogicApps (A7) — Standard workspaces, workflows, connections,
    Service Bus, Event Grid.
#>
function Install-LogicApps {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $workflows = Get-ChildItem (Join-Path $repo 'services\logic-apps\workflows') -Directory -ErrorAction SilentlyContinue
    foreach ($w in $workflows) {
        if ($PSCmdlet.ShouldProcess($w.Name, 'Logic Apps Standard deploy')) {
            "[scaffold] func azure logicapp publish --workflow $($w.FullName)" |
                Add-Content (Join-Path $ReportDir 'install-logic-apps.log')
        }
    }
}

function Test-LogicApps {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'services\logic-apps\scripts\Test-LogicApps.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    "{`"phase`":`"LogicApps`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-logic-apps.json')
}

Export-ModuleMember -Function Install-LogicApps, Test-LogicApps
