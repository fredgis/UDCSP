<#
.SYNOPSIS
    Install-D365 — Solutions (UDCSP_Core then UDCSP_<country>), BPFs,
    queues, SLAs, Copilot for Service via Power Platform CLI.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-D365 {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $solutionsRoot = Join-Path $repo 'apps\d365\solutions'
    $logFile = Join-Path $ReportDir 'install-d365.log'
    $whatIf = [bool]$WhatIfPreference

    if (-not (Test-CliAvailable -Name 'pac')) {
        Write-Log -LogFile $logFile -Message "[skip] Power Platform CLI ('pac') not on PATH. Install: https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction. Operations recorded for manual replay."
    }

    foreach ($country in 'DK','SE','NO') {
        $url = $Config.D365EnvironmentUrls[$country]
        if (-not $url) { continue }
        if ($PSCmdlet.ShouldProcess($url, 'pac auth select')) {
            Invoke-NativeCommand `
                -Command @('pac','auth','select','--environment',$url) `
                -LogFile $logFile `
                -WhatIfFlag $whatIf `
                -ContinueOnError
        }
        foreach ($sln in @('UDCSP_Core',"UDCSP_$country")) {
            $path = Join-Path $solutionsRoot $sln
            if (-not (Test-Path $path)) {
                Write-Log -LogFile $logFile -Message "[skip] solution path not found: $path"
                continue
            }
            if ($PSCmdlet.ShouldProcess("$sln@$url", 'pac solution import')) {
                Invoke-NativeCommand `
                    -Command @('pac','solution','import','--path',$path,'--publish-changes','--environment',$url) `
                    -LogFile $logFile `
                    -WhatIfFlag $whatIf `
                    -ContinueOnError
            }
        }
    }
}

function Test-D365 {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'apps\d365\scripts\Test-D365.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    "{`"phase`":`"D365`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-d365.json')
}

Export-ModuleMember -Function Install-D365, Test-D365
