Write-Warning "Scaffold generator placeholder. Re-run repository generation script or extend generators/*.py with Faker-backed generation for tenant-scale data."
Get-ChildItem "..\generators" -Filter "generate_*.py" | ForEach-Object { python $_.FullName }
