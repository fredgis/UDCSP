<#
.SYNOPSIS
    Install-CopilotStudio (A11) — Bot, topics, knowledge sources, channels.
#>
function Install-CopilotStudio {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $importer = Join-Path $repo 'apps\copilot-studio\scripts\Import-CopilotStudio.ps1'
    if (-not (Test-Path $importer)) { Write-Warning "Importer missing: $importer"; return }
    if ($PSCmdlet.ShouldProcess('Copilot Studio bot', 'Import')) {
        "[scaffold] & $importer" | Add-Content (Join-Path $ReportDir 'install-copilot-studio.log')
    }
}

function Test-CopilotStudio {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bot = Join-Path $repo 'apps\copilot-studio\agents\citizen-assistant-bot\bot.yaml'
    if (-not (Test-Path $bot)) { throw "Missing bot.yaml" }
    "{`"phase`":`"CopilotStudio`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-copilot-studio.json')
}

Export-ModuleMember -Function Install-CopilotStudio, Test-CopilotStudio
