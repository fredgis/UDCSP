<#
.SYNOPSIS
    Import-FoundryAgent — generic YAML→Foundry agent importer.

.DESCRIPTION
    Reads an agent.yaml + its referenced system-prompt.md, then upserts the
    agent (assistant) in the target Foundry project via the Assistants v1
    REST API. Idempotent: looks up the assistant by name, updates if found,
    creates otherwise.

    Tools listed in agent.yaml are registered as `function`-typed
    placeholders. Real tool wiring (APIM, Logic Apps, knowledge sources)
    is performed by other phases of the installer.

.PARAMETER AgentDir
    Path to the agent folder containing agent.yaml + system-prompt.md.

.PARAMETER Subscription
    Subscription GUID hosting the Foundry account.

.PARAMETER ResourceGroup
    Resource group of the Foundry (AI Services) account.

.PARAMETER AccountName
    Name of the AI Services account hosting the project (e.g. udcsp-foundry).

.PARAMETER ProjectName
    Foundry project name. If omitted, the first project under the account
    is used.

.EXAMPLE
    pwsh foundry/scripts/Import-FoundryAgent.ps1 `
        -AgentDir foundry/agents/classifier `
        -Subscription <guid> `
        -ResourceGroup udcsp-shared-foundry `
        -AccountName udcsp-foundry
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$AgentDir,
    [Parameter(Mandatory)][string]$Subscription,
    [Parameter(Mandatory)][string]$ResourceGroup,
    [Parameter(Mandatory)][string]$AccountName,
    [string]$ProjectName
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Module -ListAvailable powershell-yaml)) {
    Install-Module powershell-yaml -Scope CurrentUser -Force -AllowClobber | Out-Null
}
Import-Module powershell-yaml -Force

$agentDirAbs = (Resolve-Path $AgentDir).Path
$yamlPath = Join-Path $agentDirAbs 'agent.yaml'
if (-not (Test-Path $yamlPath)) { throw "agent.yaml not found in $agentDirAbs" }
$agent = Get-Content $yamlPath -Raw | ConvertFrom-Yaml
if (-not $agent.name) { throw "agent.yaml in $agentDirAbs has no 'name' field" }
if (-not $agent.model) { throw "agent.yaml in $agentDirAbs has no 'model' field" }

$promptFile = $agent.systemPromptFile
if (-not $promptFile) { throw "agent.yaml in $agentDirAbs has no 'systemPromptFile' field" }
$promptPath = Join-Path $agentDirAbs $promptFile
if (-not (Test-Path $promptPath)) { throw "System prompt file not found: $promptPath" }
$instructions = Get-Content $promptPath -Raw

# --- Resolve account endpoint --------------------------------------------------
$account = az cognitiveservices account show `
    --subscription $Subscription -g $ResourceGroup -n $AccountName -o json 2>$null | ConvertFrom-Json
if (-not $account) { throw "AI Services account '$AccountName' not found in $ResourceGroup ($Subscription)" }
$accountEndpoint = $null
if ($account.properties.endpoints.PSObject.Properties['AI Foundry API']) {
    $accountEndpoint = $account.properties.endpoints.'AI Foundry API'
}
if (-not $accountEndpoint) {
    $accountEndpoint = "https://$AccountName.services.ai.azure.com/"
}
$accountEndpoint = $accountEndpoint.TrimEnd('/')

# --- Resolve project name ------------------------------------------------------
if (-not $ProjectName) {
    $projectsRaw = az resource list `
        --subscription $Subscription -g $ResourceGroup `
        --resource-type 'Microsoft.CognitiveServices/accounts/projects' `
        --query "[?starts_with(name, '$AccountName/')].name" -o json 2>$null
    $projects = @($projectsRaw | ConvertFrom-Json)
    if (-not $projects -or $projects.Count -eq 0) {
        throw "No projects found under account '$AccountName' in $ResourceGroup. Create one in Foundry first."
    }
    $first = [string]$projects[0]
    $ProjectName = ($first -split '/')[-1]
}
Write-Host "  ↳ Foundry project: $ProjectName" -ForegroundColor DarkGray

$projectBase = "$accountEndpoint/api/projects/$ProjectName"
$apiVersion = '2025-05-15-preview'

# --- Acquire token -------------------------------------------------------------
$token = az account get-access-token --resource 'https://ai.azure.com' --query accessToken -o tsv
if (-not $token) { throw "Failed to acquire AAD token for https://ai.azure.com" }
$headers = @{
    Authorization  = "Bearer $token"
    'Content-Type' = 'application/json'
}

# --- Build assistant body ------------------------------------------------------
$tools = @()
if ($agent.tools) {
    foreach ($t in $agent.tools) {
        $toolName = if ($t -is [hashtable]) { $t.Keys | Select-Object -First 1 } else { [string]$t }
        $tools += @{
            type     = 'function'
            function = @{
                name        = ($toolName -replace '[^a-zA-Z0-9_-]', '_')
                description = "UDCSP tool placeholder for '$toolName' (real wiring in APIM/Logic Apps)"
                parameters  = @{ type = 'object'; properties = @{} }
            }
        }
    }
}

$metadata = @{
    udcsp_owner        = [string]$agent.owner
    udcsp_risk_level   = [string]$agent.riskLevel
    udcsp_registry_ref = [string]$agent.registryEntryRef
    udcsp_languages    = if ($agent.languages) { ($agent.languages -join ',') } else { '' }
    udcsp_sla          = [string]$agent.sla
}

$body = @{
    name         = [string]$agent.name
    description  = [string]$agent.description
    model        = [string]$agent.model
    instructions = $instructions
    tools        = $tools
    temperature  = if ($null -ne $agent.temperature) { [double]$agent.temperature } else { 0.7 }
    metadata     = $metadata
}

$bodyJson = $body | ConvertTo-Json -Depth 12 -Compress

# --- Idempotent upsert ---------------------------------------------------------
$listUrl = "$projectBase/assistants?api-version=$apiVersion&limit=100"
$existing = $null
try {
    $listResp = Invoke-RestMethod -Uri $listUrl -Method Get -Headers $headers
    $existing = $listResp.data | Where-Object { $_.name -eq $agent.name } | Select-Object -First 1
} catch {
    Write-Warning "List assistants failed at $listUrl : $($_.Exception.Message)"
}

if ($existing) {
    $url = "$projectBase/assistants/$($existing.id)?api-version=$apiVersion"
    $action = "update assistant '$($agent.name)' (id=$($existing.id))"
} else {
    $url = "$projectBase/assistants?api-version=$apiVersion"
    $action = "create assistant '$($agent.name)'"
}

if ($PSCmdlet.ShouldProcess($url, $action)) {
    try {
        $resp = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $bodyJson
        Write-Host "  ✓ Foundry $action -> id=$($resp.id)" -ForegroundColor Green
    } catch {
        $err = $_.Exception.Message
        $detail = ''
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
        throw "Foundry assistant upsert failed for '$($agent.name)': $err`n$detail"
    }
}
