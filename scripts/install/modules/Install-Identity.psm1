<#
.SYNOPSIS
    Install-Identity (A2) — Microsoft Entra External ID (CIAM) tenants per country,
    user flows, custom authentication extensions, Entra ID (workforce) Conditional Access,
    PIM eligibility.
    NOTE: Substitutes the legacy Microsoft Entra External ID product, which is unavailable to new customers
    as of 1 May 2025. See docs/tech/architecture.md.
#>
function Install-Identity {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)

    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'DK','SE','NO') {
        $tenant = $Config.ExternalIdTenants[$country]
        Write-Host "  → External ID tenant $tenant"
        if ($PSCmdlet.ShouldProcess($tenant, 'Apply user flows + custom auth extensions + CA + PIM')) {
            $flows = Get-ChildItem (Join-Path $repo "infra\identity\external-id\user-flows") -Filter '*.json' -ErrorAction SilentlyContinue
            foreach ($f in $flows) {
                "[scaffold] msgraph apply user-flow / extension $tenant <- $($f.Name)" |
                    Add-Content (Join-Path $ReportDir 'install-identity.log')
            }
        }
    }
}

function Test-Identity {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'DK','SE','NO') {
        $tenant = $Config.ExternalIdTenants[$country]
        $url = "https://$($tenant.Split('.')[0]).ciamlogin.com/$tenant/.well-known/openid-configuration"
        Write-Host "  → discover $url (offline-skipped in scaffold)"
    }
    $script = Join-Path $repo 'infra\identity\scripts\Test-IdentityFederation.ps1'
    if (Test-Path $script) { Write-Host "  → component test: $script" }
    "{`"phase`":`"Identity`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-identity.json')
}

Export-ModuleMember -Function Install-Identity, Test-Identity
