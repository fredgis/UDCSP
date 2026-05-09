<#
.SYNOPSIS
    Install-BackupAsr — Recovery Services Vault + backup policies + Site
    Recovery, one per sovereign country zone. Real Bicep deployments.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-BackupAsr {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $vault = Join-Path $repo 'infra\security\backup-asr\recovery-services-vault.bicep'
    $pol   = Join-Path $repo 'infra\security\backup-asr\backup-policies.bicep'
    $asr   = Join-Path $repo 'infra\security\backup-asr\site-recovery.bicep'
    $logFile = Join-Path $ReportDir 'install-backup-asr.log'
    $whatIf = [bool]$WhatIfPreference
    foreach ($f in @($vault,$pol,$asr)) { if (-not (Test-Path $f)) { throw "Missing $f" } }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-rg"
        foreach ($pair in @(@{name='vault';file=$vault}, @{name='policies';file=$pol}, @{name='site-recovery';file=$asr})) {
            if ($PSCmdlet.ShouldProcess("$($pair.name)-$country", 'az deployment group create')) {
                Invoke-AzGroupDeployment `
                    -Subscription $sub -ResourceGroup $rg -Location $region `
                    -TemplateFile $pair.file `
                    -LogFile $logFile `
                    -DeploymentName "udcsp-backupasr-$($pair.name)-$($country.ToLower())" `
                    -Tags $Config.Tags `
                    -WhatIfFlag $whatIf
            }
        }
    }
}

function Test-BackupAsr {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($f in @('infra\security\backup-asr\recovery-services-vault.bicep',
                     'infra\security\backup-asr\backup-policies.bicep',
                     'infra\security\backup-asr\site-recovery.bicep')) {
        if (-not (Test-Path (Join-Path $repo $f))) { throw "Missing $f" }
    }
    "{`"phase`":`"BackupAsr`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-backup-asr.json')
}

Export-ModuleMember -Function Install-BackupAsr, Test-BackupAsr
