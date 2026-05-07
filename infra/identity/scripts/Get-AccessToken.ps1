[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $TenantId,
  [Parameter(Mandatory)] [string] $ClientId,
  [Parameter(Mandatory)] [string] $Scope
)
$ErrorActionPreference = 'Stop'
# Device-code test helper only; no client secrets in repository.
az account get-access-token --tenant $TenantId --client-id $ClientId --scope $Scope | ConvertFrom-Json
