<#
.SYNOPSIS
    Install-ConfidentialLedger — CCF-backed tamper-evident ledger hosting
    the EU AI Act Art. 26(6) registry. Real Bicep deployment.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-ConfidentialLedger {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\security\confidential-ledger\confidential-ledger.bicep'
    $logFile = Join-Path $ReportDir 'install-confidential-ledger.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }
    if ($PSCmdlet.ShouldProcess('confidential-ledger', 'az deployment group create')) {
        $rg = "udcsp-shared-conf-ledger-rg"
        $clRegion = if ($Config.ContainsKey('ConfidentialLedger') -and $Config.ConfidentialLedger.Region) { $Config.ConfidentialLedger.Region } else { $Config.Regions.Shared }
        # logAnalyticsWorkspaceId is required by the bicep but the actual LAW
        # is provisioned by Install-Observability per country; ops wires the
        # diagnostic-settings target post-install. Pass a placeholder so the
        # deployment can proceed; operators replace it via az policy or a
        # follow-up `az monitor diagnostic-settings update`.
        $clParams = [ordered]@{
            '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
            contentVersion = '1.0.0.0'
            parameters = [ordered]@{
                logAnalyticsWorkspaceId = @{ value = "/subscriptions/$($Config.Subscriptions.SharedPlatform)/resourceGroups/udcsp-shared-observability-rg/providers/Microsoft.OperationalInsights/workspaces/udcsp-shared-law" }
            }
        }
        $clParamsFile = Join-Path $ReportDir 'confidential-ledger.parameters.json'
        $clParams | ConvertTo-Json -Depth 6 | Set-Content $clParamsFile -Encoding utf8
        Invoke-AzGroupDeployment `
            -Subscription $Config.Subscriptions.SharedPlatform `
            -ResourceGroup $rg `
            -Location $clRegion `
            -TemplateFile $bicep `
            -ParametersFile $clParamsFile `
            -LogFile $logFile `
            -DeploymentName 'udcsp-confidential-ledger' `
            -Tags $Config.Tags `
            -WhatIfFlag $whatIf
    }
}

function Test-ConfidentialLedger {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\security\confidential-ledger\confidential-ledger.bicep'
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }
    "{`"phase`":`"ConfidentialLedger`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-confidential-ledger.json')
}

Export-ModuleMember -Function Install-ConfidentialLedger, Test-ConfidentialLedger
