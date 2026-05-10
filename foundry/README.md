# UDCSP Microsoft Foundry Assets

## Purpose
Defines six Foundry-mediated AI agents, shared prompts, evaluation suites and golden datasets for the UDCSP case study. APIM, D365 and the Foundry `topic-router` invoke the specialist agents. All Azure calls are scaffold placeholders.

## How to regenerate
Regenerate datasets with data/synthetic/scripts/Generate-All.ps1, then run foundry/evaluations/scripts/Run-Evaluation.ps1 against a configured tenant.

## How to validate
Run foundry/evaluations/scripts/Generate-EvalReport.ps1 after tenant configuration. Offline validation checks YAML/JSON/JSONL shape and 12-language coverage.

## Owner
A6 · Foundry & AI
