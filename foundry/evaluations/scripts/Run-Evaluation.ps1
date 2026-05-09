param(
  [string]$FoundryEndpoint = $env:UDCSP_FOUNDRY_ENDPOINT,
  [string]$OutputPath = (Join-Path $PSScriptRoot "..\results")
)
$ErrorActionPreference = "Stop"
$evalSuitesPath = Join-Path $PSScriptRoot "..\eval-suites"
New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null
if (-not $FoundryEndpoint) { Write-Warning "No Foundry endpoint configured. Writing dry-run result only." }
$suites = Get-ChildItem -Path $evalSuitesPath -Filter "*.yaml"
$results = foreach ($suite in $suites) {
  [pscustomobject]@{ suite=$suite.BaseName; mode= if($FoundryEndpoint){"placeholder-rest-call"}else{"dry-run"}; status="not-run"; timestamp=(Get-Date).ToString("o") }
}
$results | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 (Join-Path $OutputPath "foundry-eval-results.json")
Write-Host "Evaluation scaffold complete. Configure tenant endpoint to execute real Foundry evaluations."
