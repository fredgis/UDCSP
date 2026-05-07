param([ValidateSet('staging','preprod')][string]$Target='staging',[string]$ResultsRoot='tests/security/results')
$ErrorActionPreference='Stop'; $date=Get-Date -Format 'yyyy-MM-dd'; $out=Join-Path $ResultsRoot $date; New-Item -ItemType Directory -Force -Path $out | Out-Null
# TODO: case-study scaffold. Invoke snyk, zap, checkov, tfsec and trufflehog when installed.
[pscustomobject]@{target=$Target;status='scaffold';apim=$env:UDCSP_APIM_BASE_URL;generatedAt=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $out 'security-summary.json')
