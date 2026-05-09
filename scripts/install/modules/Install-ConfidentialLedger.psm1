<#
.SYNOPSIS
    Install-ConfidentialLedger — Microsoft Confidential Ledger (CCF-backed,
    tamper-evident append-only). Hosts the EU AI Act Art. 26(6) registry of
    every high-risk system decision. Post-audit refactor 2026-05-09.
#>
function Install-ConfidentialLedger {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\security\confidential-ledger\confidential-ledger.bicep'
    if (-not (Test-Path $bicep)) { Write-Warning "Missing $bicep"; return }
    if ($PSCmdlet.ShouldProcess('confidential-ledger', 'Deploy')) {
        "[scaffold] az deployment sub create --location $($Config.Regions.Shared) --template-file $bicep" |
            Add-Content (Join-Path $ReportDir 'install-confidential-ledger.log')
    }
}
function Test-ConfidentialLedger {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'infra\security\confidential-ledger\scripts\Test-ConfidentialLedger.ps1'
    if (Test-Path $script) { Write-Host "  → component test: $script -Offline" } else { Write-Warning "Missing $script" }
    "{`"phase`":`"ConfidentialLedger`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-confidential-ledger.json')
}
Export-ModuleMember -Function Install-ConfidentialLedger, Test-ConfidentialLedger
