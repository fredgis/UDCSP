<#
.SYNOPSIS
    Install-ConfidentialCompute — Confidential Container Apps environment
    (SEV-SNP) hosting the Eligibility Pre-Assessor TEE inference. Real
    Bicep deployment.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-ConfidentialCompute {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $envBicep = Join-Path $repo 'infra\security\confidential-compute\confidential-compute.bicep'
    $app = Join-Path $repo 'infra\security\confidential-compute\eligibility-confidential-app.bicep'
    $logFile = Join-Path $ReportDir 'install-confidential-compute.log'
    $whatIf = [bool]$WhatIfPreference
    foreach ($f in @($envBicep,$app)) { if (-not (Test-Path $f)) { throw "Missing $f" } }

    foreach ($pair in @(@{name='env'; file=$envBicep}, @{name='app'; file=$app})) {
        $rg = "udcsp-shared-conf-compute-rg"
        if ($PSCmdlet.ShouldProcess("confidential-$($pair.name)", 'az deployment group create')) {
            Invoke-AzGroupDeployment `
                -Subscription $Config.Subscriptions.SharedPlatform `
                -ResourceGroup $rg `
                -Location $Config.Regions.Shared `
                -TemplateFile $pair.file `
                -LogFile $logFile `
                -DeploymentName "udcsp-conf-compute-$($pair.name)" `
                -Tags $Config.Tags `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-ConfidentialCompute {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($f in @('infra\security\confidential-compute\confidential-compute.bicep',
                     'infra\security\confidential-compute\eligibility-confidential-app.bicep')) {
        if (-not (Test-Path (Join-Path $repo $f))) { throw "Missing $f" }
    }
    "{`"phase`":`"ConfidentialCompute`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-confidential-compute.json')
}

Export-ModuleMember -Function Install-ConfidentialCompute, Test-ConfidentialCompute
