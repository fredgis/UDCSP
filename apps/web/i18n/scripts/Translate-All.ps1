param([string]$Pipeline="..\pipeline\translation-pipeline.yaml")
if(-not (Test-Path $Pipeline)){ throw "Pipeline not found" }
Write-Warning "Placeholder only: configure Azure AI Translator endpoint and human-review workflow before live translation."
