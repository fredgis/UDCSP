# Topic Router

## Purpose
Multi-turn Foundry conversational orchestrator that replaces the Copilot Studio topic engine. This removes a redundant conversational brain (suppression d'un cerveau redondant) while keeping Foundry as the single orchestration layer.

## Migration scope
- Migrates Copilot Studio topics from `apps/copilot-studio/topics/` and `apps/copilot-studio/agents/citizen-assistant-bot/topics/` into Foundry skill prompts under `topics/`.
- Migrates knowledge sources into `knowledge-sources/` and escalation policy into `escalation-rules.json`.
- Translates Copilot Studio entity definitions into Redis-backed slot definitions in `topics/slot-definitions.yaml`.
- Maps Copilot Studio connectors to APIM, Redis, D365 escalation, and Foundry skill connection placeholders.

## 12-language orchestration
The router preserves da, sv, nb, nn, se, en, de, fr, pl, ar, uk, and fi. It detects or confirms locale, stores locale and slots in Redis, and delegates non-English normalization/localization to the translator agent when downstream skills require it.

## Web chat entry point
The current `apps/web/src/components/ChatWidget.tsx` still embeds Copilot Studio through a DirectLine-style webchat URL. Orchestrator/SA-7 must rewire it to call the APIM-mediated `/agents/topic-router` endpoint instead of using a DirectLine token broker.

## Governance status
`agent.yaml` declares `registryEntryRef: topic-router` with a TODO for the orchestrator to add the AI Act registry entry. This sub-agent intentionally does not modify `governance/` because that folder is owned by another parallel workstream.
