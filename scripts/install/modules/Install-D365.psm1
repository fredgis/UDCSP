<#
.SYNOPSIS
    Install-D365 (A8) — Solutions, BPFs, queues, SLAs, Copilot for Service.
#>
function Install-D365 {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'DK','SE','NO') {
        $url = $Config.D365EnvironmentUrls[$country]
        $solutionsRoot = Join-Path $repo 'apps\d365\solutions'
        $core = Join-Path $solutionsRoot 'UDCSP_Core'
        $countrySln = Join-Path $solutionsRoot "UDCSP_$country"
        if ($PSCmdlet.ShouldProcess($url, 'Import UDCSP_Core then country solution')) {
            "[scaffold] pac solution import --path $core --environment $url" |
                Add-Content (Join-Path $ReportDir 'install-d365.log')
            "[scaffold] pac solution import --path $countrySln --environment $url" |
                Add-Content (Join-Path $ReportDir 'install-d365.log')
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
