# Load and Performance Tests

## Purpose
assert citizen, caseworker, voice, and AI SLOs from architecture §11.

## Local run
`pwsh scripts/Run-Load.ps1 -Scenario burst`

## CI run
`.github/workflows/load-weekly.yml`.

## Owner
A14 QA & Evaluation

## How to read results
Compare k6 JSON under `results/<date>/` against `slo/slos.yaml` with `Generate-Load-Report.ps1`.
