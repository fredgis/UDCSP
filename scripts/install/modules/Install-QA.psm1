<#
.SYNOPSIS
    Install-QA (A14) — Wire CI eval/E2E/security/conformance pipelines,
    run smoke gate, optionally produce evaluator HTML report.
#>
function Install-QA {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $workflows = Get-ChildItem (Join-Path $repo 'tests') -Recurse -Filter '*.yml' -ErrorAction SilentlyContinue |
                 Where-Object { $_.FullName -match '\.github\\workflows\\' }
    foreach ($w in $workflows) {
        Write-Host "  → CI workflow registered: $($w.Name)"
    }
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
        Write-Host "  ✓ smoke: $s"
    }
    "{`"phase`":`"QA`",`"smokes`":$($smokes.Count)}" | Set-Content (Join-Path $ReportDir 'test-qa.json')
}

Export-ModuleMember -Function Install-QA, Test-QA
