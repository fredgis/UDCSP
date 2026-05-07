[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$Environment = 'dev',
  [string]$WorkspaceConfig = '..\workspaces\workspace-config.json',
  [string]$FabricBaseUrl = 'https://api.fabric.microsoft.com/v1',
  [string]$FabricToken = $env:FABRIC_TOKEN
)
function Invoke-FabricRest { param([string]$Method,[string]$Path,[object]$Body)
  if (-not $FabricToken) { Write-Warning 'TODO: case-study scaffold - set FABRIC_TOKEN for tenant deployment.'; return $null }
  $headers = @{ Authorization = "Bearer $FabricToken"; 'Content-Type' = 'application/json' }
  Invoke-RestMethod -Method $Method -Uri "$FabricBaseUrl$Path" -Headers $headers -Body ($Body | ConvertTo-Json -Depth 20)
}
function Get-FabricCapacity { param([string]$DisplayName) Invoke-FabricRest GET "/capacities?displayName=$DisplayName" $null }
function New-FabricWorkspace { param([object]$Workspace) Invoke-FabricRest POST '/workspaces' @{ displayName=$Workspace.name; description="UDCSP $($Workspace.country) data workspace" } }
function Import-FabricLakehouse { param([string]$WorkspaceId,[string]$DefinitionPath) Invoke-FabricRest POST "/workspaces/$WorkspaceId/items" @{ type='Lakehouse'; definitionPath=$DefinitionPath } }
function Import-Notebook { param([string]$WorkspaceId,[string]$NotebookPath) Invoke-FabricRest POST "/workspaces/$WorkspaceId/items" @{ type='Notebook'; path=$NotebookPath } }

$config = Get-Content $WorkspaceConfig -Raw | ConvertFrom-Json
foreach ($workspace in $config.workspaces) {
  Write-Host "Ensuring Fabric workspace $($workspace.name) in domain $($workspace.domain)"
  if ($PSCmdlet.ShouldProcess($workspace.name, 'Create/import Fabric workspace artefacts')) { New-FabricWorkspace -Workspace $workspace | Out-Null }
}
