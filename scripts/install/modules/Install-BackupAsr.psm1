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
    $vault = Join-Path $repo 'infra\security\backup-asr\recovery-services-vault-country.bicep'
    $pol   = Join-Path $repo 'infra\security\backup-asr\backup-policies.bicep'
    $asr   = Join-Path $repo 'infra\security\backup-asr\site-recovery.bicep'
    $logFile = Join-Path $ReportDir 'install-backup-asr.log'
    $whatIf = [bool]$WhatIfPreference
    foreach ($f in @($vault,$pol,$asr)) { if (-not (Test-Path $f)) { throw "Missing $f" } }

    $envName = if ($Config.ContainsKey('Environment')) { $Config.Environment } else { 'prod' }
    $backupCfg = if ($Config.ContainsKey('BackupAsr')) { $Config.BackupAsr } else { @{} }
    $defaultRedundancy = if ($envName -eq 'prod') { 'GeoRedundant' } else { 'ZoneRedundant' }
    $vaultRedundancy = if ($backupCfg.ContainsKey('VaultStorageType') -and $backupCfg.VaultStorageType) { $backupCfg.VaultStorageType } else { $defaultRedundancy }
    $recoveryPair = @{ DK = $Config.Regions.SE; SE = $Config.Regions.NO; NO = $Config.Regions.SE }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-rg"
        $cl = $country.ToLower()
        $vaultName = "udcsp-$cl-$envName-rsv"

        $vaultParams = [ordered]@{
            '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
            contentVersion = '1.0.0.0'
            parameters = [ordered]@{
                country  = @{ value = $cl }
                env      = @{ value = $envName }
                location = @{ value = $region }
                keyUri   = @{ value = '' }
                backupStorageRedundancy = @{ value = $vaultRedundancy }
            }
        }
        $vaultParamsFile = Join-Path $ReportDir "backup-vault-$cl.parameters.json"
        $vaultParams | ConvertTo-Json -Depth 6 | Set-Content $vaultParamsFile -Encoding utf8

        $polParams = [ordered]@{
            '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
            contentVersion = '1.0.0.0'
            parameters = [ordered]@{ vaultName = @{ value = $vaultName } }
        }
        $polParamsFile = Join-Path $ReportDir "backup-policies-$cl.parameters.json"
        $polParams | ConvertTo-Json -Depth 6 | Set-Content $polParamsFile -Encoding utf8

        $asrParams = [ordered]@{
            '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
            contentVersion = '1.0.0.0'
            parameters = [ordered]@{
                vaultName     = @{ value = $vaultName }
                country       = @{ value = $cl }
                primaryRegion = @{ value = $region }
                recoveryRegion = @{ value = $recoveryPair[$country] }
            }
        }
        $asrParamsFile = Join-Path $ReportDir "site-recovery-$cl.parameters.json"
        $asrParams | ConvertTo-Json -Depth 6 | Set-Content $asrParamsFile -Encoding utf8

        foreach ($pair in @(
                @{name='vault';        file=$vault; params=$vaultParamsFile},
                @{name='policies';     file=$pol;   params=$polParamsFile},
                @{name='site-recovery';file=$asr;   params=$asrParamsFile})) {
            if ($PSCmdlet.ShouldProcess("$($pair.name)-$country", 'az deployment group create')) {
                Invoke-AzGroupDeployment `
                    -Subscription $sub -ResourceGroup $rg -Location $region `
                    -TemplateFile $pair.file `
                    -ParametersFile $pair.params `
                    -LogFile $logFile `
                    -DeploymentName "udcsp-backupasr-$($pair.name)-$cl" `
                    -Tags $Config.Tags `
                    -WhatIfFlag $whatIf
            }
        }
    }
}

function Test-BackupAsr {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($f in @('infra\security\backup-asr\recovery-services-vault-country.bicep',
                     'infra\security\backup-asr\backup-policies.bicep',
                     'infra\security\backup-asr\site-recovery.bicep')) {
        if (-not (Test-Path (Join-Path $repo $f))) { throw "Missing $f" }
    }
    "{`"phase`":`"BackupAsr`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-backup-asr.json')
}

Export-ModuleMember -Function Install-BackupAsr, Test-BackupAsr
