param([string]$ResultsDate=(Get-Date -Format 'yyyy-MM-dd'),[string]$ResultsRoot='tests/load/results')
$dir=Join-Path $ResultsRoot $ResultsDate; New-Item -ItemType Directory -Force -Path $dir | Out-Null; "# Load Report $ResultsDate`n`nTODO: compare k6 JSON against tests/load/slo/slos.yaml." | Set-Content -Encoding utf8 (Join-Path $dir 'load-report.md')
