<#
.SYNOPSIS
    UDCSP — Tear-down. Removes every resource group tagged costCenter=UDCSP
    across configured subscriptions.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('dev','test','preprod','prod')]
    [string]$Environment = 'dev',
    [switch]$Force
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
        # az group list --subscription $sub --tag "costCenter=UDCSP" --tag "env=$Environment" --query "[].name" -o tsv |
        #     ForEach-Object { az group delete --subscription $sub --name $_ --yes --no-wait }
        "[scaffold] az group list --subscription $sub --tag costCenter=UDCSP env=$Environment | delete --no-wait"
    }
}

Write-Host "Tear-down submitted." -ForegroundColor Green
