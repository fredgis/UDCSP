<#
.SYNOPSIS
    Install-QA — Validates the cross-cutting CI smoke artefacts are in
    place. The actual smoke tests run via -SmokeOnly (orchestrator path).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-QA {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $logFile = Join-Path $ReportDir 'install-qa.log'
    $workflows = Get-ChildItem (Join-Path $repo '.github\workflows') -Filter '*.yml' -ErrorAction SilentlyContinue
    Write-Log -LogFile $logFile -Message "[ci] $($workflows.Count) workflow(s) registered under .github/workflows"
    foreach ($w in $workflows) { Write-Log -LogFile $logFile -Message "[ci] $($w.Name)" }
}

function Test-QA {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $smokes = @(
        'tests\e2e\tests\scenario-09-devops-installer.spec.ts',
        'tests\eval\pipelines\nightly-classifier.yaml',
        'tests\accessibility\automated\axe-runner.spec.ts',
        'tests\load\k6\citizen-application-submit.k6.js'
    )
    foreach ($s in $smokes) {
        $p = Join-Path $repo $s
        if (-not (Test-Path $p)) { throw "Missing smoke artefact: $s" }
    }
    "{`"phase`":`"QA`",`"smokes`":$($smokes.Count)}" | Set-Content (Join-Path $ReportDir 'test-qa.json')
}

Export-ModuleMember -Function Install-QA, Test-QA
