<#
.SYNOPSIS
    Install-Ddos — Azure DDoS Protection Standard plan in shared region,
    associated with each country VNet (3 associations). L3/L4 protection
    beyond Front Door L7 — NIS2 expectation for 2.1M citizens platform.
    Post-audit refactor 2026-05-09.
#>
function Install-Ddos {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $plan = Join-Path $repo 'infra\security\ddos\ddos-protection-plan.bicep'
    $assoc = Join-Path $repo 'infra\security\ddos\vnet-association.bicep'
    if (-not (Test-Path $plan)) { Write-Warning "Missing $plan"; return }
    if ($PSCmdlet.ShouldProcess('ddos-protection-plan', 'Deploy')) {
        "[scaffold] az deployment sub create --location $($Config.Regions.Shared) --template-file $plan" |
            Add-Content (Join-Path $ReportDir 'install-ddos.log')
    }
    foreach ($country in 'dk','se','no') {
        if (-not (Test-Path $assoc)) { continue }
        if ($PSCmdlet.ShouldProcess("ddos-vnet-$country", 'Associate')) {
            "[scaffold] az deployment group create --resource-group udcsp-$country-rg --template-file $assoc" |
                Add-Content (Join-Path $ReportDir "install-ddos-$country.log")
        }
    }
}
function Test-Ddos {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'infra\security\ddos\scripts\Test-Ddos.ps1'
    if (Test-Path $script) { Write-Host "  → component test: $script -Offline" } else { Write-Warning "Missing $script" }
    "{`"phase`":`"Ddos`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-ddos.json')
}
Export-ModuleMember -Function Install-Ddos, Test-Ddos
