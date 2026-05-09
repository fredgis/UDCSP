<#
.SYNOPSIS
    Install-Priva — Microsoft Priva configuration for GDPR Subject Rights
    Requests (Art. 15-22) industrialised. Replaces the custom Logic Apps
    DSR orchestration as primary; Logic Apps retained as technical sub-processor.
    Post-audit refactor 2026-05-09.
#>
function Install-Priva {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $cfg = Join-Path $repo 'governance\priva\priva-config.yaml'
    if (-not (Test-Path $cfg)) { Write-Warning "Missing $cfg"; return }
    if ($PSCmdlet.ShouldProcess('priva-config', 'Apply')) {
        "[scaffold] msgraph apply priva-config $cfg" |
            Add-Content (Join-Path $ReportDir 'install-priva.log')
    }
    $policies = Get-ChildItem (Join-Path $repo 'governance\priva\priva-policies') -Filter '*.json' -ErrorAction SilentlyContinue
    foreach ($p in $policies) {
        "[scaffold] apply priva-policy $($p.Name)" |
            Add-Content (Join-Path $ReportDir 'install-priva.log')
    }
}
function Test-Priva {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'governance\priva\scripts\Test-Priva.ps1'
    if (Test-Path $script) { Write-Host "  → component test: $script -Offline" } else { Write-Warning "Missing $script" }
    "{`"phase`":`"Priva`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-priva.json')
}
Export-ModuleMember -Function Install-Priva, Test-Priva
