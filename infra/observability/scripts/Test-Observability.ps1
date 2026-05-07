[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $BaseUrl,
  [string] $CorrelationId = [guid]::NewGuid().ToString()
)
$ErrorActionPreference = 'Stop'
$headers = @{ traceparent = "00-$($CorrelationId.Replace('-',''))-0123456789abcdef-01"; 'x-correlation-id' = $CorrelationId }
$response = Invoke-WebRequest -Uri "$BaseUrl/health/trace" -Headers $headers -Method Get -UseBasicParsing
if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "Synthetic trace failed: $($response.StatusCode)" }
[pscustomobject]@{ CorrelationId = $CorrelationId; StatusCode = $response.StatusCode; Path = 'channels→APIM→LogicApps→Foundry→D365→Fabric' }
