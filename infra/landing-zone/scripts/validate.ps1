[CmdletBinding()]
param([ValidateSet('dev','test','prod')] [string] $Environment = 'prod')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$template = Join-Path $root 'main.bicep'
$locations = @{ dk='northeurope'; se='swedencentral'; no='norwayeast' }
foreach ($country in 'dk','se','no') {
  $params = Join-Path $root "parameters\$country.bicepparam"
  az deployment sub validate --name "udcsp-$country-$Environment-validate" --location $locations[$country] --template-file $template --parameters $params
}
