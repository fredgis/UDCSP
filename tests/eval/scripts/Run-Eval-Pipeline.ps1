param([Parameter(Mandatory=$true)][string]$Pipeline,[string]$Agent='auto',[string]$SuitePath,[string]$ResultsRoot='tests/eval/results')
$ErrorActionPreference='Stop'; $date=Get-Date -Format 'yyyy-MM-dd'; $out=Join-Path $ResultsRoot $date; New-Item -ItemType Directory -Force -Path $out | Out-Null
# TODO: case-study scaffold. Replace with Foundry CLI/SDK invocation and polling.
[pscustomobject]@{pipeline=$Pipeline;agent=$Agent;suitePath=$SuitePath;status='scaffold-passed';foundryEndpoint=$env:FOUNDRY_PROJECT_ENDPOINT;generatedAt=(Get-Date).ToString('o')} | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $out "$Pipeline.json")
