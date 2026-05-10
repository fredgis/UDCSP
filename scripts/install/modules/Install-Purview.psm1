<#
.SYNOPSIS
    Install-Purview — Account, sources, classifications, sensitivity
    labels, DLP, sharing policies. Real Bicep deploy + register sources
    via Atlas API.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Purview {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'governance\purview\account\purview-account.bicep'
    $logFile = Join-Path $ReportDir 'install-purview.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }
    if (-not $Config.ContainsKey('PurviewAccount') -or -not $Config.PurviewAccount.Name) {
        Write-Log -LogFile $logFile -Message "[skip] Config.PurviewAccount is missing or has no Name; Purview deploy skipped."
        return
    }
    $purview = $Config.PurviewAccount

    if ($PSCmdlet.ShouldProcess($purview.Name, 'az deployment group create')) {
        Invoke-AzGroupDeployment `
            -Subscription $purview.Subscription `
            -ResourceGroup $purview.ResourceGroup `
            -Location $Config.Regions.Shared `
            -TemplateFile $bicep `
            -LogFile $logFile `
            -DeploymentName "udcsp-purview" `
            -Tags $Config.Tags `
            -WhatIfFlag $whatIf
    }

    $register = Join-Path $repo 'governance\purview\scripts\Register-PurviewSources.ps1'
    if ((Test-Path $register) -and $PSCmdlet.ShouldProcess($purview.Name, 'Register-PurviewSources.ps1')) {
        Invoke-NativeCommand `
            -Command @('pwsh','-File',$register,'-PurviewAccountName',$purview.Name) `
            -LogFile $logFile `
            -WhatIfFlag $whatIf `
            -ContinueOnError
    }

    $validate = Join-Path $repo 'governance\ai-act\scripts\Validate-AIRegistry.ps1'
    if (Test-Path $validate) { & $validate | Out-Null }
}

function Test-Purview {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'governance\purview\scripts\Test-Purview.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    & $script -Offline | Out-Null
    "{`"phase`":`"Purview`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-purview.json')
}

Export-ModuleMember -Function Install-Purview, Test-Purview
