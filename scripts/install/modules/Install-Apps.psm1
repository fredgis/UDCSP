<#
.SYNOPSIS
    Install-Apps (A9, A12) — Static Web App deployment, mobile builds,
    i18n catalogue verification.
#>
function Install-Apps {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    if ($PSCmdlet.ShouldProcess('Web citizen portal', 'npm build + SWA deploy')) {
        "[scaffold] cd $repo\apps\web; npm install; npm run build" |
            Add-Content (Join-Path $ReportDir 'install-apps.log')
        "[scaffold] swa deploy ./dist --env production" |
            Add-Content (Join-Path $ReportDir 'install-apps.log')
    }
    if ($PSCmdlet.ShouldProcess('Mobile shell', 'eas build')) {
        "[scaffold] cd $repo\apps\mobile; eas build --profile production" |
            Add-Content (Join-Path $ReportDir 'install-apps.log')
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
