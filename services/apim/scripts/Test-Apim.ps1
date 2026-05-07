param([Parameter(Mandatory)] [string]$GatewayUrl,[string]$Token='invalid-token')
$ErrorActionPreference = 'Stop'
$ok = curl.exe -s -o NUL -w "%{http_code}" "$GatewayUrl/citizen/applications/app-001" -H "Authorization: Bearer $Token" -H "x-country: dk"
if ($ok -ne '200' -and $ok -ne '404') { throw "Expected reachable API, got $ok" }
$unauth = curl.exe -s -o NUL -w "%{http_code}" "$GatewayUrl/citizen/applications/app-001"
if ($unauth -ne '401') { throw "Expected 401 without token, got $unauth" }
Write-Host 'APIM smoke checks completed; run a low quota test product to assert 429.'
