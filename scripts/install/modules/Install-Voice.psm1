<#
.SYNOPSIS
    Install-Voice (A10) — installs the voice channel for all 3 countries:
    ACS resource (data-pinned), GPT-4o Realtime deployment, voice
    orchestrator Container App, Event Grid subscription, and replays any
    previously persisted PSTN number bindings.

.DESCRIPTION
    Honours -WhatIf via SupportsShouldProcess. Per country it:

      1. Calls Deploy-Voice.ps1 with values pulled from $Config (one block
         per country: $Config.voice.dk, .se, .no).
      2. For every binding in apps/voice/acs/phone-number-bindings.yaml
         that targets this country, calls Bind-AcsNumber.ps1 to verify the
         number is still owned by the ACS resource.

    Test-Voice exercises the deployed orchestrator (healthz + Event Grid
    handshake) per country.

    The legacy '[scaffold]' log lines are gone — this is the real installer.
#>
function Install-Voice {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)][hashtable]$Config,
        [Parameter(Mandatory)][string]$ReportDir
    )
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $logFile = Join-Path $ReportDir 'install-voice.log'
    $deployScript = Join-Path $repo 'apps\voice\scripts\Deploy-Voice.ps1'
    $bindScript   = Join-Path $repo 'apps\voice\scripts\Bind-AcsNumber.ps1'
    $bindingsFile = Join-Path $repo 'apps\voice\acs\phone-number-bindings.yaml'

    foreach ($country in 'dk','se','no') {
        $cfg = $Config.voice.$country
        if (-not $cfg) {
            "[skip] No voice config block for country '$country' in `$Config.voice.$country" | Add-Content $logFile
            continue
        }

        if ($PSCmdlet.ShouldProcess("voice/$country", 'Deploy-Voice')) {
            "[deploy] $country → $($cfg.resourceGroup)" | Add-Content $logFile
            & $deployScript `
                -Country $country `
                -Env $cfg.env `
                -ResourceGroup $cfg.resourceGroup `
                -Location $cfg.location `
                -ContainerAppsEnvironmentId $cfg.containerAppsEnvironmentId `
                -UserAssignedIdentityId $cfg.userAssignedIdentityId `
                -Image $cfg.image `
                -AzureOpenAiAccountName $cfg.azureOpenAiAccountName `
                -AzureOpenAiEndpoint $cfg.azureOpenAiEndpoint `
                -ApimBaseUrl $cfg.apimBaseUrl `
                -CognitiveServicesEndpoint $cfg.cognitiveServicesEndpoint `
                -AcsConnectionStringSecretUri $cfg.acsConnectionStringSecretUri `
                -VoiceClientSecretUri $cfg.voiceClientSecretUri `
                -VoiceClientId $cfg.voiceClientId `
                -AppInsightsConnectionString $cfg.appInsightsConnectionString `
                -PublicHostname $cfg.publicHostname `
                -D365TransferTargetId $cfg.d365TransferTargetId `
                -D365VoiceQueueId $cfg.d365VoiceQueueId `
                -DeadLetterStorageAccountId $cfg.deadLetterStorageAccountId `
                -AcsResourceName $cfg.acsResourceName *>&1 | Tee-Object -FilePath $logFile -Append | Out-Null
        }

        if ((Test-Path $bindingsFile) -and (Get-Command ConvertFrom-Yaml -ErrorAction SilentlyContinue)) {
            $bindings = (Get-Content $bindingsFile -Raw | ConvertFrom-Yaml).bindings
            foreach ($b in $bindings | Where-Object { $_.country -eq $country -and $_.env -eq $cfg.env }) {
                if ($PSCmdlet.ShouldProcess("voice/$country/$($b.phoneNumber)", 'Bind-AcsNumber')) {
                    & $bindScript `
                        -Country $country `
                        -Env $cfg.env `
                        -PhoneNumber $b.phoneNumber `
                        -AcsResourceName $cfg.acsResourceName `
                        -ResourceGroup $cfg.resourceGroup `
                        -OrchestratorFqdn $cfg.publicHostname `
                        -NumberType $b.numberType `
                        -BindingsFile $bindingsFile *>&1 | Tee-Object -FilePath $logFile -Append | Out-Null
                }
            }
        }
    }
}

function Test-Voice {
    param(
        [Parameter(Mandatory)][hashtable]$Config,
        [Parameter(Mandatory)][string]$ReportDir
    )
    $repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
    $script = Join-Path $repo 'apps\voice\scripts\Test-Voice.ps1'
    if (-not (Test-Path $script)) { throw "Missing $script" }

    $results = @()
    foreach ($country in 'dk','se','no') {
        $cfg = $Config.voice.$country
        if (-not $cfg) { continue }
        try {
            & $script -Country $country -Env $cfg.env -OrchestratorBaseUrl ("https://" + $cfg.publicHostname) | Out-Null
            $results += @{ country = $country; status = 'OK' }
        } catch {
            $results += @{ country = $country; status = 'FAIL'; error = $_.Exception.Message }
        }
    }
    $payload = @{ phase = 'Voice'; results = $results }
    $payload | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $ReportDir 'test-voice.json')
}

Export-ModuleMember -Function Install-Voice, Test-Voice
