# Serious-incident reporting procedure (EU AI Act Art. 73)

> **Trigger.** A "serious incident" under EU AI Act Art. 3(49) is any incident
> or malfunction of the high-risk AI system (in UDCSP, the **Eligibility
> Pre-Assessor**) that directly or indirectly leads to:
>
> 1. the death of a person, or serious damage to a person's health;
> 2. a serious and irreversible disruption of the management or operation of
>    critical infrastructure;
> 3. infringement of obligations under Union law intended to protect
>    fundamental rights;
> 4. serious damage to property or the environment.

> **Companion documents:**
> - [`docs/biz/datacompliance.md`](../../../docs/biz/datacompliance.md) §§ 5, 8 — the regulatory anchor (Art. 73 + NIS2)
> - [`docs/biz/ai.md`](../../../docs/biz/ai.md) § 11 — governance & lineage view
> - [`procedures/conformity-assessment.md`](./conformity-assessment.md) — pre-market conformity
> - [`procedures/post-market-monitoring.md`](./post-market-monitoring.md) — the standing detection feed
> - [`registry/eligibility-model.yaml`](../registry/eligibility-model.yaml) — the high-risk system's authority contacts

## 1. Reporting deadlines (Art. 73(2))

| Trigger | Notify the **market-surveillance authority** of the country in which the incident occurred |
|---|---|
| **General serious incident** | Immediately after establishing a causal link (or reasonable likelihood of one), and at the latest **15 days** after the provider / deployer becomes aware of it. |
| **Death of a person, or widespread infringement** | At the latest **10 days** after awareness. |
| **Critical-infrastructure disruption** | At the latest **2 days** after awareness. |

> ⚠️ The clock starts when **awareness** is established, not when the technical
> root cause is fully understood. The first report can be partial; the law
> explicitly anticipates iterative reports as the investigation progresses
> (Art. 73(5)).

## 2. Per-country competent authorities

| Country | Market-surveillance authority for AI Act | DPA (data-related dimension) | CSIRT (NIS2 cyber dimension) |
|---|---|---|---|
| 🇩🇰 DK | To be designated under DK AI Act transposition (provisional contact: Digitaliseringsstyrelsen) | Datatilsynet (`dt@datatilsynet.dk`) | CFCS — Center for Cybersikkerhed (`cert@cfcs.dk`) |
| 🇸🇪 SE | To be designated under SE AI Act transposition (provisional contact: Integritetsskyddsmyndigheten) | IMY (`imy@imy.se`) | CERT-SE (`cert@cert.se`) |
| 🇳🇴 NO | EFTA / EEA national surveillance route via Datatilsynet NO + Nkom | Datatilsynet NO (`postkasse@datatilsynet.no`) | NCSC-NO — Nasjonalt cybersikkerhetssenter (`post@nsm.no`) |

Authority contacts are mirrored verbatim in
[`registry/eligibility-model.yaml`](../registry/eligibility-model.yaml) and
[`registry/caseworker-helper.yaml`](../registry/caseworker-helper.yaml) so the
on-call engineer never needs to look them up under pressure.

## 3. Workflow

```
T+0     Detection (caseworker / Sentinel rule / post-market monitoring sample)
        │
        ▼
T+0 → T+4h
        Triage: Incident Lead opens an IR ticket in D365 (queue
        "ai-act-incident") AND a Sentinel incident is auto-correlated by
        traceparent. Severity is provisionally set ⇒ reporting clock starts.
        │
        ▼
T+4h → T+24h
        Containment: shadow-mode-only the Eligibility agent if the incident
        type warrants (use `scripts/install/Switch-EligibilityToShadow.ps1`).
        Engage the DPO and the Compliance lead.
        │
        ▼
T+24h → T+48h (or T+10d / T+15d depending on severity)
        Notification: Compliance lead files the Art. 73 notification with
        the market-surveillance authority of the country of incident, plus
        any GDPR Art. 33 (DPA, ≤ 72h) and NIS2 (CSIRT, 24h early warning
        + 72h notification) parallel filings via the relevant CSIRT.
        │
        ▼
T+1m
        Final report (NIS2): full incident report to CSIRT.
        Updated Art. 73 report to the market-surveillance authority with
        root cause, mitigation, and post-market-monitoring impact.
        │
        ▼
T+1m → T+3m
        Lessons learnt: post-mortem in
        `governance/ai-act/registry/post-market-monitoring/<incident-id>.md`,
        evaluation suite augmented with a regression case in
        `foundry/evaluations/eval-suites/eligibility.yaml`,
        Sentinel analytics rule tuned, conformity declaration re-signed if
        required (`templates/conformity-declaration.template.yaml`).
```

## 4. Roles

| Role | Responsibility |
|---|---|
| **Incident Lead** (on-call SRE) | Owns the IR ticket; coordinates containment; sets the reporting clock. |
| **Compliance Lead** | Files the Art. 73 notification(s); coordinates with DPO and DPA on the GDPR Art. 33 parallel notification. |
| **DPO** | Owns GDPR Art. 33 / 34 notifications; informs data subjects when required (Art. 34). |
| **CISO / SOC Lead** | Owns NIS2 notifications via the per-country CSIRT. |
| **Agent owner** (A6) | Provides root-cause analysis; updates evaluation suite, prompt, or model. |
| **Service owner** (A11) | Owns citizen-facing communication; coordinates caseworker re-triage if past decisions need to be reviewed. |

## 5. Evidence captured for the regulator

Every Art. 73 notification is accompanied by:

- The full traceparent of the incident-triggering invocation (App Insights query saved as a workbook).
- The Foundry agent version, prompt hash, and model version (from `registry/eligibility-model.yaml`).
- The pre-incident evaluation pack result (`foundry/evaluations/results/`).
- The Sentinel incident IDs that correlated (NIS2 cyber dimension).
- The DPIA reference (`governance/dpia/dpia-eligibility-model.md`).
- The mitigation timeline and downstream caseworker actions.

## 6. No mistaken silence

If in doubt, **report**. The Art. 73 chain is deliberately permissive on
under-confirmed reports (a partial report inside the deadline is far better
than a complete report after it). The on-call engineer is empowered to start
the chain without waiting for senior approval; the post-mortem can challenge
the classification later.

---

*This procedure is reviewed annually and after every notified incident. Last
review: 2026-05-08. Next review: 2027-05-08 or T+30 days after the next
notified incident, whichever is sooner.*
