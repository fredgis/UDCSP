param([string]$ReleaseVersion='vNext',[string]$OutputRoot='tests/conformance/results')
$ErrorActionPreference='Stop'; $out=Join-Path $OutputRoot $ReleaseVersion; New-Item -ItemType Directory -Force -Path $out | Out-Null
# TODO: case-study scaffold. Convert evidence to a PDF-ready bundle after real artefacts exist.
"# UDCSP Conformance Pack $ReleaseVersion`n`nIncludes eIDAS, GDPR Art. 25/32/35, EU AI Act and WCAG links." | Set-Content -Encoding utf8 (Join-Path $out 'bundle-index.md')
