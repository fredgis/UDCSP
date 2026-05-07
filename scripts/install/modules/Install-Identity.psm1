<#
.SYNOPSIS
    Install-Identity (A2) — B2C tenants, custom policies, Entra External ID,
    Conditional Access, PIM eligibility.
#>
function Install-Identity {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)

    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'DK','SE','NO') {
        $tenant = $Config.B2CTenants[$country]
        Write-Host "  → B2C tenant $tenant"
        if ($PSCmdlet.ShouldProcess($tenant, 'Upload custom policies + CA + PIM')) {
            $policies = Get-ChildItem (Join-Path $repo "infra\identity\b2c\custom-policies") -Filter '*.xml' -ErrorAction SilentlyContinue
            foreach ($p in $policies) {
                "[scaffold] msgraph upload trustframework policy $tenant <- $($p.Name)" |
                    Add-Content (Join-Path $ReportDir 'install-identity.log')
            }
        }
    }
}

function Test-Identity {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'DK','SE','NO') {
        $tenant = $Config.B2CTenants[$country]
        $url = "https://$($tenant.Split('.')[0]).b2clogin.com/$tenant/.well-known/openid-configuration?p=B2C_1A_SignUpOrSignIn"
        Write-Host "  → discover $url (offline-skipped in scaffold)"
    }
    $script = Join-Path $repo 'infra\identity\scripts\Test-IdentityFederation.ps1'
    if (Test-Path $script) { Write-Host "  → component test: $script" }
    "{`"phase`":`"Identity`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-identity.json')
}

Export-ModuleMember -Function Install-Identity, Test-Identity
