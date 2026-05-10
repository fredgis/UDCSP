# EU AI Act — Provider Obligation Ownership Chart

> **Purpose** — for each high-risk AI system listed in this registry,
> assign GDPR-style controller/processor split for **EU AI Act Articles
> 8-15** (provider obligations). UDCSP and Microsoft are **joint
> providers** for several systems because Microsoft trains and ships
> the foundation model while UDCSP fine-tunes / prompt-engineers /
> deploys it for a high-risk use case.
>
> Referenced by [`docs/biz/datacompliance.md`](../../../docs/biz/datacompliance.md)
> (Art. 16 row).

## Legend

| Owner | Meaning |
|---|---|
| **MS** | Microsoft (foundation model provider, hosted Foundry runtime) |
| **UDCSP** | UDCSP federation team (deployer + tunings + system prompt + tools) |
| **Joint** | Both — split documented in the per-agent DPIA |
| **n/a** | Article does not apply to this system class |

## Article-by-article split

| Art. | Obligation | citizen-assistant | classifier-model | eligibility-model | doc-extractor | translator | topic-router | caseworker-helper |
|---|---|---|---|---|---|---|---|---|
| 8 | Compliance with requirements | Joint | Joint | Joint | Joint | Joint | UDCSP | UDCSP |
| 9 | Risk-management system | UDCSP | UDCSP | UDCSP | UDCSP | UDCSP | UDCSP | UDCSP |
| 10 | Data and data governance | UDCSP | UDCSP | UDCSP | UDCSP | MS | UDCSP | UDCSP |
| 11 | Technical documentation | Joint | UDCSP | UDCSP | UDCSP | MS | UDCSP | UDCSP |
| 12 | Record-keeping (logging) | UDCSP | UDCSP | UDCSP | UDCSP | UDCSP | UDCSP | UDCSP |
| 13 | Transparency to deployers | Joint | UDCSP | UDCSP | UDCSP | MS | UDCSP | UDCSP |
| 14 | Human oversight | UDCSP | UDCSP | UDCSP | UDCSP | UDCSP | UDCSP | UDCSP |
| 15 | Accuracy, robustness, cybersecurity | Joint | Joint | Joint | Joint | MS | UDCSP | UDCSP |

## Notes per system

* **citizen-assistant** — built on Azure OpenAI GPT-4o; MS trained the
  base model so co-owns Art. 8 / 11 / 13 / 15. UDCSP owns the system
  prompt, retrieval, oversight and logging.
* **classifier-model / eligibility-model / doc-extractor** — fine-tuned
  by UDCSP on synthetic + production-curated datasets ⇒ UDCSP owns
  data governance (Art. 10) and most documentation (Art. 11). MS still
  co-owns Art. 15 because the base weights ship from Microsoft.
* **translator** — Azure AI Translator standard model used as-is ⇒
  Microsoft owns most upstream obligations; UDCSP owns deployment
  oversight only.
* **topic-router / caseworker-helper** — orchestration agents; UDCSP
  fully owns since they wrap Microsoft services without re-training.

## Maintenance

Update this chart whenever:

* a new agent is added to `governance/ai-act/registry/`;
* Microsoft publishes a new model card / system card that shifts the split;
* an incident or audit reveals an obligation gap.

Each update is logged in [`governance/dpia/change-log.md`](../../dpia/change-log.md).
