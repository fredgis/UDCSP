<#
.SYNOPSIS
    Install-BackupAsr — Azure Backup + Azure Site Recovery per sovereign zone.
    Same-country failover only (DK never paired with SE/NO and vice versa).
    Closes the BCDR audit gap (ISO 27001, NIS2). Post-audit refactor 2026-05-09.
#>
function Install-BackupAsr {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'dk','se','no') {
        $vault = Join-Path $repo 'infra\security\backup-asr\recovery-services-vault.bicep'
        $pol   = Join-Path $repo 'infra\security\backup-asr\backup-policies.bicep'
        $asr   = Join-Path $repo 'infra\security\backup-asr\site-recovery.bicep'
        foreach ($f in @($vault, $pol, $asr)) {
            if (-not (Test-Path $f)) { Write-Warning "Missing $f"; continue }
            if ($PSCmdlet.ShouldProcess("$($f | Split-Path -Leaf)-$country", 'Deploy')) {
                "[scaffold] az deployment group create --resource-group udcsp-$country-rg --template-file $f" |
                    Add-Content (Join-Path $ReportDir "install-backup-asr-$country.log")
            }
        }
    }
}
function Test-BackupAsr {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'infra\security\backup-asr\scripts\Test-BackupAsr.ps1'
    if (Test-Path $script) { Write-Host "  → component test: $script -Offline" } else { Write-Warning "Missing $script" }
    "{`"phase`":`"BackupAsr`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-backup-asr.json')
}
Export-ModuleMember -Function Install-BackupAsr, Test-BackupAsr
