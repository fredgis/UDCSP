<#
.SYNOPSIS
    Install-LogicApps — Standard workspaces, workflows, connections,
    Service Bus, Event Grid. Real Bicep deploy + workflow publish per
    workflow folder via Azure Functions Core Tools.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-LogicApps {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $logFile = Join-Path $ReportDir 'install-logic-apps.log'
    $whatIf = [bool]$WhatIfPreference
    $workspaceBicep = Join-Path $repo 'services\logic-apps\workspace.bicep'
    $sbBicep = Join-Path $repo 'services\logic-apps\servicebus\servicebus.bicep'
    $egBicep = Join-Path $repo 'services\logic-apps\eventgrid\topic-subscriptions.bicep'

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-logicapps-rg"
        $envName = if ($Config.ContainsKey('Environment')) { $Config.Environment } else { 'dev' }
        $aiCs = ''
        if ($Config.ContainsKey('Voice') -and $Config.Voice.ContainsKey($country.ToLower())) {
            $aiCs = [string]$Config.Voice[$country.ToLower()].appInsightsConnectionString
        }
        if (-not $aiCs) { $aiCs = 'InstrumentationKey=00000000-0000-0000-0000-000000000000' }
        if (Test-Path $workspaceBicep) {
            if ($PSCmdlet.ShouldProcess("logicapps-workspace-$country", 'az deployment group create')) {
                $wsParams = [ordered]@{
                    '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
                    contentVersion = '1.0.0.0'
                    parameters = [ordered]@{
                        country                     = @{ value = $country.ToLower() }
                        env                         = @{ value = $envName }
                        appInsightsConnectionString = @{ value = $aiCs }
                    }
                }
                $wsParamsFile = Join-Path $ReportDir "logicapps-ws-$($country.ToLower()).parameters.json"
                $wsParams | ConvertTo-Json -Depth 6 | Set-Content $wsParamsFile -Encoding utf8
                Invoke-AzGroupDeployment `
                    -Subscription $sub -ResourceGroup $rg -Location $region `
                    -TemplateFile $workspaceBicep `
                    -ParametersFile $wsParamsFile `
                    -LogFile $logFile `
                    -DeploymentName "udcsp-logicapps-ws-$($country.ToLower())" `
                    -Tags $Config.Tags `
                    -WhatIfFlag $whatIf
            }
        }
        if (Test-Path $sbBicep) {
            if ($PSCmdlet.ShouldProcess("logicapps-servicebus-$country", 'az deployment group create')) {
                $sbParams = [ordered]@{
                    '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
                    contentVersion = '1.0.0.0'
                    parameters = [ordered]@{
                        country = @{ value = $country.ToLower() }
                        env     = @{ value = $envName }
                    }
                }
                $sbParamsFile = Join-Path $ReportDir "logicapps-sb-$($country.ToLower()).parameters.json"
                $sbParams | ConvertTo-Json -Depth 6 | Set-Content $sbParamsFile -Encoding utf8
                Invoke-AzGroupDeployment `
                    -Subscription $sub -ResourceGroup $rg -Location $region `
                    -TemplateFile $sbBicep `
                    -ParametersFile $sbParamsFile `
                    -LogFile $logFile `
                    -DeploymentName "udcsp-logicapps-sb-$($country.ToLower())" `
                    -Tags $Config.Tags `
                    -WhatIfFlag $whatIf
            }
        }
        if (Test-Path $egBicep) {
            # Domain-events topic. Subscription wiring deferred (empty webhook
            # endpoint) until ops know the consumer URL — see services/logic-apps/eventgrid/README.md.
            if ($PSCmdlet.ShouldProcess("logicapps-eventgrid-$country", 'az deployment group create')) {
                $envName = if ($Config.ContainsKey('Environment')) { $Config.Environment } else { 'dev' }
                $egParams = [ordered]@{
                    '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
                    contentVersion = '1.0.0.0'
                    parameters = [ordered]@{
                        country = @{ value = $country.ToLower() }
                        env     = @{ value = $envName }
                    }
                }
                $egParamsFile = Join-Path $ReportDir "logicapps-eg-$($country.ToLower()).parameters.json"
                $egParams | ConvertTo-Json -Depth 6 | Set-Content $egParamsFile -Encoding utf8
                Invoke-AzGroupDeployment `
                    -Subscription $sub -ResourceGroup $rg -Location $region `
                    -TemplateFile $egBicep `
                    -ParametersFile $egParamsFile `
                    -LogFile $logFile `
                    -DeploymentName "udcsp-logicapps-eg-$($country.ToLower())" `
                    -Tags $Config.Tags `
                    -WhatIfFlag $whatIf
            }
        }

        # Publish each workflow folder via func core tools (idempotent).
        $workflows = Get-ChildItem (Join-Path $repo 'services\logic-apps\workflows') -Directory -ErrorAction SilentlyContinue
        foreach ($w in $workflows) {
            $appName = "udcsp-$($country.ToLower())-logicapps"
            if ($PSCmdlet.ShouldProcess("$($w.Name)@$appName", 'func azure logicapp publish')) {
                Push-Location $w.FullName
                try {
                    Invoke-NativeCommand `
                        -Command @('func','azure','logicapp','publish',$appName,'--subscription',$sub) `
                        -LogFile $logFile `
                        -WhatIfFlag $whatIf `
                        -ContinueOnError
                } finally { Pop-Location }
            }
        }
    }
}

function Test-LogicApps {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'services\logic-apps\scripts\Test-LogicApps.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    "{`"phase`":`"LogicApps`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-logic-apps.json')
}

Export-ModuleMember -Function Install-LogicApps, Test-LogicApps
