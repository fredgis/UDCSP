<#
.SYNOPSIS
    Smoke-tests the deployed voice orchestrator: hits /healthz and posts a
    synthetic Event Grid IncomingCall handshake to /api/acs/eventgrid.

.DESCRIPTION
    Two-stage:

      1. GET /healthz  → expect 200 + JSON with `ok=true` and matching country.
      2. POST /api/acs/eventgrid with an EventGrid SubscriptionValidationEvent
         envelope → expect 200 with `validationResponse` echoed back.

    Both stages prove the Container App is up, the Express routes are
    correctly mounted and the EventGrid handshake will succeed when the
    real subscription is created. The IVR pack itself is exercised by the
    vitest suite (`npm test`); this script is the deployment smoke test.

.PARAMETER Country
    Country to test (dk | se | no).

.PARAMETER Env
    Environment (dev | test | prod).

.PARAMETER OrchestratorBaseUrl
    Public base URL of the deployed orchestrator
    (https://udcsp-{country}-{env}-voice-orch.{region}.azurecontainerapps.io).
    If omitted, derived from $env:UDCSP_VOICE_BASE_URL.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('dk','se','no')][string]$Country,
    [Parameter(Mandatory)][ValidateSet('dev','test','prod')][string]$Env = 'dev',
    [string]$OrchestratorBaseUrl = $env:UDCSP_VOICE_BASE_URL
)

$ErrorActionPreference = 'Stop'

if (-not $OrchestratorBaseUrl) {
    throw "OrchestratorBaseUrl not provided and UDCSP_VOICE_BASE_URL is empty."
}

# 1. Healthz probe.
$healthUrl = "$OrchestratorBaseUrl/healthz"
Write-Host "▶ GET $healthUrl"
$health = Invoke-RestMethod -Method Get -Uri $healthUrl -TimeoutSec 30
if (-not $health.ok) { throw "Healthz returned ok=false: $($health | ConvertTo-Json -Depth 4)" }
if ($health.country -ne $Country) {
    throw "Healthz country mismatch: expected '$Country', got '$($health.country)'."
}
Write-Host "  ✔ ok | country=$($health.country) | liveMode=$($health.liveMode)"

# 2. Event Grid subscription-validation handshake.
$validationCode = [Guid]::NewGuid().ToString()
$egPayload = @(
    @{
        id               = [Guid]::NewGuid().ToString()
        topic            = "synthetic"
        subject          = "synthetic"
        eventType        = "Microsoft.EventGrid.SubscriptionValidationEvent"
        eventTime        = (Get-Date).ToUniversalTime().ToString("o")
        metadataVersion  = "1"
        dataVersion      = "1"
        data             = @{
            validationCode = $validationCode
            validationUrl  = "https://example.invalid"
        }
    }
) | ConvertTo-Json -Depth 6

$egUrl = "$OrchestratorBaseUrl/api/acs/eventgrid"
Write-Host "▶ POST $egUrl (SubscriptionValidationEvent)"
$response = Invoke-RestMethod -Method Post -Uri $egUrl -Body $egPayload -ContentType 'application/json' -TimeoutSec 30
if ($response.validationResponse -ne $validationCode) {
    throw "Event Grid handshake failed: expected '$validationCode', got '$($response.validationResponse)'."
}
Write-Host "  ✔ Event Grid handshake OK ($validationCode echoed back)"

Write-Host "✔ Test-Voice passed for $Country / $Env."
