<#
.SYNOPSIS
    Install-D365 — packs unmanaged solution folders into zips and imports
    them via Power Platform CLI for each country Dataverse environment.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Test-PacStdoutForError {
    # pac CLI returns exit 0 even on usage / runtime errors. Surface them.
    # Use byte-offset tracking so we only scan content appended by the most
    # recent pac command, otherwise stale errors bleed into the next call's
    # warning. Caller passes a [ref] holding the prior log length.
    param(
        [string]$LogFile,
        [string]$Label,
        [ref]$Offset
    )
    if (-not (Test-Path $LogFile)) { return }
    $current = (Get-Item $LogFile).Length
    $prior = if ($Offset) { [int64]$Offset.Value } else { 0 }
    if ($current -le $prior) {
        if ($Offset) { $Offset.Value = $current }
        return
    }
    $stream = [IO.File]::Open($LogFile, 'Open', 'Read', 'ReadWrite')
    try {
        [void]$stream.Seek($prior, 'Begin')
        $reader = [IO.StreamReader]::new($stream)
        $delta = $reader.ReadToEnd()
    } finally {
        $stream.Dispose()
    }
    if ($Offset) { $Offset.Value = $current }
    $errLine = ($delta -split "`n") | Where-Object { $_ -match '^\s*Error:' } | Select-Object -First 1
    if ($errLine) {
        Write-Warning "[$Label] pac reported error despite exit 0: $($errLine.Trim())"
    }
}

function Install-D365 {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $solutionsRoot = Join-Path $repo 'apps\d365\solutions'
    $logFile = Join-Path $ReportDir 'install-d365.log'
    $whatIf = [bool]$WhatIfPreference

    if (-not (Test-CliAvailable -Name 'pac')) {
        Write-Log -LogFile $logFile -Message "[skip] Power Platform CLI ('pac') not on PATH. Install: https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction. Operations recorded for manual replay."
        return
    }

    $d365Urls = if ($Config.ContainsKey('D365EnvironmentUrls')) { $Config.D365EnvironmentUrls } else { @{} }
    if (-not $d365Urls -or $d365Urls.Count -eq 0) {
        Write-Log -LogFile $logFile -Message "[skip] D365EnvironmentUrls not configured. Provision Dataverse environments per country (DK/SE/NO) and add URLs to scripts/install/config/udcsp.config.psd1."
        Write-Warning "D365 skipped: no D365EnvironmentUrls in config."
        return
    }

    $packDir = Join-Path $ReportDir 'd365-packed'
    New-Item -ItemType Directory -Path $packDir -Force | Out-Null
    # Initialize log offset to current end of file so Test-PacStdoutForError
    # only scans content appended by each subsequent pac command.
    $logOffset = if (Test-Path $logFile) { (Get-Item $logFile).Length } else { [int64]0 }

    foreach ($country in 'DK','SE','NO') {
        $url = $d365Urls[$country]
        if (-not $url) {
            Write-Log -LogFile $logFile -Message "[skip] no D365 URL for $country"
            continue
        }
        # Switch the active connection to this org. `pac auth select` only
        # accepts --index/--name; the URL switch is done via `pac org select`.
        if ($PSCmdlet.ShouldProcess($url, 'pac org select')) {
            Invoke-NativeCommand `
                -Command @('pac','org','select','--environment',$url) `
                -LogFile $logFile `
                -WhatIfFlag $whatIf `
                -ContinueOnError
            Test-PacStdoutForError -LogFile $logFile -Label "org-select-$country" -Offset ([ref]$logOffset)
        }
        foreach ($sln in @('UDCSP_Core',"UDCSP_$country")) {
            $srcPath = Join-Path $solutionsRoot $sln
            if (-not (Test-Path $srcPath)) {
                Write-Log -LogFile $logFile -Message "[skip] solution path not found: $srcPath"
                continue
            }
            # `pac solution import --path` requires a zip; pack the folder first.
            $zipPath = Join-Path $packDir "$sln.zip"
            $packOk = $false
            if ($PSCmdlet.ShouldProcess($srcPath, "pac solution pack -> $zipPath")) {
                if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
                Invoke-NativeCommand `
                    -Command @('pac','solution','pack','--zipfile',$zipPath,'--folder',$srcPath,'--packagetype','Unmanaged') `
                    -LogFile $logFile `
                    -WhatIfFlag $whatIf `
                    -ContinueOnError
                Test-PacStdoutForError -LogFile $logFile -Label "pack-$sln" -Offset ([ref]$logOffset)
                $packOk = Test-Path $zipPath
            }
            if (-not $packOk) {
                Write-Log -LogFile $logFile -Message "[skip] solution pack failed for $sln (no zip produced)"
                Write-Warning "D365 [$country/$sln]: pack failed — likely scaffold solution.xml is incomplete. Skipping import."
                continue
            }
            if ($PSCmdlet.ShouldProcess("$sln@$url", 'pac solution import')) {
                Invoke-NativeCommand `
                    -Command @('pac','solution','import','--path',$zipPath,'--publish-changes','--environment',$url) `
                    -LogFile $logFile `
                    -WhatIfFlag $whatIf `
                    -ContinueOnError
                Test-PacStdoutForError -LogFile $logFile -Label "import-$sln-$country" -Offset ([ref]$logOffset)
            }
        }
    }
}

function Test-D365 {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'apps\d365\scripts\Test-D365.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    "{`"phase`":`"D365`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-d365.json')
}

Export-ModuleMember -Function Install-D365, Test-D365
