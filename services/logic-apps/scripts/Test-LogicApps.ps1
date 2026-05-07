param([Parameter(Mandatory)] [string]$BaseUrl,[string]$Token='test-token')
$ErrorActionPreference = 'Stop'
$payload = @{ citizenId='synthetic'; country='dk'; traceparent='00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00' } | ConvertTo-Json
'application-intake','cross-border-residency','caseworker-decision-publish','gdpr-data-export','ai-decision-shadow-mode','escalation-to-human' | ForEach-Object {
  $code = curl.exe -s -o NUL -w "%{http_code}" "$BaseUrl/api/$_" -H "Authorization: Bearer $Token" -H "Content-Type: application/json" --data $payload
  if ($code -notin @('200','202','401','404')) { throw "Unexpected status $code for $_" }
}
Write-Host 'Logic Apps synthetic checks completed.'
