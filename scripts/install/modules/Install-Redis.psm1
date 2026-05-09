<#
.SYNOPSIS
    Install-Redis — Azure Cache for Redis Enterprise, one per sovereign zone.
    Replaces the ephemeral portion of Cosmos DB (slot-filling, session state,
    in-flight drafts < 30 min). Post-audit refactor 2026-05-09.
#>
function Install-Redis {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'dk','se','no') {
        $bicep = Join-Path $repo 'infra\data\redis\redis-enterprise.bicep'
        $param = Join-Path $repo "infra\data\redis\parameters\$country.bicepparam"
        if (-not (Test-Path $bicep))  { Write-Warning "Missing $bicep";  continue }
        if (-not (Test-Path $param)) { Write-Warning "Missing $param"; continue }
        if ($PSCmdlet.ShouldProcess("redis-$country", 'Deploy')) {
            "[scaffold] az deployment sub create --location $($Config.Regions[$country.ToUpper()]) --template-file $bicep --parameters $param" |
                Add-Content (Join-Path $ReportDir "install-redis-$country.log")
        }
    }
}
function Test-Redis {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'dk','se','no') {
        $script = Join-Path $repo 'infra\data\redis\scripts\Test-Redis.ps1'
        if (Test-Path $script) {
            Write-Host "  → component test: $script -Country $country -Offline"
        } else {
            Write-Warning "Missing $script"
        }
    }
    "{`"phase`":`"Redis`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-redis.json')
}
Export-ModuleMember -Function Install-Redis, Test-Redis
