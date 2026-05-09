<#
.SYNOPSIS
    Install-Foundry (A6) — Hub & projects, agents, prompts, eval suites,
    Content Safety, AI Act registry alignment.
#>
function Install-Foundry {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $agentsRoot = Join-Path $repo 'foundry\agents'
    $agents = Get-ChildItem $agentsRoot -Directory -ErrorAction SilentlyContinue
    foreach ($a in $agents) {
        $yaml = Join-Path $a.FullName 'agent.yaml'
        if (-not (Test-Path $yaml)) { continue }
        if ($PSCmdlet.ShouldProcess($a.Name, "Foundry agent deploy from $yaml")) {
            "[scaffold] foundry agents create --workspace $($Config.FoundryWorkspace.Name) --file $yaml" |
                Add-Content (Join-Path $ReportDir 'install-foundry.log')
        }
    }
}

function Test-Foundry {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $expected = 'classifier','translator','eligibility','citizen-assistant','doc-extractor','caseworker-helper','topic-router'
    $missing = @()
    foreach ($a in $expected) {
        $p = Join-Path $repo "foundry\agents\$a\agent.yaml"
        if (-not (Test-Path $p)) { $missing += $a }
    }
    if ($missing) { throw "Missing Foundry agents: $($missing -join ', ')" }
    $tr = Join-Path $repo 'foundry\agents\topic-router\scripts\Test-TopicRouter.ps1'
    if (Test-Path $tr) {
        & $tr -Quiet
    }
    "{`"phase`":`"Foundry`",`"agents`":$($expected.Count)}" | Set-Content (Join-Path $ReportDir 'test-foundry.json')
}

Export-ModuleMember -Function Install-Foundry, Test-Foundry
