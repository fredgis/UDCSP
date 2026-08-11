# UDCSP — Disaster Recovery Runbook

> **Audience:** SRE on-call + country business-continuity officers (DK / SE / NO).
>
> **Purpose:** operationalises the BCDR matrix in [`data.md`](./data.md) §10 and the resilience experiments in [`infra/security/chaos-studio/`](../../infra/security/chaos-studio/). Every drill described here is run **twice yearly per country**, with caseworker simulation, and the outcome is filed in the country compliance vault.

> ⚠️ **Current executability.** Steps that depend on **per-country D365 Customer Service** envs (caseworker authentication into parallel D365, parallel Dataverse case landing, caseworker lead paging) are **target-state procedures**. D365 Customer Service is not yet installed in any country today — the caseworker workspace is a model-driven Power App on the shared Dataverse env `<your-dataverse-env>`. Run these steps as **table-top drills** until per-country D365 envs exist; see [`inprogress.md`](./inprogress.md) § "Demo 1" for the live-vs-roadmap split.
>
> ⚠️ **Pending security remediation.** The checked-in allowed-regions initiative now permits only DK `northeurope`, SE `swedencentral` and NO `norwayeast`. It has not been deployed, but once applied it blocks a secondary-region recovery deployment until an approved recovery region is added to policy. Treat regional failover as a table-top exercise and run executable drills as same-region restores for now. Storage and Key Vault diagnostic settings are also source-only; APIM diagnostics remain missing.

---

## 1. RPO / RTO targets (recap)

| Plane | Component | RPO | RTO |
|---|---|---|---|
| Cases | Dataverse (D365) | 1 h. | 4 h. |
| Operational OLTP | Postgres Flexible Server (per country) | 15 min. | 1 h. |
| Conversational state | Azure Cache for Redis Enterprise | 15 min. | 30 min. |
| Audit chain | Confidential Ledger | 0 (synchronous) | < 5 min. |
| Stateless inference | Confidential Container Apps | N/A | 10 min. |
| Country data lake | `udcsp<c><env>lake`, `Standard_GRS` in source | Service replication | 1 h. target |
| Logic Apps host storage | `udcsp<c><env>lawork`, `Standard_LRS` | Workflow checkpoint dependent | Recreate with managed-identity settings, blob/file Private Endpoints and verified Private DNS |
| OneLake | Workspace + git artefacts | 24 h. | 24 h. |
| Identity | External ID (per country) + Entra | 0 | 1 h. |
| Secrets | Key Vault HSM-backed | 0 | 1 h. |

Treat these as platform targets. Confirm the current country contract and deployed recovery controls before declaring an RPO or RTO met; the source-only storage and policy changes have not been exercised in Azure.

---

## 2. Drill cadence and ownership

| Cadence | Drill | Owner | Evidence stored in |
|---|---|---|---|
| Monthly | Chaos Studio fault injection (Postgres failover, NSG isolation, Foundry rate-limit) | SRE | `infra/security/chaos-studio/results/` + Sentinel |
| Quarterly | Same-region backup-restore drill on a sacrificial subscription (Postgres + Dataverse; ledger replica is table-top unless its region is approved) | SRE + DPO | Country compliance vault |
| Twice yearly | Regional-failover table-top plus same-region restore drill, with caseworker simulation | Country BCO + SRE + caseworker lead | Country compliance vault + signed report to NIS2 competent authority |
| On every substantial change | DR table-top (read this runbook + diff against IaC) | Architecture chapter | PR review + ADR |

---

## 3. Regional failover drill: current executable scope

The drill below is what a pair of operators executes during the bi-annual exercise. **All steps are read-only against PROD.** Under the current one-region country policy, the parallel `dr-drill-{country}-{yyyymm}` resource group must use the same approved primary region. A true secondary-region cut-over remains table-top until policy contains an approved recovery region.

### 3.1 Pre-checks (T-30 min)

1. Confirm the install report for the active environment is green.
   ```powershell
   pwsh ./scripts/install/Install-UDCSP.ps1 -TestOnly
   ```
2. Confirm deployed Backup vault controls are healthy. Inspect ASR only if an approved recovery region and replication target actually exist; otherwise record ASR as source scaffolding, not a working failover path.
   - Confirm the lake blob service has `StorageRead`, `StorageWrite` and `StorageDelete` diagnostic categories routed to the country LAW.
   - Confirm Key Vault has `AuditEvent` routed to the country LAW.
   - If either setting is absent, record that the pending Bicep remediation is not deployed. APIM diagnostics are a known open gap.
3. If an approved second-region Confidential Ledger replica exists, confirm it reports `synced`. Otherwise record this as a table-top dependency blocked by region policy.
4. Page the country caseworker lead, who joins the war-room bridge with a synthetic persona.

### 3.2 Trigger (T+0)

5. Mark the start in Sentinel with the `dr.drill.start` event (signed by the on-call).
6. Spin up the parallel RG from IaC in the same currently approved country region:
   ```powershell
   pwsh ./scripts/install/Install-UDCSP.ps1 -Environment test -Phase LandingZone,Identity,Postgres,Redis,D365,Foundry,Apim
   ```
7. Restore the most recent approved Postgres backup or PITR point into the parallel RG; verify row counts on `udcsp_application` and `udcsp_case` reference tables.
8. Restore the Dataverse environment backup into a parallel D365 environment; confirm the `udcsp_application` table is reachable.
9. Re-bootstrap the Foundry topic-router connections against the parallel APIM. The APIM phase now fails before import if any API directory with `openapi.yaml` lacks `policy.xml`; fix the missing JWT policy instead of bypassing the check.
   ```powershell
   pwsh ./foundry/agents/topic-router/scripts/Import-TopicRouter.ps1 -DryRun
   ```

### 3.3 Caseworker simulation (T+45 min)

10. The caseworker authenticates against the **parallel** External ID tenant and opens the synthetic persona case.
11. Caseworker submits a routine action (status update, document attach, decision draft) — confirm it lands in the parallel Dataverse and that the audit event is written to the parallel Confidential Ledger.
12. Trigger one citizen-facing turn through the parallel topic-router with a valid JWT for the configured audience and `access_as_user` scope, then confirm Redis slot-fill state is created. An anonymous `2xx` is a failed security result.

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
3. Invoke ASR failover only when a secondary region has been approved and added to the country allowed-regions policy. If the primary region is unavailable and no recovery region is approved, the deployment path is blocked: obtain the emergency governance and policy change before creating recovery resources, and record that the regional RTO cannot yet be met.
4. Pause Foundry **high-risk** agents (the eligibility agent) until the SRE confirms data-plane integrity.
5. Notify the relevant DPA within the GDPR Art. 33 window (**72 h.** maximum, but typically within 24 h.).
6. The Confidential Ledger entries from the impacted region are **not** replayed — they remain immutable evidence; the post-incident report references them by hash.

---

## 5. Drill outcomes — where they live

- Sentinel workbook: **DR Drills** (filtered by `country` + `drill_id`).
- Country compliance vault (per BCO): signed PDF + IaC diff.
- NIS2 competent authority filing (semi-annual aggregate).
- When pending diagnostic settings are absent, attach Azure Activity Log exports and record the Storage, Key Vault and APIM forensic gaps explicitly.

---

> See also: [`data.md`](./data.md) §10 (BCDR matrix), [`architecture.md`](./architecture.md) §16 (Compliance & resilience hardening), [`installation.md`](./installation.md) §9 (Post-install validation).
