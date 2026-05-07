param([string]$BaseUrl=$env:UDCSP_WEB_BASE_URL,[string]$ResultsRoot='tests/accessibility/results')
$ErrorActionPreference='Stop'; New-Item -ItemType Directory -Force -Path $ResultsRoot | Out-Null
# TODO: case-study scaffold. Install browsers/tools in CI before invoking.
[pscustomobject]@{baseUrl=$BaseUrl;status='scaffold';gate='fail on wcag2a/wcag2aa violations';generatedAt=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $ResultsRoot 'axe-results.json')
