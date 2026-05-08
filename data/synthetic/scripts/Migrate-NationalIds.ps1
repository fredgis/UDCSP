<#
.SYNOPSIS
    Migrate existing personas from SYNTH-* national IDs to country-format
    synthetic national IDs (CPR / personnummer / foedselsnummer).

.DESCRIPTION
    Reads each per-country JSONL file under data/synthetic/personas/, mutates
    the `national_id` field to the country-correct format, and writes the
    file back in place. The `id` field (SYNTH-DK-000123 etc.) is left
    untouched - it is the internal record key, not a national identifier.

    The IDs produced FOLLOW the country format but are guaranteed
    synthetic by:
      - DK CPR: birth-date prefix uses the persona's age but with day-of-year
        offset = persona index, so the date is plausible but not 1:1 to a real
        person. Last 4 digits encode the persona index. No Modulus-11 check
        applied, which means the IDs WILL be rejected by any production CPR
        validator - this is intentional.
      - SE personnummer: last 4 digits start with '00', a range Skatteverket
        does not allocate to natural persons.
      - NO foedselsnummer: D-number convention (first digit + 4) flags the
        record as a "foreign test user" in NAV's parlance and is never
        allocated to real Norwegians.

    Result: every ID is shaped like a real one (so downstream regex /
    schema validation passes) but no real citizen could ever match.

.NOTES
    Owner: A15 - Synthetic Data.
    Re-runnable: produces deterministic output for the same input ordering.
#>

[CmdletBinding()]
param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..'))
)

$ErrorActionPreference = 'Stop'

function ConvertTo-DkCpr {
    param([int]$Age, [int]$Index)
    $year   = (Get-Date).Year - $Age
    $doy    = ($Index % 365) + 1
    $date   = (Get-Date -Year $year -Month 1 -Day 1).AddDays($doy - 1)
    $dd     = $date.Day.ToString('00')
    $mm     = $date.Month.ToString('00')
    $yy     = ($year % 100).ToString('00')
    $serial = (9000 + ($Index % 999)).ToString('0000')
    return "$dd$mm$yy-$serial"
}

function ConvertTo-SePersonnummer {
    param([int]$Age, [int]$Index)
    $year   = (Get-Date).Year - $Age
    $doy    = ($Index % 365) + 1
    $date   = (Get-Date -Year $year -Month 1 -Day 1).AddDays($doy - 1)
    $dd     = $date.Day.ToString('00')
    $mm     = $date.Month.ToString('00')
    $yyyy   = $year.ToString('0000')
    $serial = '00' + (($Index % 99).ToString('00'))
    return "$yyyy$mm$dd-$serial"
}

function ConvertTo-NoFoedselsnummer {
    param([int]$Age, [int]$Index)
    $year   = (Get-Date).Year - $Age
    $doy    = ($Index % 365) + 1
    $date   = (Get-Date -Year $year -Month 1 -Day 1).AddDays($doy - 1)
    $dd     = $date.Day + 40
    $mm     = $date.Month.ToString('00')
    $yy     = ($year % 100).ToString('00')
    $serial = (10000 + ($Index % 9999)).ToString('00000')
    return "$($dd.ToString('00'))$mm$yy-$serial"
}

function Update-PersonaFile {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][ValidateSet('dk','se','no')][string]$Country
    )
    Write-Host "Migrating $Path ..."
    $lines  = Get-Content $Path
    $idx    = 0
    $output = foreach ($line in $lines) {
        $idx++
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $rec = $line | ConvertFrom-Json
        $newId = switch ($Country) {
            'dk' { ConvertTo-DkCpr           -Age ([int]$rec.age) -Index $idx }
            'se' { ConvertTo-SePersonnummer  -Age ([int]$rec.age) -Index $idx }
            'no' { ConvertTo-NoFoedselsnummer -Age ([int]$rec.age) -Index $idx }
        }
        $rec.national_id = $newId
        $rec | ConvertTo-Json -Compress -Depth 5
    }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($Path, $output, $utf8)
    Write-Host "  -> $($idx) personas migrated"
}

$personasRoot = Join-Path $Root 'personas'

Update-PersonaFile -Path (Join-Path $personasRoot 'dk-personas.jsonl') -Country 'dk'
Update-PersonaFile -Path (Join-Path $personasRoot 'se-personas.jsonl') -Country 'se'
Update-PersonaFile -Path (Join-Path $personasRoot 'no-personas.jsonl') -Country 'no'

Write-Host ''
Write-Host 'Done. National IDs are now country-format synthetic (still rejected by real CPR/personnummer/foedselsnummer validators).' -ForegroundColor Green
