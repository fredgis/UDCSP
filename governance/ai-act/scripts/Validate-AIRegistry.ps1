[CmdletBinding()]
param([string]$RegistryPath = (Join-Path $PSScriptRoot '..\registry'), [string]$TemplatePath = (Join-Path $PSScriptRoot '..\templates\registry-entry-template.yaml'))
$template = Get-Content $TemplatePath
$required = @()
$inRequired = $false
foreach ($line in $template) {
  if ($line -match '^required:') { $inRequired = $true; continue }
  if ($inRequired -and $line -match '^  - (.+)$') { $required += $Matches[1]; continue }
  if ($inRequired -and $line -match '^\S') { break }
}
$riskLevels = 'minimal','limited','high'
Get-ChildItem $RegistryPath -Filter '*.yaml' | ForEach-Object {
  $text = Get-Content $_.FullName -Raw
  foreach ($key in $required) {
    if ($text -notmatch "(?m)^$([regex]::Escape($key)):") { throw "$($_.Name) missing required key '$key'" }
  }
  $risk = [regex]::Match($text, '(?m)^riskLevel:\s*(\w+)').Groups[1].Value
  if ($risk -notin $riskLevels) { throw "$($_.Name) has invalid riskLevel '$risk'" }
}
Write-Host 'AI Act registry validation passed.'
