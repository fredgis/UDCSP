param([Parameter(Mandatory)] [string]$Country,[Parameter(Mandatory)] [string]$Environment,[Parameter(Mandatory)] [string]$ResourceGroupName,[Parameter(Mandatory)] [string]$PublisherEmail,[string]$PublisherName='UDCSP Platform')
$ErrorActionPreference = 'Stop'
az deployment group create --resource-group $ResourceGroupName --template-file (Join-Path $PSScriptRoot '..pim.bicep') --parameters country=$Country env=$Environment publisherEmail=$PublisherEmail publisherName=$PublisherName
Write-Host 'Import OpenAPI specs, policies, products, and Key Vault named-values via APIM pipeline after APIM exists.'
