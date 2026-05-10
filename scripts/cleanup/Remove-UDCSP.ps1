<#
.SYNOPSIS
    UDCSP — Tear-down. Removes every resource group tagged costCenter=UDCSP
    across configured subscriptions.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('dev','test','preprod','prod')]
    [string]$Environment = 'dev',
    [switch]$Force,
    [switch]$NoWait
)
$ErrorActionPreference = 'Stop'

if ($Environment -eq 'prod' -and -not $Force) {
    Write-Warning "Refusing to tear down prod without -Force."
    return
}

$ConfigPath = Join-Path $PSScriptRoot '..\install\config\udcsp.config.psd1'
if (-not (Test-Path $ConfigPath)) { throw "Config missing: $ConfigPath" }
$Config = Import-PowerShellDataFile -Path $ConfigPath

$PolicyInitiativeName  = 'udcsp-security-compliance-baseline'
$DefenderPlans         = @('VirtualMachines','StorageAccounts','KeyVaults','Containers','AppServices','Api')

foreach ($entry in $Config.Subscriptions.GetEnumerator()) {
    $sub = $entry.Value
    $scopeKey = $entry.Key.ToLower()
    $assignmentName = "udcsp-baseline-$scopeKey"
    Write-Host "→ subscription $sub" -ForegroundColor Cyan

    # Best-effort Azure Policy cleanup. Subscription-scope assignments + the
    # initiative set-definition created by Install-Security must be removed
    # before/alongside resource groups so they don't survive teardown.
    if ($PSCmdlet.ShouldProcess($sub, "Delete policy assignment $assignmentName + initiative $PolicyInitiativeName")) {
        az policy assignment delete --subscription $sub --name $assignmentName --scope "/subscriptions/$sub" 2>$null | Out-Null
        az policy set-definition delete --subscription $sub --name $PolicyInitiativeName 2>$null | Out-Null
    }

    # Best-effort Defender for Cloud pricing reset. Install-Security raises
    # each plan in $DefenderPlans to Standard at subscription scope; on
    # teardown we lower them back to Free so the cost stops with the RGs.
    if ($PSCmdlet.ShouldProcess($sub, "Reset Defender for Cloud plans to Free")) {
        foreach ($plan in $DefenderPlans) {
            az security pricing create --subscription $sub --name $plan --tier Free 2>$null | Out-Null
        }
    }

    if ($PSCmdlet.ShouldProcess($sub, "List & delete RGs tagged costCenter=UDCSP env=$Environment")) {
        $rgs = az group list `
            --subscription $sub `
            --tag "costCenter=UDCSP" `
            --query "[?tags.env=='$Environment'].name" `
            -o tsv 2>$null

        if (-not $rgs) {
            Write-Host "  (no resource groups matched)" -ForegroundColor DarkGray
            continue
        }

        foreach ($rg in ($rgs -split "`n" | Where-Object { $_ })) {
            Write-Host "  ✕ $rg" -ForegroundColor Yellow
            $deleteArgs = @('group','delete','--subscription',$sub,'--name',$rg,'--yes')
            if ($NoWait) { $deleteArgs += '--no-wait' }
            az @deleteArgs | Out-Null
        }
    }
}

# Best-effort Purview source un-registration. Enumerates the Atlas entity
# JSON files in governance/purview/data-sources/ (the same source of truth
# as Register-PurviewSources.ps1) and removes each by name. Sources that
# weren't registered (e.g. fresh tenant) silently skip.
if ($Config.ContainsKey('PurviewAccount') -and $Config.PurviewAccount.Name) {
    if ($PSCmdlet.ShouldProcess($Config.PurviewAccount.Name, "Unregister Purview UDCSP sources (env=$Environment)")) {
        $sourceFiles = Get-ChildItem -Path (Join-Path $PSScriptRoot '..\..\governance\purview\data-sources\*.json') -ErrorAction SilentlyContinue
        foreach ($sf in $sourceFiles) {
            try { $sourceName = ((Get-Content $sf.FullName -Raw | ConvertFrom-Json).entity.attributes.name) } catch { continue }
            if (-not $sourceName) { continue }
            Write-Host "  ✕ purview source $sourceName" -ForegroundColor Yellow
            az purview source delete --account-name $Config.PurviewAccount.Name --name $sourceName --yes 2>$null | Out-Null
        }
    }
}

# Best-effort Entra app cleanup. Apps registered by Install-Identity are
# tagged `udcsp-env-<env>`; we soft-revoke them. Hard delete is left to the
# operator to avoid wiping a cross-env app by accident.
if ($PSCmdlet.ShouldProcess("Entra apps tagged udcsp-env-$Environment", 'Disable sign-in')) {
    $apps = az ad app list --filter "tags/any(t: t eq 'udcsp-env-$Environment')" --query "[].appId" -o tsv 2>$null
    foreach ($appId in ($apps -split "`n" | Where-Object { $_ })) {
        Write-Host "  ⏸ entra app $appId (sign-in disabled, not deleted)" -ForegroundColor Yellow
        az ad app update --id $appId --set signInAudience=AzureADMyOrg disabledByMicrosoftStatus=true 2>$null | Out-Null
    }
}

Write-Host "Tear-down submitted." -ForegroundColor Green
