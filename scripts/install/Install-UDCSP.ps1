<#
.SYNOPSIS
    UDCSP — One-shot installer for the Unified Digital Citizen Services Platform.

.DESCRIPTION
    Orchestrates every component module in scripts/install/modules/, respecting
    the wave dependencies declared in docs/tech/plan.md. Idempotent. Each phase is
    independently runnable via -Phase. Pure dry-run via -WhatIf. Component
    self-test via -TestOnly.

    Owner agent: A16 · Installer & Developer Experience.

.PARAMETER Environment
    One of dev | test | preprod | prod. Selects the parameter file under
    scripts/install/config/.

.PARAMETER Phase
    One or more phases to run. If omitted, runs the full DAG in dependency order.
    Valid phases: LandingZone, Identity, VerifiedId, Bastion, Ciem, Security,
    Ddos, BackupAsr, ConfidentialLedger, ChaosStudio, Observability, Fabric,
    Postgres, Redis, SyntheticData, Foundry, ConfidentialCompute, Apim,
    LogicApps, D365, Apps, Voice, Purview, Priva, QA.

.PARAMETER ExcludePhase
    Phases to exclude from the run. Useful for the documented two-pass install
    workflow (first pass with `-ExcludePhase Voice,QA`, then a second pass
    after the Voice config is harvested).

.PARAMETER WhatIf
    Plans every Bicep/REST deployment without applying changes.

.PARAMETER TestOnly
    Skips deployments and runs the per-phase Test-* function only.

.PARAMETER SmokeOnly
    Skips deployments and runs the cross-cutting smoke suite only.

.PARAMETER EvaluatorMode
    Generates the evaluator HTML report after smoke (used in CI for the
    case-study deliverable).

.PARAMETER SeedSyntheticData
    Ensures the SyntheticData phase runs (it is part of the default DAG, but
    this switch makes the docs/uses.md examples explicit and forces inclusion
    even when -Phase is restricted to a subset that would otherwise skip it).

.PARAMETER Zone
    Restricts per-country phases to a single sovereign zone. One of dk | se |
    no | all (default: all). Read by phase modules via `$Config.ZoneFilter`.

.PARAMETER Force
    Required for tear-down or re-install against -Environment prod.

.EXAMPLE
    pwsh ./scripts/install/Install-UDCSP.ps1 -Environment prod

.EXAMPLE
    pwsh ./scripts/install/Install-UDCSP.ps1 -Phase Foundry,Apim -WhatIf

.EXAMPLE
    pwsh ./scripts/install/Install-UDCSP.ps1 -Phase QA -SmokeOnly -EvaluatorMode

.EXAMPLE
    pwsh ./scripts/install/Install-UDCSP.ps1 -Environment dev -Zone all -SeedSyntheticData
    # The "one-command DEV" workflow advertised in README + docs/biz/uses.md.
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('dev','test','preprod','prod')]
    [string]$Environment = 'dev',

    [ValidateSet('LandingZone','Identity','VerifiedId','Bastion','Ciem',
                 'Security','Ddos','BackupAsr','ConfidentialLedger','ChaosStudio',
                 'Observability','Fabric','Postgres','Redis','SyntheticData',
                 'Foundry','ConfidentialCompute','Apim','LogicApps','D365',
                 'Apps','Voice','Purview','Priva','QA')]
    [string[]]$Phase,

    [ValidateSet('LandingZone','Identity','VerifiedId','Bastion','Ciem',
                 'Security','Ddos','BackupAsr','ConfidentialLedger','ChaosStudio',
                 'Observability','Fabric','Postgres','Redis','SyntheticData',
                 'Foundry','ConfidentialCompute','Apim','LogicApps','D365',
                 'Apps','Voice','Purview','Priva','QA')]
    [string[]]$ExcludePhase,

    [switch]$TestOnly,
    [switch]$SmokeOnly,
    [switch]$EvaluatorMode,
    [switch]$SeedSyntheticData,
    [ValidateSet('dk','se','no','all')]
    [string]$Zone = 'all',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------
$Script:RepoRoot       = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$Script:ModulesPath    = Join-Path $PSScriptRoot 'modules'
$Script:LibPath        = Join-Path $PSScriptRoot 'lib\InstallHelpers.psm1'
$Script:ConfigPath     = Join-Path $PSScriptRoot 'config\udcsp.config.psd1'

if (Test-Path $Script:LibPath) { Import-Module $Script:LibPath -Force -DisableNameChecking }
$Script:RunStamp       = (Get-Date -Format 'yyyyMMdd-HHmmss')
$Script:ReportDir      = Join-Path $PSScriptRoot "reports\$RunStamp"
New-Item -Path $ReportDir -ItemType Directory -Force | Out-Null
$Script:Report         = [ordered]@{
    runStamp     = $RunStamp
    environment  = $Environment
    invocation   = $PSBoundParameters.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" } | Sort-Object
    machine      = "$env:COMPUTERNAME / pwsh $($PSVersionTable.PSVersion)"
    phases       = @()
    finalStatus  = 'InProgress'
}

# ---------------------------------------------------------------------------
# DAG (matches docs/tech/installation.md §6.1 — install order)
# ---------------------------------------------------------------------------
$Script:Dag = [ordered]@{
    LandingZone         = @{ Wave = 0; DependsOn = @();                                              Module = 'Install-LandingZone.psm1' }
    Identity            = @{ Wave = 1; DependsOn = @('LandingZone');                                 Module = 'Install-Identity.psm1' }
    VerifiedId          = @{ Wave = 1; DependsOn = @('Identity');                                    Module = 'Install-VerifiedId.psm1' }
    Bastion             = @{ Wave = 1; DependsOn = @('LandingZone');                                 Module = 'Install-Bastion.psm1' }
    Ciem                = @{ Wave = 1; DependsOn = @('Identity');                                    Module = 'Install-Ciem.psm1' }
    Security            = @{ Wave = 1; DependsOn = @('LandingZone');                                 Module = 'Install-Security.psm1' }
    Ddos                = @{ Wave = 1; DependsOn = @('LandingZone');                                 Module = 'Install-Ddos.psm1' }
    BackupAsr           = @{ Wave = 1; DependsOn = @('LandingZone');                                 Module = 'Install-BackupAsr.psm1' }
    ConfidentialLedger  = @{ Wave = 1; DependsOn = @('Security');                                    Module = 'Install-ConfidentialLedger.psm1' }
    ChaosStudio         = @{ Wave = 1; DependsOn = @('Security');                                    Module = 'Install-ChaosStudio.psm1' }
    Observability       = @{ Wave = 1; DependsOn = @('LandingZone');                                 Module = 'Install-Observability.psm1' }
    Fabric              = @{ Wave = 1; DependsOn = @('LandingZone');                                 Module = 'Install-Fabric.psm1' }
    Postgres            = @{ Wave = 1; DependsOn = @('LandingZone','Security');                      Module = 'Install-Postgres.psm1' }
    Redis               = @{ Wave = 1; DependsOn = @('LandingZone','Security');                      Module = 'Install-Redis.psm1' }
    SyntheticData       = @{ Wave = 1; DependsOn = @('Fabric');                                      Module = 'Install-SyntheticData.psm1' }
    Foundry             = @{ Wave = 2; DependsOn = @('Identity','Security','Fabric');                Module = 'Install-Foundry.psm1' }
    ConfidentialCompute = @{ Wave = 2; DependsOn = @('Foundry','ConfidentialLedger');                Module = 'Install-ConfidentialCompute.psm1' }
    Apim                = @{ Wave = 2; DependsOn = @('Identity','LandingZone','Security');           Module = 'Install-Apim.psm1' }
    LogicApps           = @{ Wave = 2; DependsOn = @('Apim','Foundry');                              Module = 'Install-LogicApps.psm1' }
    D365                = @{ Wave = 2; DependsOn = @('Identity','LogicApps');                        Module = 'Install-D365.psm1' }
    Apps                = @{ Wave = 3; DependsOn = @('Identity','Apim','Postgres','Redis');          Module = 'Install-Apps.psm1' }
    Voice               = @{ Wave = 3; DependsOn = @('LogicApps','Foundry');                         Module = 'Install-Voice.psm1' }
    Purview             = @{ Wave = 4; DependsOn = @('Fabric','D365','Foundry');                     Module = 'Install-Purview.psm1' }
    Priva               = @{ Wave = 4; DependsOn = @('Purview');                                     Module = 'Install-Priva.psm1' }
    QA                  = @{ Wave = 4; DependsOn = @('Apps','Voice','Purview','Priva','ConfidentialCompute'); Module = 'Install-QA.psm1' }
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Write-PhaseHeader([string]$Title) {
    Write-Host ''
    Write-Host '┌────────────────────────────────────────────────────────────────────┐' -ForegroundColor DarkCyan
    Write-Host ('│ ' + $Title.PadRight(66) + '│') -ForegroundColor Cyan
    Write-Host '└────────────────────────────────────────────────────────────────────┘' -ForegroundColor DarkCyan
}

function Write-StepInfo([string]$Msg) { Write-Host "  • $Msg" -ForegroundColor Gray }
function Write-StepOk([string]$Msg)   { Write-Host "  ✓ $Msg" -ForegroundColor Green }
function Write-StepWarn([string]$Msg) { Write-Host "  ! $Msg" -ForegroundColor Yellow }
function Write-StepFail([string]$Msg) { Write-Host "  ✗ $Msg" -ForegroundColor Red }

function Resolve-Phases([string[]]$Requested) {
    if (-not $Requested -or $Requested.Count -eq 0) { return $Script:Dag.Keys }
    $closure = New-Object System.Collections.Generic.HashSet[string]
    foreach ($p in $Requested) {
        $null = $closure.Add($p)
        foreach ($dep in (Get-AllDeps $p)) { $null = $closure.Add($dep) }
    }
    return ($Script:Dag.Keys | Where-Object { $closure.Contains($_) })
}

function Get-AllDeps([string]$Phase) {
    $acc = @()
    foreach ($d in $Script:Dag[$Phase].DependsOn) {
        $acc += $d
        $acc += (Get-AllDeps $d)
    }
    return ($acc | Select-Object -Unique)
}

function Import-Config {
    if (-not (Test-Path $Script:ConfigPath)) {
        throw "Config file not found: $Script:ConfigPath. Copy from udcsp.config.template.psd1 and fill in your values."
    }
    return Import-PowerShellDataFile -Path $Script:ConfigPath
}

function Invoke-Phase {
    param([string]$Name, [hashtable]$Config)

    $entry = [ordered]@{
        name      = $Name
        wave      = $Script:Dag[$Name].Wave
        startedAt = (Get-Date).ToString('o')
        status    = 'InProgress'
        durationMs = 0
        error     = $null
    }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $modulePath = Join-Path $Script:ModulesPath $Script:Dag[$Name].Module

    try {
        if (-not (Test-Path $modulePath)) {
            throw "Module file missing: $modulePath. Run agent A16 to generate it."
        }
        Import-Module $modulePath -Force -DisableNameChecking

        $installFn = "Install-$Name"
        $testFn    = "Test-$Name"

        if ($Script:SmokeOnly) {
            Write-StepInfo "Smoke gate via $testFn"
            & $testFn -Config $Config -ReportDir $Script:ReportDir
        } elseif ($Script:TestOnly) {
            Write-StepInfo "Component self-test via $testFn"
            & $testFn -Config $Config -ReportDir $Script:ReportDir
        } else {
            $whatIfArg = @{}
            if ($WhatIfPreference) { $whatIfArg['WhatIf'] = $true }
            Write-StepInfo "Deploy via $installFn"
            & $installFn -Config $Config -ReportDir $Script:ReportDir @whatIfArg
            Write-StepInfo "Validate via $testFn"
            & $testFn -Config $Config -ReportDir $Script:ReportDir
        }

        $entry.status = 'Succeeded'
        Write-StepOk "$Name complete"
    }
    catch {
        $entry.status = 'Failed'
        $entry.error  = "$_"
        Write-StepFail "$Name failed: $_"
        throw
    }
    finally {
        $sw.Stop()
        $entry.durationMs = $sw.ElapsedMilliseconds
        $entry.endedAt    = (Get-Date).ToString('o')
        $Script:Report.phases += $entry
    }
}

function Save-Report {
    $jsonPath = Join-Path $Script:ReportDir 'install-report.json'
    $Script:Report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8
    Write-Host ''
    Write-Host "Report: $jsonPath" -ForegroundColor Cyan

    if ($Script:EvaluatorMode) {
        $htmlPath = Join-Path $Script:ReportDir 'install-report.html'
        $rows = $Script:Report.phases | ForEach-Object {
            $color = switch ($_.status) { 'Succeeded' { '#2ea44f' } 'Failed' { '#d73a49' } default { '#e36209' } }
            "<tr><td>$($_.wave)</td><td>$($_.name)</td><td style='color:$color;font-weight:bold'>$($_.status)</td><td>$([Math]::Round($_.durationMs/1000,1)) s</td><td>$($_.error)</td></tr>"
        }
        @"
<!doctype html><html><head><meta charset='utf-8'><title>UDCSP Install Report — $($Script:Report.runStamp)</title>
<style>body{font:14px/1.4 system-ui,sans-serif;margin:2rem;color:#222}table{border-collapse:collapse;width:100%}th,td{padding:.5rem .8rem;border-bottom:1px solid #eee;text-align:left}th{background:#1565c0;color:#fff}.summary{padding:1rem;background:#f6f8fa;border-radius:.5rem;margin:1rem 0}</style>
</head><body>
<h1>UDCSP — Install Report</h1>
<div class='summary'>
<strong>Run:</strong> $($Script:Report.runStamp)<br/>
<strong>Environment:</strong> $($Script:Report.environment)<br/>
<strong>Final status:</strong> <span style='font-weight:bold;color:$(if($Script:Report.finalStatus -eq 'Succeeded'){'#2ea44f'}else{'#d73a49'})'>$($Script:Report.finalStatus)</span>
</div>
<table><thead><tr><th>Wave</th><th>Phase</th><th>Status</th><th>Duration</th><th>Error</th></tr></thead>
<tbody>
$($rows -join "`n")
</tbody></table>
</body></html>
"@ | Set-Content -Path $htmlPath -Encoding UTF8
        Write-Host "Evaluator HTML: $htmlPath" -ForegroundColor Cyan
    }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
Write-PhaseHeader "UDCSP Installer · env=$Environment · run=$RunStamp"
Write-StepInfo "Repo root: $Script:RepoRoot"

if ($Environment -eq 'prod' -and -not $Force -and -not $WhatIfPreference -and -not $TestOnly -and -not $SmokeOnly) {
    Write-StepWarn "Targeting production. Re-run with -Force to confirm."
    return
}

$config = Import-Config
$config.ZoneFilter = $Zone
if ($TestOnly)   { $env:UDCSP_TESTONLY   = '1' } else { Remove-Item Env:UDCSP_TESTONLY   -ErrorAction SilentlyContinue }
if ($SmokeOnly)  { $env:UDCSP_SMOKEONLY  = '1' } else { Remove-Item Env:UDCSP_SMOKEONLY  -ErrorAction SilentlyContinue }
$phases = Resolve-Phases $Phase
if ($SeedSyntheticData -and $phases -notcontains 'SyntheticData') {
    $phases = Resolve-Phases (@($Phase) + 'SyntheticData')
    Write-StepInfo "-SeedSyntheticData: forcing SyntheticData phase into the run"
}
if ($ExcludePhase) {
    $phases = $phases | Where-Object { $_ -notin $ExcludePhase }
    Write-StepInfo "Excluding phases: $($ExcludePhase -join ', ')"
}

Write-StepInfo "Phases to run (in dependency order): $($phases -join ', ')"

# ---------------------------------------------------------------------------
# Pre-flight — when running a real install (not -TestOnly, not -SmokeOnly,
# not -WhatIf), require az CLI + login. We only need to check once at the
# top; helpers in modules will fail fast if anything has been logged out
# mid-flight.
# ---------------------------------------------------------------------------
if (-not $TestOnly -and -not $SmokeOnly -and -not $WhatIfPreference) {
    if (Get-Command Assert-AzReady -ErrorAction SilentlyContinue) {
        $acct = Assert-AzReady
        Write-StepOk "Azure CLI logged in as '$($acct.user.name)' on tenant '$($acct.tenantId)' (default sub '$($acct.name)')."
    } else {
        Write-StepWarn "InstallHelpers.psm1 not loaded — phases will not perform real Azure deployments."
    }
}

try {
    foreach ($p in $phases) { Invoke-Phase -Name $p -Config $config }
    $Script:Report.finalStatus = 'Succeeded'
    Write-PhaseHeader 'UDCSP install complete ✓'
}
catch {
    $Script:Report.finalStatus = 'Failed'
    Write-PhaseHeader 'UDCSP install FAILED ✗'
    Write-StepFail "$_"
}
finally {
    Save-Report
}
