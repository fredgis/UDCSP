param([Parameter(Mandatory)] [string]$Country,[Parameter(Mandatory)] [string]$Environment,[Parameter(Mandatory)] [string]$ResourceGroupName,[Parameter(Mandatory)] [string]$AppInsightsConnectionString)
$ErrorActionPreference = 'Stop'
az deployment group create --resource-group $ResourceGroupName --template-file (Join-Path $PSScriptRoot '..\workspace.bicep') --parameters country=$Country env=$Environment appInsightsConnectionString=$AppInsightsConnectionString
az deployment group create --resource-group $ResourceGroupName --template-file (Join-Path $PSScriptRoot '..\servicebus\servicebus.bicep') --parameters country=$Country env=$Environment
Write-Host 'Deploy workflow folders through the platform CI after app settings and connections are supplied.'
