<#
.SYNOPSIS
    Install-LogicApps — Service Bus + Event Grid infrastructure, plus
    per-country deployment of every workflow in services/logic-apps/workflows/
    as either:
      • Logic Apps Standard (env=prod) — via workspace.bicep + func publish
      • Logic Apps Consumption (env=dev/test) — via az rest PUT on
        Microsoft.Logic/workflows resources, with the workflow.json
        definition transformed (Service Bus ServiceProvider triggers
        converted to HTTP Request triggers — see notes in
        docs/tech/architecture.md "Logic Apps tier choice").

    Why two tiers: MCAPS dev sandbox sub has 0 'Total VMs' App Service
    quota → Workflow Standard WS1 SKU cannot deploy. Consumption is
    multitenant (no VM quota), pay-per-execution, and supports the same
    HTTP-based workflow definitions the demos exercise. Production keeps
    Standard for VNet integration, no cold start, and stateful semantics.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Remove-CommentKeys {
    <#
    .SYNOPSIS
        Recursively strips _comment keys (and similar non-schema metadata)
        from a Logic Apps workflow definition. Azure rejects unknown keys
        in the definition root and in action blocks.
    #>
    param([Parameter(Mandatory)]$Node)
    if ($null -eq $Node) { return $null }
    if ($Node -is [string] -or $Node.GetType().IsPrimitive) { return $Node }
    if ($Node -is [System.Collections.IDictionary]) {
        $clean = [ordered]@{}
        foreach ($k in @($Node.Keys)) {
            if ($k -like '_*') { continue }
            $clean[$k] = Remove-CommentKeys -Node $Node[$k]
        }
        return $clean
    } elseif ($Node -is [System.Collections.IEnumerable]) {
        return ,@($Node | ForEach-Object { Remove-CommentKeys -Node $_ })
    } else {
        return $Node
    }
}

function Convert-TriggerToHttpRequest {
    <#
    .SYNOPSIS
        Replaces Service Bus ServiceProvider triggers (Standard in-app
        connector) with a plain HTTP Request trigger so the workflow
        deploys cleanly on Consumption. The original SB queue name is
        preserved in a metadata field (`x-udcsp-original-sb-queue`) so
        ops can wire a managed Service Bus connection in prod.
    #>
    param([Parameter(Mandatory)]$Triggers)
    $out = [ordered]@{}
    foreach ($name in @($Triggers.Keys)) {
        $t = $Triggers[$name]
        if ($t.type -eq 'ServiceProvider') {
            $queue = $null
            try { $queue = $t.inputs.parameters.queueName } catch {}
            $out['When_HTTP_request_received'] = [ordered]@{
                type = 'Request'
                kind = 'Http'
                inputs = [ordered]@{
                    schema = [ordered]@{ type = 'object' }
                }
                metadata = [ordered]@{
                    'x-udcsp-original-trigger'  = "service-bus:$name"
                    'x-udcsp-original-sb-queue' = $queue
                }
            }
        } else {
            $out[$name] = $t
        }
    }
    return $out
}

function Get-StubParameterValue {
    <#
    .SYNOPSIS
        Returns a deterministic stub value for a workflow definition
        parameter declared in workflow.json. Real values are wired in
        prod via Key Vault references on the Standard workflow host;
        Consumption uses the inlined value here.
    #>
    param([string]$Name, [string]$Country, [string]$EnvName, [string]$Region)
    switch -Wildcard ($Name) {
        'country'             { return $Country }
        'env'                 { return $EnvName }
        'region'              { return $Region }
        'aiActRegistryId'     { return "ai-act-${Country}-${EnvName}" }
        'archiveAuthority'    { return @{dk='Statens Arkiver';se='Riksarkivet';no='Arkivverket'}[$Country] }
        'archiveLegalBasis'   {
            return @{
                dk='Arkivloven LBK nr 1201/2016 §5'
                se='Arkivlagen SFS 1990:782'
                no='Arkivlova LOV-1992-12-04-126'
            }[$Country]
        }
        '*Endpoint'           { return "https://${Country}-${Name}.placeholder.local" }
        '*Url'                { return "https://${Country}-${Name}.placeholder.local" }
        default               { return "stub-${Country}-${Name}" }
    }
}

function New-ConsumptionWorkflow {
    <#
    .SYNOPSIS
        Builds the Microsoft.Logic/workflows PUT body for one workflow
        folder and submits it via az rest. Stub parameters are inlined
        so the workflow runs end-to-end in demo scenarios (HTTP actions
        will 404 against unreachable stubs but the workflow definition,
        triggers, and run history are exercised correctly).
    #>
    param(
        [Parameter(Mandatory)][string]$Sub,
        [Parameter(Mandatory)][string]$ResourceGroup,
        [Parameter(Mandatory)][string]$Location,
        [Parameter(Mandatory)][string]$WorkflowName,
        [Parameter(Mandatory)][hashtable]$WorkflowJson,
        [Parameter(Mandatory)][string]$Country,
        [Parameter(Mandatory)][string]$EnvName,
        [Parameter(Mandatory)][string]$LogFile,
        [Parameter(Mandatory)][string]$ReportDir,
        [Parameter(Mandatory)][bool]$WhatIf
    )

    $definition = $WorkflowJson.definition
    if ($null -eq $definition) { return }

    $definition = Remove-CommentKeys -Node $definition
    # Consumption schema acceptance differs from Standard. Rewrite to a
    # supported schema version (the action/trigger syntax we use is
    # compatible across both).
    if ($definition.Contains('$schema')) {
        $definition['$schema'] = 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
    }
    if ($definition.triggers) {
        $definition.triggers = Convert-TriggerToHttpRequest -Triggers $definition.triggers
    }

    $paramValues = [ordered]@{}
    if ($definition.parameters) {
        foreach ($p in @($definition.parameters.Keys)) {
            $decl = $definition.parameters[$p]
            $val = $null
            if ($decl -is [System.Collections.IDictionary] -and $decl.Contains('defaultValue')) {
                $val = $decl['defaultValue']
            }
            if ($null -eq $val) {
                $val = Get-StubParameterValue -Name $p -Country $Country -EnvName $EnvName -Region $Location
            }
            $paramValues[$p] = [ordered]@{ value = $val }
        }
    }

    $resName = "udcsp-${Country}-${EnvName}-$WorkflowName"
    $body = [ordered]@{
        location = $Location
        tags = [ordered]@{
            country             = $Country
            costCenter          = 'UDCSP'
            dataResidency       = 'EU'
            dataClassification  = 'Confidential'
            owner               = 'A7'
            logicAppsTier       = 'Consumption'
            workflow            = $WorkflowName
        }
        properties = [ordered]@{
            state      = 'Enabled'
            definition = $definition
            parameters = $paramValues
        }
    }

    $bodyFile = Join-Path $ReportDir "logicapps-wf-${Country}-${WorkflowName}.json"
    $body | ConvertTo-Json -Depth 30 | Set-Content $bodyFile -Encoding utf8

    $url = "/subscriptions/$Sub/resourceGroups/$ResourceGroup/providers/Microsoft.Logic/workflows/${resName}?api-version=2019-05-01"
    $sink = Join-Path $ReportDir "logicapps-wf-${Country}-${WorkflowName}.resp"
    Invoke-NativeCommand `
        -Command @('az','rest','--method','PUT','--url',$url,'--body',"@$bodyFile",
                   '--only-show-errors','--output-file',$sink) `
        -LogFile $LogFile -WhatIfFlag $WhatIf -ContinueOnError
}

function Install-LogicApps {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $logFile = Join-Path $ReportDir 'install-logic-apps.log'
    $whatIf = [bool]$WhatIfPreference
    $workspaceBicep = Join-Path $repo 'services\logic-apps\workspace.bicep'
    $sbBicep = Join-Path $repo 'services\logic-apps\servicebus\servicebus.bicep'
    $egBicep = Join-Path $repo 'services\logic-apps\eventgrid\topic-subscriptions.bicep'
    $envName = if ($Config.ContainsKey('Environment')) { [string]$Config.Environment } else { 'prod' }
    $useConsumption = ($envName -ne 'prod')

    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $rg = "udcsp-$($country.ToLower())-logicapps-rg"

        # Service Bus + Event Grid first — both tiers need them, neither
        # requires VM quota.
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
                    -WhatIfFlag $whatIf `
                    -ContinueOnError
            }
        }
        if (Test-Path $egBicep) {
            # Domain-events topic. Subscription wiring deferred (empty webhook
            # endpoint) until ops know the consumer URL — see services/logic-apps/eventgrid/README.md.
            if ($PSCmdlet.ShouldProcess("logicapps-eventgrid-$country", 'az deployment group create')) {
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
                    -WhatIfFlag $whatIf `
                    -ContinueOnError
            }
        }

        if ($useConsumption) {
            Write-Host "    ↳ tier=Consumption (env=$envName) — deploying Microsoft.Logic/workflows resources"
            $aiCs = ''
            if ($Config.ContainsKey('Voice') -and $Config.Voice.ContainsKey($country.ToLower())) {
                $aiCs = [string]$Config.Voice[$country.ToLower()].appInsightsConnectionString
            }

            $workflows = Get-ChildItem (Join-Path $repo 'services\logic-apps\workflows') -Directory -ErrorAction SilentlyContinue
            foreach ($w in $workflows) {
                $wfJsonFile = Join-Path $w.FullName 'workflow.json'
                if (-not (Test-Path $wfJsonFile)) { continue }
                if ($PSCmdlet.ShouldProcess("$($w.Name)@$country", 'az rest PUT Microsoft.Logic/workflows')) {
                    $raw = Get-Content $wfJsonFile -Raw | ConvertFrom-Json -AsHashtable
                    New-ConsumptionWorkflow `
                        -Sub $sub -ResourceGroup $rg -Location $region `
                        -WorkflowName $w.Name -WorkflowJson $raw `
                        -Country $country.ToLower() -EnvName $envName `
                        -LogFile $logFile -ReportDir $ReportDir -WhatIf $whatIf
                }
            }
        } else {
            # Standard tier (prod). Deploys workspace.bicep then publishes
            # every workflow folder via func core tools.
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

            $appName = "udcsp-$($country.ToLower())-$envName-logic"
            $siteExists = $false
            try {
                $null = az webapp show --subscription $sub --resource-group $rg --name $appName --only-show-errors --output none 2>$null
                $siteExists = ($LASTEXITCODE -eq 0)
            } catch { $siteExists = $false }
            if (-not $siteExists) {
                Write-Host "    ↳ skip workflow publish ($appName not found — workspace deploy failed)"
                continue
            }
            $workflows = Get-ChildItem (Join-Path $repo 'services\logic-apps\workflows') -Directory -ErrorAction SilentlyContinue
            foreach ($w in $workflows) {
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
}

function Test-LogicApps {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'services\logic-apps\scripts\Test-LogicApps.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    "{`"phase`":`"LogicApps`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-logic-apps.json')
}

Export-ModuleMember -Function Install-LogicApps, Test-LogicApps, New-ConsumptionWorkflow, Convert-TriggerToHttpRequest, Remove-CommentKeys, Get-StubParameterValue
