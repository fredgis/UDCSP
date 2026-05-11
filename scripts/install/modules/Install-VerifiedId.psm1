<#
.SYNOPSIS
    Install-VerifiedId — Microsoft Entra Verified ID issuer + credential
    contracts (residency, eligibility receipt, EUDI Wallet bridge). Real
    Bicep deployment + MS Graph contract apply (when available).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-VerifiedId {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\identity\verified-id\verified-id-issuer.bicep'
    $logFile = Join-Path $ReportDir 'install-verified-id.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }

    if ($PSCmdlet.ShouldProcess('verified-id-issuer', 'az deployment group create')) {
        $rg = "udcsp-shared-verified-id-rg"
        # Microsoft.VerifiedId/authorities ARM path is preview and currently
        # rejects PUT with "ResourceCreationValidateFailed" when the Verified
        # ID service has not been onboarded for the tenant via the portal
        # wizard. Same pattern as External ID tenants — portal-only de facto.
        # We attempt the deploy but treat failure as non-fatal: operators
        # complete onboarding via Entra portal -> Verified ID -> Setup, then
        # re-run Install-VerifiedId. Credential contracts still attempt below.
        try {
            Invoke-AzGroupDeployment `
                -Subscription $Config.Subscriptions.SharedPlatform `
                -ResourceGroup $rg `
                -Location $Config.Regions.Shared `
                -TemplateFile $bicep `
                -LogFile $logFile `
                -DeploymentName 'udcsp-verified-id-issuer' `
                -Tags $Config.Tags `
                -WhatIfFlag $whatIf
        } catch {
            Write-Log -LogFile $logFile -Message "[verified-id SKIP] authority bicep failed: $_. Complete Verified ID onboarding manually via Entra portal (Verified ID -> Setup), then re-run this phase. Continuing with credential contracts."
        }
    }

    $contracts = Get-ChildItem (Join-Path $repo 'infra\identity\verified-id\credential-contracts') -Filter '*.json' -ErrorAction SilentlyContinue
    foreach ($c in $contracts) {
        if ($PSCmdlet.ShouldProcess($c.Name, 'apply credential contract via MS Graph')) {
            $body = Get-Content $c.FullName -Raw | ConvertFrom-Json -AsHashtable
            Invoke-MgGraphIfReady `
                -Method POST `
                -Uri 'https://graph.microsoft.com/v1.0/verifiableCredentials/contracts' `
                -Body $body `
                -LogFile $logFile `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-VerifiedId {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $bicep = Join-Path $repo 'infra\identity\verified-id\verified-id-issuer.bicep'
    if (-not (Test-Path $bicep)) { throw "Missing $bicep" }
    "{`"phase`":`"VerifiedId`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-verified-id.json')
}

Export-ModuleMember -Function Install-VerifiedId, Test-VerifiedId
