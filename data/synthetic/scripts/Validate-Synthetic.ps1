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

# -------------------------------------------------------------------------
# Per-country national-id format validation.
#
# After the M7 fix, personas use country-shaped synthetic IDs that are
# guaranteed-fake by construction:
#   DK CPR  (DDMMYY-NNNN) : last 4 digits are 9001..9999 (reserved/test range)
#   SE pnr  (YYYYMMDD-NNNN): last 4 digits start with "00" (Skatteverket synthetic)
#   NO fnr  (DDMMYY-NNNNN) : day-of-month is shifted by +40 (D-number range,
#                            never allocated to real Norwegian residents)
#
# Validation rejects ANY national_id whose last group does NOT match the
# synthetic-marker convention, which is exactly the guarantee we want for
# the case-study sample dataset.
# -------------------------------------------------------------------------
$personaFiles = @(
  @{ path='personas\dk-personas.jsonl'; country='DK'; ok={ param($id) $id -match '^\d{6}-9\d{3}$' } },
  @{ path='personas\se-personas.jsonl'; country='SE'; ok={ param($id) $id -match '^\d{8}-00\d{2}$' } },
  @{ path='personas\no-personas.jsonl'; country='NO'; ok={ param($id) $id -match '^(4|5|6|7)\d{5}-\d{5}$' } }
)
foreach($pf in $personaFiles){
  $full = Join-Path $root $pf.path
  $i = 0
  Get-Content $full | Where-Object { $_.Trim().Length -gt 0 } | ForEach-Object {
    $i++
    $obj = $_ | ConvertFrom-Json
    if(-not $obj.national_id){ throw "$($pf.country) persona $i missing national_id" }
    $ok = & $pf.ok $obj.national_id
    if(-not $ok){ throw "$($pf.country) persona $i national_id '$($obj.national_id)' is not in the synthetic-marker range" }
  }
}

# Belt-and-braces: scan every NON-persona file for any DK CPR-shaped string
# that is NOT in the 9XXX safety range, OR any SE pnr-shaped string that is
# NOT in the 00XX safety range. This catches accidental leaks of real-format
# IDs into derived datasets (applications, conversations, cases, ...).
$nonPersona = Get-ChildItem $root -Recurse -File -Include *.jsonl,*.json,*.md,*.csv |
              Where-Object { $_.FullName -notmatch '\\personas\\' }
foreach($f in $nonPersona){
  $content = Get-Content $f.FullName -Raw
  $dkMatches = [regex]::Matches($content, '\b\d{6}-\d{4}\b')
  foreach($m in $dkMatches){
    $tail = $m.Value.Substring($m.Value.Length - 4)
    if($tail -notmatch '^9\d{3}$'){
      throw "Possible real-format national id detected in $($f.FullName): '$($m.Value)'"
    }
  }
  $seMatches = [regex]::Matches($content, '\b\d{8}-\d{4}\b')
  foreach($m in $seMatches){
    $tail = $m.Value.Substring($m.Value.Length - 4)
    if($tail -notmatch '^00\d{2}$'){
      throw "Possible real-format SE personnummer detected in $($f.FullName): '$($m.Value)'"
    }
  }
}

foreach($lang in @('da','sv','nb','nn','se','en','de','fr','pl','ar','uk','fi')){
  $allText = (Get-ChildItem $root -Recurse -File -Include *.jsonl,*.json,*.md,*.csv | ForEach-Object { Get-Content $_.FullName -Raw }) -join "`n"
  if($allText -notmatch "\b$lang\b"){ throw "Missing language $lang" }
}

$allText = (Get-ChildItem $root -Recurse -File -Include *.jsonl,*.json,*.md,*.csv | ForEach-Object { Get-Content $_.FullName -Raw }) -join "`n"
if($allText -notmatch 'SYNTH-'){ throw "Missing SYNTH identifiers" }

Write-Host "Synthetic validation passed. Counts, language coverage and per-country synthetic-marker formats verified."
