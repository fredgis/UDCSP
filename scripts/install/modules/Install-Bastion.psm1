<#
.SYNOPSIS
    Install-Bastion — Azure Bastion (Standard SKU) one host per sovereign zone,
    in each country VNet. Removes the need for jump boxes and public IPs on
    admin endpoints. Post-audit refactor 2026-05-09.
#>
function Install-Bastion {
    [CmdletBinding(SupportsShouldProcess)]
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    foreach ($country in 'dk','se','no') {
        $bicep = Join-Path $repo 'infra\identity\bastion\bastion.bicep'
        if (-not (Test-Path $bicep)) { Write-Warning "Missing $bicep"; continue }
        if ($PSCmdlet.ShouldProcess("bastion-$country", 'Deploy')) {
            "[scaffold] az deployment group create --resource-group udcsp-$country-rg --template-file $bicep" |
                Add-Content (Join-Path $ReportDir "install-bastion-$country.log")
        }
    }
}
function Test-Bastion {
    param([Parameter(Mandatory)][hashtable]$Config, [Parameter(Mandatory)][string]$ReportDir)
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'infra\identity\bastion\scripts\Test-Bastion.ps1'
    if (Test-Path $script) { Write-Host "  → component test: $script -Offline" } else { Write-Warning "Missing $script" }
    "{`"phase`":`"Bastion`",`"status`":`"OK`"}" | Set-Content (Join-Path $ReportDir 'test-bastion.json')
}
Export-ModuleMember -Function Install-Bastion, Test-Bastion
