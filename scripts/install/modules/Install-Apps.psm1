<#
.SYNOPSIS
    Install-Apps — Citizen web portal (Static Web App) + mobile shell
    (EAS build) + i18n catalogue verification. Real npm build + swa
    deploy + eas build (when CLIs are available).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Apps {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $logFile = Join-Path $ReportDir 'install-apps.log'
    $whatIf = [bool]$WhatIfPreference
    $webDir = Join-Path $repo 'apps\web'
    $mobDir = Join-Path $repo 'apps\mobile'
    $envName = if ($Config.ContainsKey('Environment')) { $Config.Environment } else { 'prod' }

    if (-not (Test-CliAvailable -Name 'npm')) {
        Write-Log -LogFile $logFile -Message "[skip] npm not on PATH. Install Node.js LTS. Operations recorded for manual replay."
    }

    # Web portal — npm install + npm run build + swa deploy
    if (Test-Path (Join-Path $webDir 'package.json')) {
        Push-Location $webDir
        try {
            if ($PSCmdlet.ShouldProcess('apps/web', 'npm install')) {
                Invoke-NativeCommand -Command @('npm','install','--no-audit','--no-fund') -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
            }
            if ($PSCmdlet.ShouldProcess('apps/web', 'npm run build')) {
                Invoke-NativeCommand -Command @('npm','run','build') -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
            }
            if ((Test-CliAvailable -Name 'swa') -and $PSCmdlet.ShouldProcess('apps/web', 'swa deploy')) {
                $swaSub  = $Config.Subscriptions.SharedPlatform
                $swaRg   = 'udcsp-shared-apps-rg'
                $swaName = "udcsp-web-$envName"
                # SWA Free SKU is only allowed in: centralus, eastus2, westus2, westeurope, eastasia.
                # We hardcode westeurope (closest to EU residency story; SWA is global edge anyway).
                $swaLoc  = 'westeurope'
                # Ensure subscription, RG, and SWA exist before deploy.
                Invoke-NativeCommand -Command @('az','account','set','--subscription',$swaSub) -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
                # Idempotent RG creation: skip if RG exists in any location to avoid 'InvalidResourceGroupLocation'.
                $rgExists = (& az group exists --name $swaRg 2>$null) -eq 'true'
                if (-not $rgExists) {
                    Invoke-NativeCommand -Command @('az','group','create','--name',$swaRg,'--location',$swaLoc,'--only-show-errors','--output','none') -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
                } else {
                    Write-Log -LogFile $logFile -Message "[skip] resource group $swaRg already exists, reusing."
                }
                Invoke-NativeCommand -Command @('az','staticwebapp','create','--name',$swaName,'--resource-group',$swaRg,'--location',$swaLoc,'--sku','Free','--only-show-errors','--output','none') -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
                $deployTokenRaw = & az staticwebapp secrets list --name $swaName --resource-group $swaRg --query 'properties.apiKey' -o tsv 2>$null
                $deployToken = if ($deployTokenRaw) { ([string]$deployTokenRaw).Trim() } else { '' }
                if ([string]::IsNullOrWhiteSpace($deployToken)) {
                    Write-Log -LogFile $logFile -Message "[warn] Could not fetch SWA deployment token for $swaName/$swaRg — skipping swa deploy. Run 'az staticwebapp secrets list --name $swaName --resource-group $swaRg' manually then re-run."
                } else {
                    Invoke-NativeCommand -Command @('swa','deploy','./dist','--env','production','--deployment-token',$deployToken,'--no-use-keychain') -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
                }
            } else {
                Write-Log -LogFile $logFile -Message "[skip] swa CLI not on PATH. Install: npm install -g @azure/static-web-apps-cli."
            }
        } finally { Pop-Location }
    }

    # Mobile shell — eas build per platform
    if (Test-Path (Join-Path $mobDir 'package.json')) {
        Push-Location $mobDir
        try {
            if ($PSCmdlet.ShouldProcess('apps/mobile', 'npm install')) {
                Invoke-NativeCommand -Command @('npm','install','--no-audit','--no-fund','--legacy-peer-deps') -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
            }
            if ((Test-CliAvailable -Name 'eas') -and $PSCmdlet.ShouldProcess('apps/mobile', 'eas build')) {
                Invoke-NativeCommand -Command @('eas','build','--profile','production','--non-interactive') -LogFile $logFile -WhatIfFlag $whatIf -ContinueOnError
            } else {
                Write-Log -LogFile $logFile -Message "[skip] eas CLI not on PATH. Install: npm install -g eas-cli."
            }
        } finally { Pop-Location }
    }

    # i18n catalogue verification (still meaningful even if builds were skipped)
    $i18nDir = Join-Path $webDir 'i18n\messages'
    if (Test-Path $i18nDir) {
        $found = (Get-ChildItem $i18nDir -Filter '*.json').BaseName | Sort-Object
        $missing = $Config.Languages | Where-Object { $_ -notin $found }
        if ($missing) { Write-Log -LogFile $logFile -Message "[warn] missing i18n catalogues: $($missing -join ', ')" }
    }
}

function Test-Apps {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $i18nDir = Join-Path $repo 'apps\web\i18n\messages'
    if (-not (Test-Path $i18nDir)) { throw "i18n messages folder missing" }
    $found = (Get-ChildItem $i18nDir -Filter '*.json').BaseName | Sort-Object
    $missing = $Config.Languages | Where-Object { $_ -notin $found }
    if ($missing) { throw "Missing i18n catalogues: $($missing -join ', ')" }
    "{`"phase`":`"Apps`",`"languages`":$($found.Count)}" | Set-Content (Join-Path $ReportDir 'test-apps.json')
}

Export-ModuleMember -Function Install-Apps, Test-Apps
