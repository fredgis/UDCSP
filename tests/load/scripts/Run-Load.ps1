param([ValidateSet('burst','soak','stress','all')][string]$Scenario='burst',[string]$ResultsRoot='tests/load/results')
$ErrorActionPreference='Stop'; $date=Get-Date -Format 'yyyy-MM-dd'; $out=Join-Path $ResultsRoot $date; New-Item -ItemType Directory -Force -Path $out | Out-Null
# TODO: case-study scaffold. Requires k6 installed; emits JSON via --summary-export.
[pscustomobject]@{scenario=$Scenario;status='scaffold';sloPath='tests/load/slo/slos.yaml'} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $out "$Scenario-summary.json")
