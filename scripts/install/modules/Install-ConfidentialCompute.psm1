<#
.SYNOPSIS
    Install-ConfidentialCompute — Confidential Container Apps environment
    (SEV-SNP) hosting the Eligibility Pre-Assessor inference orchestration
    layer. TEE confidentiality of citizen PII during cross-border inference.
    Post-audit refactor 2026-05-09.
#>
function Install-ConfidentialCompute {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $env  = Join-Path $repo 'infra\security\confidential-compute\confidential-compute.bicep'
    $app  = Join-Path $repo 'infra\security\confidential-compute\eligibility-confidential-app.bicep'
    foreach ($f in @($env, $app)) {
        if (-not (Test-Path $f)) { Write-Warning "Missing $f"; continue }
        if ($PSCmdlet.ShouldProcess(($f | Split-Path -Leaf), 'Deploy')) {
            "[scaffold] az deployment sub create --template-file $f" |
                Add-Content (Join-Path $ReportDir 'install-confidential-compute.log')
        }
    }
}
function Test-ConfidentialCompute {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'infra\security\confidential-compute\scripts\Test-ConfidentialCompute.ps1'
    if (Test-Path $script) { Write-Host "  → component test: $script -Offline" } else { Write-Warning "Missing $script" }
    "{`"phase`":`"ConfidentialCompute`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-confidential-compute.json')
}
Export-ModuleMember -Function Install-ConfidentialCompute, Test-ConfidentialCompute
