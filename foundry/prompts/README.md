# `foundry/prompts/` — historical shared preambles

> **Status: reference only.** As of May 2026, the safety / multilingual / EU AI Act preambles in this folder are **inlined verbatim** into each agent's `system-prompt.md`. The `@include` directive that used to reference these files is **not** processed by `foundry/scripts/Import-FoundryAgent.ps1` — it would have been emitted to the model as a literal string.

## Why inlined

- Foundry has no native `@include` resolver and our import script does not implement one.
- An agent invoked outside APIM (e.g. directly from Foundry Studio, an eval run, or a future channel) would not get the APIM-injected `[PORTAL_SERVICES_KB]` context, so the agent itself must carry every rule it needs.
- Inlining makes each `system-prompt.md` a single audit-ready artefact for the AI Act registry under `governance/ai-act/registry/<agent>.yaml`.

## How to update a preamble

1. Edit the file in this folder (canonical text).
2. Apply the same change to the corresponding section of every `foundry/agents/*/system-prompt.md`.
3. Run `pwsh foundry/scripts/Import-FoundryAgent.ps1 -AgentDir foundry/agents/<agent> -Subscription ... -ResourceGroup ... -AccountName udcspai` for each agent to push the new instructions to Foundry.

## What lives here

| File | Inlined into |
|---|---|
| `safety-preamble.md` | every agent — section "Safety, multilingual and AI-Act preambles" |
| `multilingual-preamble.md` | every agent — same section |
| `eu-ai-act-disclosure.md` | every agent — same section |

The per-agent inlined section is also tailored where useful (e.g. the translator's multilingual block lists the UDCSP glossary in detail; the eligibility block stresses `humanReviewRequired=true`).
