[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('dk','se','no')][string]$Country,
  [Parameter(Mandatory)][string]$ResourceGroup,
  [Parameter(Mandatory)][string]$Location
)
Write-Host "Placeholder deployment for $Country in $Location. Supply real subscriptions, ACS procurement approvals, and Key Vault references in CI."
Write-Host "az deployment group create --resource-group $ResourceGroup --template-file ..\acs\acs-resource.bicep --parameters country=$Country location=$Location"
