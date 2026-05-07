# Accessibility Audits

## Purpose
prove WCAG 2.1 AA conformance, mirroring `apps/web/i18n/accessibility/wcag-2.1-aa-checklist.md`.

## Local run
`pwsh scripts/Run-Accessibility.ps1`

## CI run
`.github/workflows/accessibility-gate.yml` fails on `wcag2a`/`wcag2aa` axe violations.

## Owner
A14 QA & Evaluation with A12 Accessibility & Localization

## How to read results
Open `results/<date>/axe-results.json`, Lighthouse output, and manual audit trackers.
