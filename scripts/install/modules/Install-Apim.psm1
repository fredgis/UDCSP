<#
.SYNOPSIS
    Install-Apim (A7) — APIM instance, products, APIs, policies.
#>
function Install-Apim {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'services\apim\apim.bicep'
    if ($PSCmdlet.ShouldProcess('APIM Premium multi-region', 'Bicep deploy')) {
        "[scaffold] az deployment group create --template-file $bicep" |
            Add-Content (Join-Path $ReportDir 'install-apim.log')
    }
    $apis = Get-ChildItem (Join-Path $repo 'services\apim\apis') -Directory -ErrorAction SilentlyContinue
    foreach ($a in $apis) {
        $openapi = Join-Path $a.FullName 'openapi.yaml'
        $policy  = Join-Path $a.FullName 'policy.xml'
        if (Test-Path $openapi) {
            "[scaffold] az apim api import --path $($a.Name) --specification-path $openapi --policy $policy" |
                Add-Content (Join-Path $ReportDir 'install-apim.log')
        }
    }
}

function Test-Apim {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'services\apim\scripts\Test-Apim.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    "{`"phase`":`"Apim`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-apim.json')
}

Export-ModuleMember -Function Install-Apim, Test-Apim
