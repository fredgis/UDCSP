<#
.SYNOPSIS
    Deploys the UDCSP voice channel for one country: ACS resource (data-pinned),
    GPT-4o Realtime model deployment, voice orchestrator Container App, and
    the Event Grid subscription that wires ACS IncomingCall to the orchestrator.

.DESCRIPTION
    Idempotent. Honours -WhatIf to preview without applying. Designed to run
    from CI (federated identity) or from an operator workstation with
    `az login` already done in the right tenant + subscription.

.PARAMETER Country
    Sovereignty zone: dk | se | no.

.PARAMETER Env
    Environment: dev | test | prod.

.PARAMETER ResourceGroup
    Existing resource group in the country's pinned region (northeurope /
    swedencentral / norwayeast).

.PARAMETER Location
    Azure region matching the country sovereign zone.

.PARAMETER ContainerAppsEnvironmentId
    Resource id of the ACA environment hosted in the country zone.

.PARAMETER UserAssignedIdentityId
    UAMI with Key Vault Secrets User + Cognitive Services User + ACS
    Contributor roles already granted.

.PARAMETER Image
    Container image reference for the voice orchestrator.

.PARAMETER AzureOpenAiAccountName
    Existing Azure OpenAI account in the country zone, used to create the
    gpt-realtime deployment.

.PARAMETER AzureOpenAiEndpoint
    Endpoint of the same account (https://...azure.com/).

.PARAMETER ApimBaseUrl
    Public APIM gateway URL (https://udcsp-apim-{country}.azure-api.net).

.PARAMETER CognitiveServicesEndpoint
    Endpoint registered with ACS Call Intelligence.

.PARAMETER AcsConnectionStringSecretUri
    Key Vault secret URI for the ACS connection string.

.PARAMETER VoiceClientSecretUri
    Key Vault secret URI for the voice service-principal client secret.

.PARAMETER VoiceClientId
    Voice service-principal application (client) id.

.PARAMETER AppInsightsConnectionString
    Application Insights connection string for trace correlation.

.PARAMETER PublicHostname
    FQDN the orchestrator should be reachable at (Container App ingress).

.PARAMETER D365TransferTargetId
    Communication identifier of the D365 voice workstream queue.

.PARAMETER D365VoiceQueueId
    D365 voice workstream queue id (audit only).

.PARAMETER DeadLetterStorageAccountId
    Resource id of the diagnostics storage account holding the voice
    deadletter container.

.PARAMETER AcsResourceName
    Name of the existing ACS resource for the country.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][ValidateSet('dk','se','no')][string]$Country,
    [Parameter(Mandatory)][ValidateSet('dev','test','prod')][string]$Env = 'dev',
    [Parameter(Mandatory)][string]$ResourceGroup,
    [Parameter(Mandatory)][string]$Location,
    [Parameter(Mandatory)][string]$ContainerAppsEnvironmentId,
    [Parameter(Mandatory)][string]$UserAssignedIdentityId,
    [Parameter(Mandatory)][string]$Image,
    [Parameter(Mandatory)][string]$AzureOpenAiAccountName,
    [Parameter(Mandatory)][string]$AzureOpenAiEndpoint,
    [Parameter(Mandatory)][string]$ApimBaseUrl,
    [Parameter(Mandatory)][string]$CognitiveServicesEndpoint,
    [Parameter(Mandatory)][string]$AcsConnectionStringSecretUri,
    [Parameter(Mandatory)][string]$VoiceClientSecretUri,
    [Parameter(Mandatory)][string]$VoiceClientId,
    [Parameter(Mandatory)][string]$AppInsightsConnectionString,
    [Parameter(Mandatory)][string]$PublicHostname,
    [Parameter(Mandatory)][string]$D365TransferTargetId,
    [Parameter(Mandatory)][string]$D365VoiceQueueId,
    [Parameter(Mandatory)][string]$DeadLetterStorageAccountId,
    [Parameter(Mandatory)][string]$AcsResourceName
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
$infraDir = Join-Path $repoRoot 'apps\voice\call-automation\infra'
$acsDir   = Join-Path $repoRoot 'apps\voice\acs'

function Invoke-AzDeployment {
    param([string]$Name, [string]$TemplateFile, [hashtable]$Parameters)

    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        throw "Azure CLI ('az') is required on PATH for Deploy-Voice."
    }

    $paramArgs = @()
    foreach ($key in $Parameters.Keys) {
        $value = [string]$Parameters[$key]
        $paramArgs += @("$key=$value")
    }

    $cmd = "az deployment group create --resource-group $ResourceGroup --name $Name --template-file `"$TemplateFile`" --parameters $($paramArgs -join ' ')"
    if ($PSCmdlet.ShouldProcess($Name, "az deployment group create")) {
        Write-Host "▶ $cmd"
        & az deployment group create `
            --resource-group $ResourceGroup `
            --name $Name `
            --template-file $TemplateFile `
            --parameters $paramArgs `
            --output json | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "Deployment '$Name' failed (az exit $LASTEXITCODE)." }
    } else {
        Write-Host "[WhatIf] $cmd"
    }
}

Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host " UDCSP voice deployment | country=$Country | env=$Env | rg=$ResourceGroup"
Write-Host "═══════════════════════════════════════════════════════════════"

# 0. Country ACS resource (data-pinned). The Event Grid subscription in
#    step 3 references this as `existing`, and the orchestrator's KV
#    secret `acs-connection-string` points at the access key of this
#    resource. Idempotent: re-deploy is a no-op when name + location
#    match.
Invoke-AzDeployment `
    -Name "udcsp-$Country-$Env-voice-acs" `
    -TemplateFile (Join-Path $acsDir 'acs-resource.bicep') `
    -Parameters @{
        country  = $Country
        location = $Location
    }

# 1. GPT-4o Realtime deployment in the country Azure OpenAI account.
Invoke-AzDeployment `
    -Name "udcsp-$Country-$Env-voice-realtime" `
    -TemplateFile (Join-Path $infraDir 'gpt-realtime-deployment.bicep') `
    -Parameters @{
        country               = $Country
        env                   = $Env
        location              = $Location
        azureOpenAiAccountName = $AzureOpenAiAccountName
    }

# 2. Container App orchestrator (ACS Call Automation ↔ Realtime ↔ Foundry).
Invoke-AzDeployment `
    -Name "udcsp-$Country-$Env-voice-orchestrator" `
    -TemplateFile (Join-Path $infraDir 'voice-orchestrator.bicep') `
    -Parameters @{
        country                       = $Country
        env                           = $Env
        location                      = $Location
        containerAppsEnvironmentId    = $ContainerAppsEnvironmentId
        image                         = $Image
        userAssignedIdentityId        = $UserAssignedIdentityId
        publicHostname                = $PublicHostname
        azureOpenAiEndpoint           = $AzureOpenAiEndpoint
        apimBaseUrl                   = $ApimBaseUrl
        cognitiveServicesEndpoint     = $CognitiveServicesEndpoint
        d365TransferTargetId          = $D365TransferTargetId
        d365VoiceQueueId              = $D365VoiceQueueId
        appInsightsConnectionString   = $AppInsightsConnectionString
        acsConnectionStringSecretUri  = $AcsConnectionStringSecretUri
        voiceClientSecretUri          = $VoiceClientSecretUri
        voiceClientId                 = $VoiceClientId
    }

# 3. Event Grid subscription on the country ACS resource.
Invoke-AzDeployment `
    -Name "udcsp-$Country-$Env-voice-eventgrid" `
    -TemplateFile (Join-Path $infraDir 'event-grid-incoming-call.bicep') `
    -Parameters @{
        acsResourceName            = $AcsResourceName
        orchestratorFqdn           = $PublicHostname
        deadLetterStorageAccountId = $DeadLetterStorageAccountId
    }

Write-Host "✔ Voice channel deployed for $Country / $Env."
Write-Host "  Next: ./Bind-AcsNumber.ps1 -Country $Country -Env $Env  (binds the procured PSTN number to the orchestrator)."
