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

foreach ($entry in $Config.Subscriptions.GetEnumerator()) {
    $sub = $entry.Value
    Write-Host "→ subscription $sub" -ForegroundColor Cyan

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

# Best-effort Purview source un-registration (the lineage edges keep working
# in the catalog even after RG deletion; this purges them so the next
# install starts clean).
if ($Config.PSObject.Properties.Name -contains 'Purview' -and $Config.Purview.AccountName) {
    if ($PSCmdlet.ShouldProcess($Config.Purview.AccountName, "Unregister Purview UDCSP sources (env=$Environment)")) {
        $sources = az purview source list `
            --account-name $Config.Purview.AccountName `
            --query "[?contains(name,'udcsp-$Environment')].name" `
            -o tsv 2>$null
        foreach ($src in ($sources -split "`n" | Where-Object { $_ })) {
            Write-Host "  ✕ purview source $src" -ForegroundColor Yellow
            az purview source delete --account-name $Config.Purview.AccountName --name $src --yes 2>$null | Out-Null
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
