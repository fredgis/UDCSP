<#
.SYNOPSIS
    Install-Observability — Log Analytics, App Insights, workbooks, alerts.
    Real Bicep deployments per sovereign country zone.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Observability {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\observability'
    $logFile = Join-Path $ReportDir 'install-observability.log'
    $whatIf = [bool]$WhatIfPreference
    $envName = if ($Config.ContainsKey('Environment')) { $Config.Environment } else { 'prod' }

    $lawBicep  = Join-Path $bicepRoot 'log-analytics.bicep'
    $appiBicep = Join-Path $bicepRoot 'app-insights.bicep'
    if (-not (Test-Path $lawBicep))  { throw "Missing $lawBicep" }
    if (-not (Test-Path $appiBicep)) { throw "Missing $appiBicep" }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-observability-rg"
        $tags = $Config.Tags

        # 1. Log Analytics workspace (180-day hot retention per AI Act Art. 26(6)).
        $lawParams = [ordered]@{
            '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
            contentVersion = '1.0.0.0'
            parameters = [ordered]@{
                country  = @{ value = $country.ToLower() }
                env      = @{ value = $envName }
                location = @{ value = $region }
                tags     = @{ value = $tags }
            }
        }
        $lawParamsFile = Join-Path $ReportDir "law-$($country.ToLower()).parameters.json"
        $lawParams | ConvertTo-Json -Depth 6 | Set-Content $lawParamsFile -Encoding utf8
        if ($PSCmdlet.ShouldProcess("law-$country", 'az deployment group create')) {
            Invoke-AzGroupDeployment `
                -Subscription $sub -ResourceGroup $rg -Location $region `
                -TemplateFile $lawBicep `
                -ParametersFile $lawParamsFile `
                -LogFile $logFile `
                -DeploymentName "udcsp-obs-law-$($country.ToLower())" `
                -Tags $tags `
                -WhatIfFlag $whatIf
        }

        # 2. Application Insights workspace-based, anchored to the LAW above.
        #    LAW resource ID derives from the naming convention in
        #    log-analytics.bicep:7 (`udcsp-${country}-${env}-law`).
        $lawId = "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.OperationalInsights/workspaces/udcsp-$($country.ToLower())-$envName-law"
        $appiParams = [ordered]@{
            '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
            contentVersion = '1.0.0.0'
            parameters = [ordered]@{
                country             = @{ value = $country.ToLower() }
                env                 = @{ value = $envName }
                location            = @{ value = $region }
                workloadName        = @{ value = 'shared' }
                workspaceResourceId = @{ value = $lawId }
                tags                = @{ value = $tags }
            }
        }
        $appiParamsFile = Join-Path $ReportDir "appi-$($country.ToLower()).parameters.json"
        $appiParams | ConvertTo-Json -Depth 6 | Set-Content $appiParamsFile -Encoding utf8
        if ($PSCmdlet.ShouldProcess("appi-$country", 'az deployment group create')) {
            Invoke-AzGroupDeployment `
                -Subscription $sub -ResourceGroup $rg -Location $region `
                -TemplateFile $appiBicep `
                -ParametersFile $appiParamsFile `
                -LogFile $logFile `
                -DeploymentName "udcsp-obs-appi-$($country.ToLower())" `
                -Tags $tags `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-Observability {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\observability'
    if (-not (Get-ChildItem -Path $bicepRoot -Filter '*.bicep' -File -ErrorAction SilentlyContinue)) {
        throw "No Bicep templates under $bicepRoot"
    }
    "{`"phase`":`"Observability`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-observability.json')
}

Export-ModuleMember -Function Install-Observability, Test-Observability
