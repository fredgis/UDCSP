<#
.SYNOPSIS
    Install-Security (A3) — Defender for Cloud, Sentinel, Azure Policy,
    DPIA artefacts.
#>
function Install-Security {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicepRoot = Join-Path $repo 'infra\security'
    foreach ($country in 'DK','SE','NO','SharedPlatform') {
        $sub = $Config.Subscriptions[$country]
        if (-not $sub) { continue }
        Write-Host "  → defender + sentinel sub=$sub"
        if ($PSCmdlet.ShouldProcess("$country security baseline", 'Bicep deploy')) {
            "[scaffold] az deployment sub create --subscription $sub --template-file $bicepRoot\defender\defender-for-cloud.bicep" |
                Add-Content (Join-Path $ReportDir 'install-security.log')
            "[scaffold] az deployment sub create --subscription $sub --template-file $bicepRoot\sentinel\sentinel-workspace.bicep" |
                Add-Content (Join-Path $ReportDir 'install-security.log')
        }
    }
}

function Test-Security {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    # DPIA artefacts moved from infra/security/dpia/ to governance/dpia/ (commit 736dc14)
    # to align with docs/biz/ai.md §11 and EDPB Guidelines 04/2018 governance ownership.
    $required = @(
        'infra\security\defender\defender-for-cloud.bicep',
        'infra\security\sentinel\sentinel-workspace.bicep',
        'governance\dpia\dpia-template.md',
        'governance\dpia\dpia-eligibility-model.md'
    )
    foreach ($r in $required) {
        $p = Join-Path $repo $r
        if (-not (Test-Path $p)) { throw "Missing security artefact: $r" }
    }
    "{`"phase`":`"Security`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-security.json')
}

Export-ModuleMember -Function Install-Security, Test-Security
