# UDCSP Microsoft Foundry Assets

_Last verified: 2026-07-26 · commit 5a8d591_

## Purpose
Defines seven Foundry agents, shared prompts, evaluation suites and golden datasets for the UDCSP case study.

Agent folders: `caseworker-helper`, `citizen-assistant`, `classifier`, `doc-extractor`, `eligibility`, `topic-router`, `translator`.

🟢 **Live**: DK, SE and NO use the same Foundry project. The citizen portal calls `eligibility` synchronously through APIM. The voice orchestrator calls `topic-router` as a function tool. The Logic App invokes `classifier`, `doc-extractor`, `eligibility` and `translator`.

🟢 **Live**: `topic-router` is the single conversational entry point after the Copilot Studio refactor. Web chat, voice and mobile reach it through APIM at `/agent-topic-router/messages`; it routes to the specialist agents.

## How to regenerate
Regenerate datasets with `data/synthetic/scripts/Generate-All.ps1`.

Import or update agents with `foundry/scripts/Import-FoundryAgent.ps1`. The script uses the Foundry Agents API v1 (`/agents`, `kind: prompt`, Entra auth, name plus version identity), not the legacy Assistants API.

## How to validate
Run `foundry/evaluations/scripts/Generate-EvalReport.ps1` after tenant configuration. Offline validation checks YAML, JSON, JSONL shape and 12-language coverage.

Run `foundry/evaluations/scripts/Run-Evaluation.ps1` against a configured tenant for agent quality checks.

## Owner
A6 · Foundry & AI
