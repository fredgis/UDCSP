param([string]$EnvironmentId=$env:POWER_PLATFORM_ENVIRONMENT_ID,[string]$BotPath="..\agents\citizen-assistant-bot")
if(-not (Test-Path $BotPath)){ throw "BotPath not found: $BotPath" }
Write-Warning "Placeholder: run pac copilot import after tenant configuration."
