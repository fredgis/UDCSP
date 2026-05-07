[CmdletBinding()]
param(
  [ValidateSet('dk','se','no')] [string] $Country,
  [ValidateSet('dev','test','prod')] [string] $Environment = 'prod',
  [string] $Location
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$params = Join-Path $root "parameters\$Country.bicepparam"
$template = Join-Path $root 'main.bicep'
if (-not $Location) { $Location = @{ dk='northeurope'; se='swedencentral'; no='norwayeast' }[$Country] }
az deployment sub what-if --name "udcsp-$Country-$Environment-whatif" --location $Location --template-file $template --parameters $params
$confirm = Read-Host "Deploy UDCSP $Country $Environment landing zone? Type YES"
if ($confirm -ne 'YES') { Write-Host 'Deployment cancelled.'; exit 0 }
az deployment sub create --name "udcsp-$Country-$Environment" --location $Location --template-file $template --parameters $params
