[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$PurviewAccountName,
  [string]$PurviewEndpoint = "https://$PurviewAccountName.purview.azure.com",
  [string]$Token = $env:PURVIEW_TOKEN
)
if (-not $PurviewAccountName) { throw 'PurviewAccountName is required.' }
function Invoke-PurviewAtlas { param([string]$Method,[string]$Path,[object]$Body)
  if (-not $Token) { Write-Warning 'TODO: case-study scaffold - set PURVIEW_TOKEN or use managed identity before tenant registration.'; return }
  Invoke-RestMethod -Method $Method -Uri "$PurviewEndpoint$Path" -Headers @{Authorization="Bearer $Token";'Content-Type'='application/json'} -Body ($Body | ConvertTo-Json -Depth 30)
}
Get-ChildItem (Join-Path $PSScriptRoot '..\data-sources\*.json') | ForEach-Object {
  $body = Get-Content $_.FullName -Raw | ConvertFrom-Json
  if ($PSCmdlet.ShouldProcess($_.BaseName, 'Register Purview source')) { Invoke-PurviewAtlas POST '/catalog/api/atlas/v2/entity' $body }
}
