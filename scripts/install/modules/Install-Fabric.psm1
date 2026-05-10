<#
.SYNOPSIS
    Install-Fabric — Capacities, workspaces, lakehouses, notebooks,
    semantic models, pipelines. Calls data/fabric/scripts/Deploy-Fabric.ps1
    per country (REST against the Fabric control plane API).
#>
Import-Module (Join-Path $PSScriptRoot '..\lib\InstallHelpers.psm1') -Force -DisableNameChecking

function Install-Fabric {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'data\fabric\scripts\Deploy-Fabric.ps1'
    $logFile = Join-Path $ReportDir 'install-fabric.log'
    $whatIf = [bool]$WhatIfPreference
    if (-not (Test-Path $script)) { throw "Missing $script" }
    $envName = if ($Config.ContainsKey('Environment')) { $Config.Environment } else { 'prod' }

    foreach ($country in 'DK','SE','NO') {
        if ($PSCmdlet.ShouldProcess("$country Fabric", 'Deploy-Fabric.ps1')) {
            Invoke-NativeCommand `
                -Command @('pwsh','-File',$script,'-Environment',$envName) `
                -LogFile $logFile `
                -WhatIfFlag $whatIf `
                -ContinueOnError
        }
    }
}

function Test-Fabric {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'data\fabric\scripts\Test-Fabric.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }
    $offline = ($env:UDCSP_TESTONLY -eq '1') -or ($env:UDCSP_SMOKEONLY -eq '1') -or (-not ($Config.ContainsKey('Fabric') -and $Config.Fabric.WorkspaceIds))
    $results = @()
    foreach ($country in 'DK','SE','NO') {
        $countryLower = $country.ToLower()
        try {
            if ($offline) {
                & $script -Country $countryLower -Offline | Out-Null
            } else {
                $wsId = $Config.Fabric.WorkspaceIds[$country]
                & $script -Country $countryLower -WorkspaceId $wsId -FabricToken $Config.Fabric.Token | Out-Null
            }
            $results += @{ country = $countryLower; status = 'OK' }
        } catch {
            $results += @{ country = $countryLower; status = 'FAIL'; error = $_.Exception.Message }
        }
    }
    $payload = @{ phase = 'Fabric'; mode = ($(if ($offline) { 'offline' } else { 'live' })); results = $results }
    $payload | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $ReportDir 'test-fabric.json')
    $failed = ($results | Where-Object { $_.status -eq 'FAIL' }).Count
    if ($failed -gt 0) {
        throw "Test-Fabric: $failed of 3 countries failed gold-schema validation. See $ReportDir\test-fabric.json."
    }
}

Export-ModuleMember -Function Install-Fabric, Test-Fabric
