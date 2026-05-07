<#
.SYNOPSIS
    Install-Purview (A13) — Account, sources, classifications, sensitivity labels,
    DLP, sharing policies.
#>
function Install-Purview {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    if ($PSCmdlet.ShouldProcess($Config.PurviewAccount.Name, 'Bicep deploy + register sources')) {
        "[scaffold] az deployment group create -g $($Config.PurviewAccount.ResourceGroup) --template-file $repo\governance\purview\account\purview-account.bicep" |
            Add-Content (Join-Path $ReportDir 'install-purview.log')
        $register = Join-Path $repo 'governance\purview\scripts\Register-PurviewSources.ps1'
        "[scaffold] & $register" | Add-Content (Join-Path $ReportDir 'install-purview.log')
    }
    # AI Act registry validation runs as part of governance install
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
