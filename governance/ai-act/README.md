# UDCSP EU AI Act Registry

## Purpose
Maintains the AI-system registry evidence required for UDCSP AI use cases, including high-risk eligibility pre-assessment and limited-risk citizen-facing AI systems. Entries record purpose, datasets, risk level, fairness metrics, human oversight and post-market monitoring.

## Deploy
Publish approved YAML entries to Purview AI asset registry and link them to Foundry agent/model metadata during release.

## Test
Run `scripts/Validate-AIRegistry.ps1` to validate all entries against `templates/registry-entry-template.yaml`.

## Tear-down
Archive registry entries with release evidence; do not delete records that support audit or post-market monitoring.

## Owner
A13 — Data Governance, aligned with A6 Foundry & AI.
