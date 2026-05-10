# UDCSP — Disaster Recovery Runbook

> **Audience:** SRE on-call + country business-continuity officers (DK / SE / NO).
>
> **Purpose:** operationalises the BCDR matrix in [`data.md`](./data.md) §10 and the resilience experiments in [`infra/security/chaos-studio/`](../../infra/security/chaos-studio/). Every drill described here is run **twice yearly per country**, with caseworker simulation, and the outcome is filed in the country compliance vault.

---

## 1. RPO / RTO targets (recap)

| Plane | Component | RPO | RTO |
|---|---|---|---|
| Cases | Dataverse (D365) | 1 h. | 4 h. |
| Operational OLTP | Postgres Flexible Server (per country) | 15 min. | 1 h. |
| Conversational state | Azure Cache for Redis Enterprise | 15 min. | 30 min. |
| Audit chain | Confidential Ledger | 0 (synchronous) | < 5 min. |
| Stateless inference | Confidential Container Apps | N/A | 10 min. |
| Storage (ADLS / blobs) | All `udcsp*` accounts (GZRS) | 0 (versioning) | 1 h. |
| OneLake | Workspace + git artefacts | 24 h. | 24 h. |
| Identity | External ID (per country) + Entra | 0 | 1 h. |
| Secrets | Key Vault HSM-backed | 0 | 1 h. |

These numbers are **contracted** in the per-country DPA addendum and re-validated by Chaos Studio every month.

---

## 2. Drill cadence and ownership

| Cadence | Drill | Owner | Evidence stored in |
|---|---|---|---|
| Monthly | Chaos Studio fault injection (Postgres failover, NSG isolation, Foundry rate-limit) | SRE | `infra/security/chaos-studio/results/` + Sentinel |
| Quarterly | Backup-restore drill on a sacrificial subscription (Postgres + Dataverse + Confidential Ledger replica) | SRE + DPO | Country compliance vault |
| Twice yearly | **Full regional failover drill** with caseworker simulation (this runbook) | Country BCO + SRE + caseworker lead | Country compliance vault + signed report to NIS2 competent authority |
| On every substantial change | DR table-top (read this runbook + diff against IaC) | Architecture chapter | PR review + ADR |

---

## 3. Full-failover drill — step by step

The drill below is what a pair of operators executes during the bi-annual exercise. **All steps are read-only against PROD; the failover happens on a parallel `dr-drill-{country}-{yyyymm}` resource group spun up from IaC.**

### 3.1 Pre-checks (T-30 min)

1. Confirm the install report for the active environment is green.
   ```powershell
   pwsh ./scripts/install/Install-UDCSP.ps1 -TestOnly
   ```
2. Confirm Backup vault and ASR replication are healthy in [`infra/security/backup-asr/`](../../infra/security/backup-asr/) (no replication lag warning).
3. Confirm the Confidential Ledger second-region replica reports `synced` (high-risk countries only).
4. Page the country caseworker lead, who joins the war-room bridge with a synthetic persona.

### 3.2 Trigger (T+0)

5. Mark the start in Sentinel with the `dr.drill.start` event (signed by the on-call).
6. Spin up the parallel RG from IaC:
   ```powershell
   pwsh ./scripts/install/Install-UDCSP.ps1 -Environment test -Phase LandingZone,Identity,Postgres,Redis,D365,Foundry,Apim
   ```
7. Restore the most recent geo-paired Postgres backup into the parallel RG; verify row counts on `udcsp_application` and `udcsp_case` reference tables.
8. Restore the Dataverse environment backup into a parallel D365 environment; confirm the `udcsp_application` table is reachable.
9. Re-bootstrap the Foundry topic-router connections against the parallel APIM.
   ```powershell
   pwsh ./foundry/agents/topic-router/scripts/Import-TopicRouter.ps1 -DryRun
   ```

### 3.3 Caseworker simulation (T+45 min)

10. The caseworker authenticates against the **parallel** External ID tenant and opens the synthetic persona case.
11. Caseworker submits a routine action (status update, document attach, decision draft) — confirm it lands in the parallel Dataverse and that the audit event is written to the parallel Confidential Ledger.
12. Trigger one citizen-facing turn through the parallel topic-router and confirm Redis slot-fill state is created.

### 3.4 Cut-over decision and rollback (T+90 min)

13. Decision point: **declare** the drill a success (RTO met) or a failure (rollback).
14. Tear down the parallel RG.
    ```powershell
    pwsh ./scripts/cleanup/Remove-UDCSP.ps1 -Environment test -Confirm
    ```
15. Mark the end in Sentinel with the `dr.drill.end` event including measured RPO/RTO and any deviations from contract.

---

## 4. Real incident — escalation order

If the drill is **not** a drill (real region loss, ransomware suspicion, sovereignty-breach claim):

1. Page the country BCO **and** the cross-country incident commander.
2. Open a Sentinel `incident.major` and a SOC bridge.
3. Invoke ASR failover for the impacted region. RPO/RTO targets above apply.
4. Pause Foundry **high-risk** agents (the eligibility agent) until the SRE confirms data-plane integrity.
5. Notify the relevant DPA within the GDPR Art. 33 window (**72 h.** maximum, but typically within 24 h.).
6. The Confidential Ledger entries from the impacted region are **not** replayed — they remain immutable evidence; the post-incident report references them by hash.

---

## 5. Drill outcomes — where they live

- Sentinel workbook: **DR Drills** (filtered by `country` + `drill_id`).
- Country compliance vault (per BCO): signed PDF + IaC diff.
- NIS2 competent authority filing (semi-annual aggregate).

---

> See also: [`data.md`](./data.md) §10 (BCDR matrix), [`architecture.md`](./architecture.md) §16 (Compliance & resilience hardening), [`installation.md`](./installation.md) §9 (Post-install validation).
