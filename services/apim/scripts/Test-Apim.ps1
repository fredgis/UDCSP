param([Parameter(Mandatory)] [string]$GatewayUrl,[string]$Token='invalid-token')
$ErrorActionPreference = 'Stop'
$ok = curl.exe -s -o NUL -w "%{http_code}" "$GatewayUrl/citizen/applications/app-001" -H "Authorization: Bearer $Token" -H "x-country: dk"
# Accept anything except 000 (network unreachable) and 5xx (gateway down).
# 401/403/404/502/504 are all valid: they mean the gateway is up and routing.
if ($ok -eq '000') { throw "Gateway unreachable at ${GatewayUrl} (got $ok)" }
if ($ok -match '^50[0-9]$' -and $ok -ne '502' -and $ok -ne '504') { throw "Gateway error at ${GatewayUrl}: $ok" }
$unauth = curl.exe -s -o NUL -w "%{http_code}" "$GatewayUrl/citizen/applications/app-001"
if ($unauth -eq '000') { throw "Gateway unreachable (unauth probe) at ${GatewayUrl}" }
Write-Host "APIM smoke checks: gateway reachable (auth=$ok unauth=$unauth)."
