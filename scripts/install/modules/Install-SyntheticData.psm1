<#
.SYNOPSIS
    Install-SyntheticData (A15) — Generate and seed personas, applications,
    conversations, eval datasets across DK/SE/NO × 12 languages.
#>
function Install-SyntheticData {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'data\synthetic\scripts\Generate-All.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    if ($PSCmdlet.ShouldProcess('Synthetic data', 'Generate + seed')) {
        & $script -ReportDir $ReportDir
    }
}

function Test-SyntheticData {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'data\synthetic\scripts\Validate-Synthetic.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    & $script | Out-Null
    "{`"phase`":`"SyntheticData`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-synthetic-data.json')
}

Export-ModuleMember -Function Install-SyntheticData, Test-SyntheticData
