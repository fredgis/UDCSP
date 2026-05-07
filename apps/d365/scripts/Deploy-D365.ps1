param([Parameter(Mandatory)] [string]$EnvironmentUrl,[Parameter(Mandatory)] [string]$SolutionPath)
$ErrorActionPreference = 'Stop'
pac auth select --environment $EnvironmentUrl
pac solution import --path (Join-Path $SolutionPath 'solution.xml') --publish-changes
Write-Host 'Import country solution folders and Power Automate JSON exports in the release pipeline.'
