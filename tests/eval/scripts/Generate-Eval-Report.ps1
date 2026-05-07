param([string]$ResultsDate=(Get-Date -Format 'yyyy-MM-dd'),[string]$ResultsRoot='tests/eval/results')
$dir=Join-Path $ResultsRoot $ResultsDate; New-Item -ItemType Directory -Force -Path $dir | Out-Null; "# UDCSP Eval Summary $ResultsDate`n`nTODO: case-study scaffold. Attach Foundry run IDs, quality gates, and Slack/Teams snippet." | Set-Content -Encoding utf8 (Join-Path $dir 'summary.md')
