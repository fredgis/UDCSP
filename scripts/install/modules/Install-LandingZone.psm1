<#
.SYNOPSIS
    Install-LandingZone (A1) — Bicep deployment of MG hierarchy, networking,
    Key Vault, ACR, Storage per country.
#>
function Install-LandingZone {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)

    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\landing-zone'
    foreach ($country in 'DK','SE','NO') {
        $sub = $Config.Subscriptions[$country]
        $region = $Config.Regions[$country]
        $param = Join-Path $bicepRoot "parameters\$($country.ToLower()).bicepparam"
        Write-Host "  → $country sub=$sub region=$region"
        if ($PSCmdlet.ShouldProcess("$country landing zone", 'Bicep deploy')) {
            # az deployment sub create --subscription $sub --location $region --template-file $bicepRoot\main.bicep --parameters $param
            "[scaffold] az deployment sub create --subscription $sub --location $region --template-file $bicepRoot\main.bicep --parameters $param" |
                Add-Content (Join-Path $ReportDir 'install-landing-zone.log')
        }
    }
}

function Test-LandingZone {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\landing-zone'
    $required = @(
        (Join-Path $bicepRoot 'main.bicep'),
        (Join-Path $bicepRoot 'modules\networking.bicep'),
        (Join-Path $bicepRoot 'modules\keyvault.bicep'),
        (Join-Path $bicepRoot 'modules\storage.bicep'),
        (Join-Path $bicepRoot 'modules\acr.bicep')
    )
    $missing = $required | Where-Object { -not (Test-Path $_) }
    if ($missing) { throw "Missing landing-zone artefacts: $($missing -join ', ')" }
    "{`"phase`":`"LandingZone`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-landing-zone.json')
}

Export-ModuleMember -Function Install-LandingZone, Test-LandingZone
