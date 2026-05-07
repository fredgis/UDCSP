# Foundry Evaluation Pipelines

## Purpose
orchestrate A6 Foundry eval suites and A15 datasets into ship/no-ship gates.

## Local run
`pwsh scripts/Run-Eval-Pipeline.ps1 -Pipeline nightly-assistant`

## CI run
nightly/monthly workflows in `.github/workflows/`

## Owner
A14 QA & Evaluation

## How to read results
Review `results/<date>/summary.md`, per-pipeline JSON, and gate decisions from `quality-gates/gates.yaml`.
