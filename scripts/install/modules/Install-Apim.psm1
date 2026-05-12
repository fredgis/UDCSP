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
        $envName = 'prod'  # naming convention shared with postgres/redis bicepparam (resource name suffix)
        $apimName = "udcsp-$($country.ToLower())-$envName-apim"
        $apimCfg = if ($Config.ContainsKey('Apim')) { $Config.Apim } else { @{ PublisherEmail = 'platform@udcsp.local'; PublisherName = 'UDCSP Platform' } }
        if ($PSCmdlet.ShouldProcess("apim-$country", 'az deployment group create')) {
            $existingState = az deployment group show --subscription $sub -g $rg -n "udcsp-apim-$($country.ToLower())" --query 'properties.provisioningState' -o tsv 2>$null
            if ($existingState -eq 'Succeeded' -or $existingState -eq 'Running') {
                Write-Host "    ↳ skip apim-$country (deployment udcsp-apim-$($country.ToLower()) is $existingState)"
            } else {
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
        }

        # Deploy named-values declared in services/apim/named-values/named-values.json
        # via az rest PUT (the az apim CLI lacks a first-class command for KV-backed
        # values). These MUST be created BEFORE per-API policy import because
        # per-API policies reference {{...}} tokens.
        $nvFile = Join-Path $repo 'services\apim\named-values\named-values.json'
        if (Test-Path $nvFile) {
            $nvDoc = Get-Content $nvFile -Raw | ConvertFrom-Json
            $apiVersion = '2022-08-01'
            $stubCount = 0
            foreach ($nv in $nvDoc.namedValues) {
                $useStub = ($nv.keyVaultSecretIdentifier -like '*<*>*')
                if ($useStub) { $stubCount++ }
                if ($PSCmdlet.ShouldProcess("$($nv.name)@$apimName", 'az rest PUT namedValues')) {
                    if ($useStub) {
                        # Per-NV stub values that satisfy APIM validators (CORS origin
                        # forbids paths; OIDC discovery must resolve; audience can be
                        # any string). Use realistic public endpoints where remote
                        # validation kicks in.
                        $stubValue = switch -Wildcard ($nv.name) {
                            'portal-origin'                       { 'https://localhost:3000' }
                            'entra-openid-config-url'             { 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration' }
                            'external-id-openid-config-url'       { 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration' }
                            'entra-api-audience'                  { 'api://udcsp-stub' }
                            'external-id-api-audience'            { 'api://udcsp-stub' }
                            default                               { 'https://placeholder.local' }
                        }
                        $body = [ordered]@{
                            properties = [ordered]@{
                                displayName = $nv.name
                                secret      = $false
                                value       = $stubValue
                            }
                        }
                    } else {
                        $body = [ordered]@{
                            properties = [ordered]@{
                                displayName = $nv.name
                                secret      = $true
                                keyVault    = [ordered]@{ secretIdentifier = $nv.keyVaultSecretIdentifier }
                            }
                        }
                    }
                    $bodyFile = Join-Path $ReportDir "apim-nv-$($country.ToLower())-$($nv.name).json"
                    $body | ConvertTo-Json -Depth 6 | Set-Content $bodyFile -Encoding utf8
                    $url = "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.ApiManagement/service/$apimName/namedValues/$($nv.name)?api-version=$apiVersion"
                    $sink = Join-Path $ReportDir "apim-nv-$($country.ToLower())-$($nv.name).resp"
                    Invoke-NativeCommand `
                        -Command @('az','rest','--method','PUT','--url',$url,'--body',"@$bodyFile",
                                   '--only-show-errors','--output-file',$sink) `
                        -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
                }
            }
            if ($stubCount -gt 0) {
                Write-Host "    ↳ $stubCount named-values published as plain-text stubs (KV placeholders unresolved — expected in dev)"
            }
        }

        # Deploy global policy fragments declared as <fragment>...</fragment> XML
        # files in services/apim/policies/. Per-API policies include them via
        # <include-fragment fragment-id="..." />, so they must exist before
        # per-API policy import.
        $fragDir = Join-Path $repo 'services\apim\policies'
        if (Test-Path $fragDir) {
            $apiVersion = '2022-08-01'
            foreach ($frag in (Get-ChildItem $fragDir -Filter '*.xml' -ErrorAction SilentlyContinue)) {
                $fragId = $frag.BaseName
                $fragXml = Get-Content $frag.FullName -Raw
                if ($PSCmdlet.ShouldProcess("$fragId@$apimName", 'az rest PUT policyFragments')) {
                    $body = [ordered]@{
                        properties = [ordered]@{
                            description = "UDCSP $fragId fragment"
                            format      = 'xml'
                            value       = $fragXml
                        }
                    }
                    $bodyFile = Join-Path $ReportDir "apim-fragment-$($country.ToLower())-$fragId.json"
                    $body | ConvertTo-Json -Depth 6 | Set-Content $bodyFile -Encoding utf8
                    $url = "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.ApiManagement/service/$apimName/policyFragments/${fragId}?api-version=$apiVersion"
                    $sink = Join-Path $ReportDir "apim-fragment-$($country.ToLower())-$fragId.resp"
                    Invoke-NativeCommand `
                        -Command @('az','rest','--method','PUT','--url',$url,'--body',"@$bodyFile",
                                   '--only-show-errors','--output-file',$sink) `
                        -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
                }
            }
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
                    if ($PSCmdlet.ShouldProcess("policy@$($a.Name)@$apimName", 'az rest PUT api policy')) {
                        $policyXml = Get-Content $policy -Raw
                        $policyBody = [ordered]@{
                            properties = [ordered]@{
                                format = 'rawxml'
                                value  = $policyXml
                            }
                        }
                        $policyBodyFile = Join-Path $ReportDir "apim-policy-$($country.ToLower())-$($a.Name).json"
                        $policyBody | ConvertTo-Json -Depth 6 | Set-Content $policyBodyFile -Encoding utf8
                        $policyUrl = "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.ApiManagement/service/$apimName/apis/$($a.Name)/policies/policy?api-version=2022-08-01"
                        $policySink = Join-Path $ReportDir "apim-policy-$($country.ToLower())-$($a.Name).resp"
                        Invoke-NativeCommand `
                            -Command @('az','rest','--method','PUT','--url',$policyUrl,'--body',"@$policyBodyFile",
                                       '--only-show-errors','--output-file',$policySink) `
                            -LogFile $logFile `
                            -WhatIfFlag $whatIf `
                            -ContinueOnError
                    }
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
                    -WhatIfFlag $whatIf `
                    -ContinueOnError
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
                $apimName = "udcsp-$($country.ToLower())-prod-apim"
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
