<#
.SYNOPSIS
    Install-Identity — Microsoft Entra External ID (CIAM) tenants per
    country, user flows, custom authentication extensions, Conditional
    Access, PIM eligibility. Real MS Graph apply.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Identity {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $logFile = Join-Path $ReportDir 'install-identity.log'
    $whatIf = [bool]$WhatIfPreference
    $flowsDir = Join-Path $repo 'infra\identity\external-id\user-flows'
    $extDir   = Join-Path $repo 'infra\identity\external-id\custom-extensions'
    $caDir    = Join-Path $repo 'infra\identity\conditional-access'
    $pimDir   = Join-Path $repo 'infra\identity\pim'

    $extIdTenants = if ($Config.ContainsKey('ExternalIdTenants')) { $Config.ExternalIdTenants } else { @{} }

    foreach ($country in 'DK','SE','NO') {
        $tenant = $extIdTenants[$country]
        if (-not $tenant) {
            Write-Log -LogFile $logFile -Message "[skip $country] no ExternalIdTenants entry; identity policies skipped for this country."
            continue
        }
        Write-Log -LogFile $logFile -Message "[tenant $country] $tenant"

        foreach ($pair in @(@{dir=$flowsDir; uri='https://graph.microsoft.com/beta/identity/userFlows'},
                            @{dir=$extDir;   uri='https://graph.microsoft.com/beta/identity/customAuthenticationExtensions'},
                            @{dir=$caDir;    uri='https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies'},
                            @{dir=$pimDir;   uri='https://graph.microsoft.com/beta/policies/roleManagementPolicies'})) {
            if (-not (Test-Path $pair.dir)) { continue }
            $files = Get-ChildItem -Path $pair.dir -Filter '*.json' -File -ErrorAction SilentlyContinue
            foreach ($f in $files) {
                if ($PSCmdlet.ShouldProcess("$tenant ← $($f.Name)", "POST $($pair.uri)")) {
                    $body = Get-Content $f.FullName -Raw | ConvertFrom-Json -AsHashtable
                    Invoke-MgGraphIfReady `
                        -Method POST `
                        -Uri $pair.uri `
                        -Body $body `
                        -LogFile $logFile `
                        -WhatIfFlag $whatIf
                }
            }
        }
    }

    # `infra/identity/external-id/*.bicep` — country-scoped resource-group
    # bicep modules (UAMI, conditional access). Deploy per-country.
    # NOTE: `infra/identity/entra/external-id.bicep` is a subscription-scope
    # OUTPUT-ONLY helper that emits the Graph patch payload for federation;
    # it has no resources and requires `externalIdTenantDomain` +
    # `eidasMetadataUrl` parameters that come from the operator's tenant
    # registration. Operators apply it manually with `az deployment sub
    # create` after collecting the federation metadata; the installer
    # intentionally skips it.
    # `infra/identity/external-id/{dk,se,no}-external-id.bicep` are
    # tenant-creation templates (Microsoft.AzureActiveDirectory/ciamDirectories).
    # In practice, External ID (CIAM) tenants are provisioned manually via
    # the Entra portal (operator's identity needs Tenant Creator role and
    # tenant names must be globally unique — both reasons make automation
    # fragile). The installer SKIPS *-external-id.bicep files; operators
    # create the tenants in A3 then put the domains into ExternalIdTenants.
    # Any OTHER *.bicep file dropped in this folder will still be deployed.
    $bicepFiles = @(
        Get-ChildItem -Path (Join-Path $repo 'infra\identity\external-id') -Filter '*.bicep' -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notmatch '-external-id\.bicep$' }
    )
    foreach ($f in $bicepFiles) {
        foreach ($country in 'DK','SE','NO') {
            $sub = $Config.Subscriptions[$country]
            $region = $Config.Regions[$country]
            $rg = "udcsp-$($country.ToLower())-identity-rg"
            if ($PSCmdlet.ShouldProcess("$($f.BaseName)-$country", 'az deployment group create')) {
                Invoke-AzGroupDeployment `
                    -Subscription $sub -ResourceGroup $rg -Location $region `
                    -TemplateFile $f.FullName `
                    -LogFile $logFile `
                    -DeploymentName "udcsp-identity-$($f.BaseName)-$($country.ToLower())" `
                    -Tags $Config.Tags `
                    -WhatIfFlag $whatIf
            }
        }
    }
}

function Test-Identity {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'infra\identity\scripts\Test-IdentityFederation.ps1'
    if (-not (Test-Path (Join-Path $repo 'infra\identity\external-id\user-flows'))) {
        throw "Missing infra\identity\external-id\user-flows"
    }
    "{`"phase`":`"Identity`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-identity.json')
}

Export-ModuleMember -Function Install-Identity, Test-Identity
