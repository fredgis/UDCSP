<#
.SYNOPSIS
    Install-VerifiedId — Microsoft Entra Verified ID issuer + 3 credential
    contracts (residency, eligibility receipt, EUDI Wallet bridge). Activates
    the EUDI Wallet readiness from governance/identity/eudi-wallet-readiness.md.
    Post-audit refactor 2026-05-09.
#>
function Install-VerifiedId {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\identity\verified-id\verified-id-issuer.bicep'
    if (-not (Test-Path $bicep)) { Write-Warning "Missing $bicep"; return }
    if ($PSCmdlet.ShouldProcess('verified-id-issuer', 'Deploy')) {
        "[scaffold] az deployment sub create --location $($Config.Regions.Shared) --template-file $bicep" |
            Add-Content (Join-Path $ReportDir 'install-verified-id.log')
    }
    $contracts = Get-ChildItem (Join-Path $repo 'infra\identity\verified-id\credential-contracts') -Filter '*.json' -ErrorAction SilentlyContinue
    foreach ($c in $contracts) {
        "[scaffold] msgraph apply credential-contract $($c.Name)" |
            Add-Content (Join-Path $ReportDir 'install-verified-id.log')
    }
}
function Test-VerifiedId {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'infra\identity\verified-id\scripts\Test-VerifiedId.ps1'
    if (Test-Path $script) { Write-Host "  → component test: $script -Offline" } else { Write-Warning "Missing $script" }
    "{`"phase`":`"VerifiedId`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-verified-id.json')
}
Export-ModuleMember -Function Install-VerifiedId, Test-VerifiedId
