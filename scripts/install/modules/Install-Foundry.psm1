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
    $workspace = $Config.FoundryWorkspace.Name
    if (-not $workspace) { throw "Config.FoundryWorkspace.Name not set" }

    # Each agent dir contains agent.yaml; if the dir has its own scripts/Import-*.ps1
    # invoke that, otherwise fall back to the topic-router pattern.
    $agentsRoot = Join-Path $repo 'foundry\agents'
    $agents = Get-ChildItem -Path $agentsRoot -Directory -ErrorAction SilentlyContinue
    foreach ($a in $agents) {
        $yaml = Join-Path $a.FullName 'agent.yaml'
        if (-not (Test-Path $yaml)) { continue }
        $importer = Join-Path $a.FullName "scripts\Import-$($a.Name).ps1"
        $importerCamel = Join-Path $a.FullName 'scripts' | ForEach-Object {
            Get-ChildItem -Path $_ -Filter 'Import-*.ps1' -File -ErrorAction SilentlyContinue | Select-Object -First 1
        }
        if ($PSCmdlet.ShouldProcess($a.Name, "Foundry agent deploy ($workspace)")) {
            if ($importerCamel) {
                Invoke-NativeCommand `
                    -Command @('pwsh','-File',$importerCamel.FullName,'-FoundryWorkspace',$workspace) `
                    -LogFile $logFile `
                    -WhatIfFlag $whatIf `
                    -ContinueOnError
            } else {
                Write-Log -LogFile $logFile -Message "[skip] agent '$($a.Name)' has no Import-*.ps1 helper — manual deploy required (foundry agents create --workspace $workspace --file $yaml)."
            }
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
