<#
.SYNOPSIS
    Import-TopicRouter — imports the Foundry `topic-router` agent into a
    target Foundry workspace.

.DESCRIPTION
    Calls the Foundry CLI to deploy `agent.yaml` into the target
    workspace, registering the 12 topic files, the 4 connection
    definitions, the 2 knowledge sources, and the escalation rules.

    -DryRun runs the offline structure check (Test-TopicRouter.ps1) and
    emits the [scaffold] command lines that would be executed, without
    contacting any Foundry endpoint.

.PARAMETER FoundryWorkspace
    Foundry workspace name (e.g. udcsp-foundry-dk).

.PARAMETER DryRun
    Validate the package and emit [scaffold] markers only — no network call.

.EXAMPLE
    pwsh foundry/agents/topic-router/scripts/Import-TopicRouter.ps1 -DryRun

.EXAMPLE
    pwsh foundry/agents/topic-router/scripts/Import-TopicRouter.ps1 -FoundryWorkspace udcsp-foundry-dk
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$FoundryWorkspace = $env:UDCSP_FOUNDRY_WORKSPACE,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')

# Step 1 — always run the offline structure check first.
& (Join-Path $PSScriptRoot 'Test-TopicRouter.ps1') -Quiet

$agentYaml = Join-Path $root 'agent.yaml'
$line = "[scaffold] foundry agents create --workspace $FoundryWorkspace --file $agentYaml"

if ($DryRun) {
    Write-Host "[Import-TopicRouter] DryRun — agent package validated."
    Write-Host $line
    return
}

if (-not $FoundryWorkspace) {
    throw "FoundryWorkspace not provided (parameter -FoundryWorkspace or env UDCSP_FOUNDRY_WORKSPACE)."
}

if ($PSCmdlet.ShouldProcess($FoundryWorkspace, "Foundry agent deploy from $agentYaml")) {
    Write-Host $line
}
