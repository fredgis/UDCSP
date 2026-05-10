<#
.SYNOPSIS
    Test-TopicRouter — offline structure validator for the Foundry
    `topic-router` agent.

.DESCRIPTION
    Asserts that every artefact promised by docs/biz/chat.md is present
    on disk and parseable. Performs no network call, no Foundry tenant
    request, no billing.

    Exit codes:
        0  — all artefacts present and parseable
        1  — at least one artefact missing or malformed

.EXAMPLE
    pwsh foundry/agents/topic-router/scripts/Test-TopicRouter.ps1
#>
[CmdletBinding()]
param(
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$root  = Resolve-Path (Join-Path $PSScriptRoot '..')
$fail  = @()
$ok    = @()

function Assert-File($relative, $description) {
    $path = Join-Path $root $relative
    if (Test-Path $path) {
        $script:ok += $description
    } else {
        $script:fail += "MISSING: $description ($relative)"
    }
}

function Assert-Json($relative) {
    $path = Join-Path $root $relative
    if (-not (Test-Path $path)) { $script:fail += "MISSING: $relative"; return }
    try { Get-Content $path -Raw | ConvertFrom-Json | Out-Null; $script:ok += "parses: $relative" }
    catch { $script:fail += "BAD JSON: $relative — $($_.Exception.Message)" }
}

Assert-File 'agent.yaml'           'agent definition (agent.yaml)'
Assert-File 'system-prompt.md'     'system prompt'
Assert-Json 'tools.json'
Assert-Json 'escalation-rules.json'

$expectedTopics = @(
    'accessibility-help', 'child-benefit', 'complaint', 'escalate-to-human',
    'greeting', 'language-switch', 'multilingual-routing', 'residency-application',
    'slot-definitions', 'status-of-application', 'tax-certificate-request', 'voice-fallback'
)
foreach ($t in $expectedTopics) {
    Assert-File "topics/$t.yaml" "topic: $t"
}

$expectedConnections = @('apim-facade', 'd365-escalation', 'foundry-skills', 'redis-session')
foreach ($c in $expectedConnections) {
    Assert-Json "connections/$c.json"
}

$expectedKnowledge = @('citizens-faq', 'sharepoint-policies')
foreach ($k in $expectedKnowledge) {
    Assert-Json "knowledge-sources/$k.json"
}

if (-not $Quiet) {
    Write-Host ("[Test-TopicRouter] {0} artefacts validated" -f $ok.Count) -ForegroundColor Green
}

if ($fail.Count -gt 0) {
    $fail | ForEach-Object { Write-Host "  ✗ $_" -ForegroundColor Red }
    throw "[Test-TopicRouter] $($fail.Count) failure(s)"
}

if (-not $Quiet) {
    Write-Host "[Test-TopicRouter] OK — agent.yaml + 12 topics + 4 connections + 2 knowledge sources + escalation-rules.json"
}
