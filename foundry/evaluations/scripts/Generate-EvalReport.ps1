param([string]$ResultsPath = "..\results\foundry-eval-results.json", [string]$ReportPath = "..\results\evaluation-report.md")
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path (Split-Path $ReportPath) | Out-Null
$items = if (Test-Path $ResultsPath) { Get-Content $ResultsPath -Raw | ConvertFrom-Json } else { @() }
$lines = @("# UDCSP Foundry Evaluation Report", "", "Generated: $(Get-Date -Format o)", "", "| Suite | Mode | Status |", "|---|---|---|")
foreach($i in $items){ $lines += "| $($i.suite) | $($i.mode) | $($i.status) |" }
$lines += "", "> Tenant execution is a placeholder until real Microsoft Foundry project endpoints and credentials are supplied."
$lines | Set-Content -Encoding UTF8 $ReportPath
Write-Host "Wrote $ReportPath"
