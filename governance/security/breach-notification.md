# UDCSP — Breach notification procedure (GDPR Art. 33–34, NIS2 Art. 23)

> Owner: DPO (`dpo@udcsp.eu`) + Security Operations (A3)
> Last reviewed: 2026-05-08
> Anchored on:
> - GDPR Art. 33 (notification to supervisory authority within 72h)
> - GDPR Art. 34 (notification to data subjects without undue delay)
> - NIS2 Art. 23 (early warning ≤24h, full notification ≤72h, final ≤30 days)
> - Per-country DPAs: Datatilsynet (DK), IMY (SE), Datatilsynet (NO)

---

## 1. Detection

A potential breach is any event in Microsoft Sentinel that:

* Triggers an analytics rule of severity `High` or `Critical`,
* Originates from one of the citizen-data scopes (Dataverse, Cosmos,
  OneLake, Blob, Defender for Storage virus-scan tag = `Malicious`),
* Or is reported by a sub-processor under their own DPA.

The rule fires an Incident in the per-country Sentinel workspace and
pages the on-call SecOps engineer via Azure Monitor Action Group.

## 2. First-hour response (T+0 to T+1h)

| Step | Owner | Output |
|---|---|---|
| Confirm scope (which country zone, which subjects) | SecOps | Incident "scope" field |
| Containment (rotate credentials, block IPs, quarantine blobs) | SecOps | Incident timeline |
| Forensic snapshot (Defender, Sentinel hunt) | SecOps | Evidence bundle in cold-storage account |
| Notify DPO + legal | SecOps | Email + Teams escalation |

## 3. Decision: is this an Art. 33 reportable breach?

The DPO opens `governance/security/breach-decision-template.md` (TODO
template) and answers:

1. Is **personal data** affected? If no → not Art. 33.
2. Does the breach create a risk to rights and freedoms? If no → log only.
3. Does it create a **high** risk? If yes → also Art. 34 (notify subjects).

NIS2 (Art. 23) requires an **early warning** within 24h regardless of GDPR
classification, if the incident has a **significant impact** on the
service.

## 4. Notification clocks

| Authority | Statute | Clock | Channel |
|---|---|---|---|
| Datatilsynet (DK) | GDPR 33(1) | 72h | https://www.datatilsynet.dk |
| IMY (SE)          | GDPR 33(1) | 72h | https://www.imy.se |
| Datatilsynet (NO) | GDPR 33(1) | 72h | https://www.datatilsynet.no |
| National CSIRT/NCA | NIS2 Art. 23 | 24h early warning · 72h notification · 1m final | Per-country CSIRT portal |
| AI Act NCA (if AI-system serious incident) | EU AI Act Art. 73 | 15d / 10d / 2d | See [`governance/ai-act/procedures/serious-incident-reporting.md`](../ai-act/procedures/serious-incident-reporting.md) |
| Affected citizens (Art. 34) | GDPR 34(1) | "without undue delay" | In-app + email + (if material) public statement |

## 5. After-action

* Update `governance/dpia/change-log.md` with the lesson learnt.
* If a sub-processor was involved, add an entry in
  [`governance/gdpr/sub-processor-change-log.md`](../gdpr/sub-processor-change-log.md).
* Run a post-mortem within 14 days; minutes filed under `governance/security/postmortems/`.
* Re-run the affected DPIA where needed.

## 6. Responsibilities matrix

| Role          | T+0 → T+1h | T+1h → T+24h | T+24h → T+72h | T+72h → T+30d |
|---------------|------------|--------------|---------------|---------------|
| SecOps (A3)   | Detect & contain | Forensics | Notification draft | Post-mortem |
| DPO           | Triage | Art. 33 decision | Submit notice | Subject letter, lessons learnt |
| Legal         | On-call | Coordinate | Coordinate | Update DPA / RoPA |
| Country lead  | Inform | Inform | Coordinate with national authorities | Owns the local press statement |

## 7. References

* [`governance/ai-act/procedures/serious-incident-reporting.md`](../ai-act/procedures/serious-incident-reporting.md)
* [`docs/biz/datacompliance.md`](../../docs/biz/datacompliance.md)
* [`docs/tech/architecture.md` §10](../../docs/tech/architecture.md#10-security-architecture-zero-trust-defence-in-depth)
