param([string]$EnvironmentId=$env:POWER_PLATFORM_ENVIRONMENT_ID,[string]$OutputPath="..\exports")
New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null
Write-Warning "Placeholder: run pac copilot export after tenant configuration."
