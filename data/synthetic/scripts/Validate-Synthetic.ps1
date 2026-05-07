$ErrorActionPreference="Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
function Count-Lines($p){ (Get-Content $p | Where-Object { $_.Trim().Length -gt 0 }).Count }
$expected = @{
 "personas\dk-personas.jsonl"=300; "personas\se-personas.jsonl"=300; "personas\no-personas.jsonl"=300;
 "applications\applications.jsonl"=1500; "conversations\conversations.jsonl"=200; "cases\cases.jsonl"=500
}
foreach($k in $expected.Keys){
  $full = Join-Path $root $k
  if((Count-Lines $full) -ne $expected[$k]){ throw "Count mismatch: $k" }
}
$all = (Get-ChildItem $root -Recurse -File -Include *.jsonl,*.json,*.md,*.csv | ForEach-Object { Get-Content $_.FullName -Raw }) -join "`n"
if($all -match '\b\d{6}-\d{4}\b'){ throw "Possible real-format national id detected" }
foreach($lang in @('da','sv','nb','nn','se','en','de','fr','pl','ar','uk','fi')){ if($all -notmatch "\b$lang\b"){ throw "Missing language $lang" } }
if($all -notmatch 'SYNTH-'){ throw "Missing SYNTH identifiers" }
Write-Host "Synthetic validation passed. Counts and 12-language coverage verified."
