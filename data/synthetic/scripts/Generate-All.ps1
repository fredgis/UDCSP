Write-Warning "Scaffold generator placeholder. Re-run repository generation script or extend generators/*.py with Faker-backed generation for tenant-scale data."
$generatorsDir = Join-Path $PSScriptRoot '..\generators'
Get-ChildItem $generatorsDir -Filter "generate_*.py" -ErrorAction SilentlyContinue | ForEach-Object { python $_.FullName }
