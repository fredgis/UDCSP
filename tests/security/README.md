# Security Test Scaffolds

## Purpose
run dependency, DAST, IaC, and secret scans for README rows 9, 10, 14, and 15.

## Local run
`pwsh scripts/Run-Security.ps1 -Target staging`

## CI run
`.github/workflows/security-weekly.yml`.

## Owner
A14 QA & Evaluation with A3 Security & Compliance

## How to read results
Review `results/<date>/security-summary.json` plus ZAP, Checkov, tfsec, Snyk, and Trufflehog outputs.
