# Topic Router

## Purpose
Multi-turn Foundry conversational orchestrator that owns intent routing, slot-filling and escalation for the citizen-facing channels (web chat, mobile chat, voice). Single conversational brain, single trace plane.

## Responsibilities
- Hosts the 12 topic prompts under `topics/` (one per locale or per intent family).
- Holds the conversational state contract in `topics/slot-definitions.yaml` (Redis-backed slot filling for `channel`, `country`, `language`, `serviceType`, `accessibilityNeed`).
- Wires the four connections (APIM, Redis, D365 escalation, downstream Foundry skills) declared in `agent.yaml`.
- Loads knowledge sources from `knowledge-sources/` and the escalation policy from `escalation-rules.json`.

## 12-language orchestration
The router preserves da, sv, nb, nn, se, en, de, fr, pl, ar, uk, and fi. It detects or confirms locale, stores locale and slots in Redis, and delegates non-English normalization/localization to the translator agent when downstream skills require it.

## Web chat entry point
`apps/web/src/components/ChatWidget.tsx` posts JSON to `${VITE_APIM_BASE_URL}/agents/topic-router/messages` — no DirectLine, no iframe, no third-party web embed.

## Governance status
`agent.yaml` declares `registryEntryRef: topic-router` linked to [`governance/ai-act/registry/topic-router.yaml`](../../../governance/ai-act/registry/topic-router.yaml).
