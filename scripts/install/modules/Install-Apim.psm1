<#
.SYNOPSIS
    Install-Apim — APIM Premium multi-region, products, APIs, policies,
    named values. Real Bicep deployment + per-API import.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Apim {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'services\apim\apim.bicep'
    $logFile = Join-Path $ReportDir 'install-apim.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-apim-rg"
        $apimName = "udcsp-$($country.ToLower())-apim"
        $envName = if ($Config.ContainsKey('Environment')) { $Config.Environment } else { 'dev' }
        $apimCfg = if ($Config.ContainsKey('Apim')) { $Config.Apim } else { @{ PublisherEmail = 'platform@udcsp.local'; PublisherName = 'UDCSP Platform' } }
        if ($PSCmdlet.ShouldProcess("apim-$country", 'az deployment group create')) {
            $apimParams = [ordered]@{
                '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
                contentVersion = '1.0.0.0'
                parameters = [ordered]@{
                    country        = @{ value = $country.ToLower() }
                    env            = @{ value = $envName }
                    publisherEmail = @{ value = $apimCfg.PublisherEmail }
                    publisherName  = @{ value = $apimCfg.PublisherName }
                }
            }
            $apimParamsFile = Join-Path $ReportDir "apim-$($country.ToLower()).parameters.json"
            $apimParams | ConvertTo-Json -Depth 6 | Set-Content $apimParamsFile -Encoding utf8
            Invoke-AzGroupDeployment `
                -Subscription $sub -ResourceGroup $rg -Location $region `
                -TemplateFile $bicep `
                -ParametersFile $apimParamsFile `
                -LogFile $logFile `
                -DeploymentName "udcsp-apim-$($country.ToLower())" `
                -Tags $Config.Tags `
                -WhatIfFlag $whatIf
        }

        $apis = Get-ChildItem (Join-Path $repo 'services\apim\apis') -Directory -ErrorAction SilentlyContinue
        foreach ($a in $apis) {
            $openapi = Join-Path $a.FullName 'openapi.yaml'
            $policy  = Join-Path $a.FullName 'policy.xml'
            if (-not (Test-Path $openapi)) { continue }
            if ($PSCmdlet.ShouldProcess("$($a.Name)@$apimName", 'az apim api import')) {
                Invoke-NativeCommand `
                    -Command @('az','apim','api','import',
                               '--subscription',$sub,
                               '--resource-group',$rg,
                               '--service-name',$apimName,
                               '--path',$a.Name,
                               '--api-id',$a.Name,
                               '--specification-path',$openapi,
                               '--specification-format','OpenApi',
                               '--only-show-errors','--output','none') `
                    -LogFile $logFile `
                    -WhatIfFlag $whatIf `
                    -ContinueOnError
                if (Test-Path $policy) {
                    Invoke-NativeCommand `
                        -Command @('az','apim','api','policy','create',
                                   '--subscription',$sub,
                                   '--resource-group',$rg,
                                   '--service-name',$apimName,
                                   '--api-id',$a.Name,
                                   '--xml-path',$policy,
                                   '--only-show-errors','--output','none') `
                        -LogFile $logFile `
                        -WhatIfFlag $whatIf `
                        -ContinueOnError
                }
            }
        }
        # Defender for APIs onboarding: register all imported APIs as Microsoft.Security/apiCollections.
        # This runs here (not in Install-Security) because the APIM resource must already exist.
        $defenderApisOnboarding = Join-Path $repo 'infra\security\defender\defender-for-apis-onboarding.bicep'
        $apiNames = @($apis | ForEach-Object { $_.Name })
        if ((Test-Path $defenderApisOnboarding) -and $apiNames.Count -gt 0) {
            if ($PSCmdlet.ShouldProcess("defender-for-apis-onboarding-$country", 'az deployment group create')) {
                $paramsFile = Join-Path $ReportDir "defender-apis-params-$($country.ToLower()).json"
                @{
                    '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
                    contentVersion = '1.0.0.0'
                    parameters = @{
                        apimServiceName = @{ value = $apimName }
                        apiIds          = @{ value = $apiNames }
                    }
                } | ConvertTo-Json -Depth 6 | Set-Content $paramsFile
                Invoke-AzGroupDeployment `
                    -Subscription $sub -ResourceGroup $rg -Location $region `
                    -TemplateFile $defenderApisOnboarding `
                    -ParametersFile $paramsFile `
                    -LogFile $logFile `
                    -DeploymentName "udcsp-defender-apis-onb-$($country.ToLower())" `
                    -WhatIfFlag $whatIf
            }
        }
    }
}

function Test-Apim {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'services\apim\scripts\Test-Apim.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    $result = [ordered]@{ phase = 'Apim'; status = 'OK'; mode = 'offline' }
    if ($env:UDCSP_TESTONLY -eq '1') {
        $result.mode = 'offline'
        $result.note = 'TestOnly: skipped live HTTP probe'
    } else {
        try {
            foreach ($country in 'DK','SE','NO') {
                $apimName = "udcsp-$($country.ToLower())-apim"
                $gatewayUrl = "https://$apimName.azure-api.net"
                & $script -GatewayUrl $gatewayUrl 2>&1 | Out-Null
            }
            $result.mode = 'live'
        } catch {
            $result.status = 'Failed'
            $result.error  = "$_"
            $result | ConvertTo-Json -Compress | Set-Content (Join-Path $ReportDir 'test-apim.json')
            throw
        }
    }
    $result | ConvertTo-Json -Compress | Set-Content (Join-Path $ReportDir 'test-apim.json')
}

Export-ModuleMember -Function Install-Apim, Test-Apim
