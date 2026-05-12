<#
.SYNOPSIS
    Install-Foundry — Hub & projects, agents, prompts, eval suites,
    Content Safety, AI Act registry alignment. Imports each agent
    package via its agent-specific Import-*.ps1 (or generic REST).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Foundry {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $logFile = Join-Path $ReportDir 'install-foundry.log'
    $whatIf = [bool]$WhatIfPreference

    $fw = $Config.FoundryWorkspace
    if (-not $fw) { throw "Config.FoundryWorkspace not set" }
    foreach ($k in 'Subscription','ResourceGroup','Name') {
        if (-not $fw.$k) { throw "Config.FoundryWorkspace.$k not set" }
    }
    $project = $fw.Project   # optional; importer auto-detects if omitted

    $importer = Join-Path $repo 'foundry\scripts\Import-FoundryAgent.ps1'
    if (-not (Test-Path $importer)) { throw "Generic importer not found at $importer" }

    $agentsRoot = Join-Path $repo 'foundry\agents'
    $agents = Get-ChildItem -Path $agentsRoot -Directory -ErrorAction SilentlyContinue
    foreach ($a in $agents) {
        $yaml = Join-Path $a.FullName 'agent.yaml'
        if (-not (Test-Path $yaml)) { continue }

        if ($PSCmdlet.ShouldProcess($a.Name, "Foundry agent deploy ($($fw.Name))")) {
            $argList = @(
                'pwsh','-NoProfile','-NoLogo','-NonInteractive','-File',$importer,
                '-AgentDir',$a.FullName,
                '-Subscription',$fw.Subscription,
                '-ResourceGroup',$fw.ResourceGroup,
                '-AccountName',$fw.Name
            )
            if ($project) { $argList += @('-ProjectName',$project) }

            Invoke-NativeCommand `
                -Command $argList `
                -LogFile $logFile `
                -WhatIfFlag $whatIf `
                -ContinueOnError
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
    if (Test-Path $tr) { & $tr -Quiet }
    "{`"phase`":`"Foundry`",`"agents`":$($expected.Count)}" | Set-Content (Join-Path $ReportDir 'test-foundry.json')
}

Export-ModuleMember -Function Install-Foundry, Test-Foundry
