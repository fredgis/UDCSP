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

    $rg = "udcsp-shared-conf-compute-rg"
    $envDeploymentName = 'udcsp-conf-compute-env'

    if ($PSCmdlet.ShouldProcess('confidential-env', 'az deployment group create')) {
        Invoke-AzGroupDeployment `
            -Subscription $Config.Subscriptions.SharedPlatform `
            -ResourceGroup $rg `
            -Location $Config.Regions.Shared `
            -TemplateFile $envBicep `
            -LogFile $logFile `
            -DeploymentName $envDeploymentName `
            -Tags $Config.Tags `
            -WhatIfFlag $whatIf
    }

    $envId = $null
    if (-not $whatIf) {
        $envId = az deployment group show --subscription $Config.Subscriptions.SharedPlatform `
            -g $rg -n $envDeploymentName --query 'properties.outputs.environmentId.value' -o tsv 2>$null
    }

    if ($PSCmdlet.ShouldProcess('confidential-app', 'az deployment group create')) {
        $appParams = @{}
        if ($envId) { $appParams['managedEnvironmentId'] = $envId }
        Invoke-AzGroupDeployment `
            -Subscription $Config.Subscriptions.SharedPlatform `
            -ResourceGroup $rg `
            -Location $Config.Regions.Shared `
            -TemplateFile $app `
            -LogFile $logFile `
            -DeploymentName 'udcsp-conf-compute-app' `
            -Parameters $appParams `
            -Tags $Config.Tags `
            -WhatIfFlag $whatIf
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
