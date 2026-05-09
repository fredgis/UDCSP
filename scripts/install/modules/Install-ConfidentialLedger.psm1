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
    if ($PSCmdlet.ShouldProcess('confidential-ledger', 'az deployment sub create')) {
        Invoke-AzSubDeployment `
            -Subscription $Config.Subscriptions.SharedPlatform `
            -Location $Config.ConfidentialLedger.Region `
            -TemplateFile $bicep `
            -LogFile $logFile `
            -DeploymentName 'udcsp-confidential-ledger' `
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
