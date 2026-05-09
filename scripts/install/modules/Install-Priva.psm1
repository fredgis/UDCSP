<#
.SYNOPSIS
    Install-Priva — Microsoft Priva Privacy Management for GDPR Subject
    Rights Requests + risk policies, applied via MS Graph beta endpoints.
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Priva {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $logFile = Join-Path $ReportDir 'install-priva.log'
    $whatIf = [bool]$WhatIfPreference

    $cfg = Join-Path $repo 'governance\priva\priva-config.yaml'
    if (Test-Path $cfg) {
        Write-Log -LogFile $logFile -Message "[config] $cfg"
    }

    $policies = Get-ChildItem (Join-Path $repo 'governance\priva\priva-policies') -Filter '*.json' -ErrorAction SilentlyContinue
    foreach ($p in $policies) {
        if ($PSCmdlet.ShouldProcess($p.Name, 'apply Priva policy via MS Graph')) {
            $body = Get-Content $p.FullName -Raw | ConvertFrom-Json -AsHashtable
            Invoke-MgGraphIfReady `
                -Method POST `
                -Uri 'https://graph.microsoft.com/beta/privacy/subjectRightsRequests/policies' `
                -Body $body `
                -LogFile $logFile `
                -WhatIfFlag $whatIf
        }
    }
}

function Test-Priva {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $cfg = Join-Path $repo 'governance\priva\priva-config.yaml'
    if (-not (Test-Path $cfg)) { throw "Missing $cfg" }
    "{`"phase`":`"Priva`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-priva.json')
}

Export-ModuleMember -Function Install-Priva, Test-Priva
