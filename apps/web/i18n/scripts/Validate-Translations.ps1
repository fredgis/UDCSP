$ErrorActionPreference="Stop"
$base = Get-Content "..\messages\en.json" -Raw | ConvertFrom-Json -AsHashtable
$baseKeys = @($base.Keys | Sort-Object)
foreach($file in Get-ChildItem "..\messages" -Filter "*.json"){
  $data = Get-Content $file.FullName -Raw | ConvertFrom-Json -AsHashtable
  $keys = @($data.Keys | Sort-Object)
  if(($keys -join "|") -ne ($baseKeys -join "|")){ throw "Key mismatch in $($file.Name)" }
}
Write-Host "Translation catalogues valid: $($baseKeys.Count) keys across $((Get-ChildItem "..\messages" -Filter "*.json").Count) languages."
