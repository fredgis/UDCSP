# Microsoft Priva DSR Orchestration

Microsoft Priva is added to industrialise GDPR Subject Rights Requests (SRRs/DSRs) across the UDCSP platform. It becomes the primary orchestrator for Article 15 access, Article 17 erasure, Article 20 portability, Article 21 objection, and related rectification, restriction and automated-decision-making requests.

Priva reduces the custom Logic Apps surface by moving DPA reporting, citizen communications, request tracking, SLA timers and evidence packs into a Microsoft-governed workflow. The existing Logic Apps remain as technical sub-processors during the transition, executing platform-specific collection or erasure actions when Priva delegates a request with a `priva-request-id` header.

Priva also provides regulator-ready evidence: request intake, identity assurance reference, country DPO routing, approvals, export/erasure packages, completion timestamps and audit trails. Audit logs are retained for seven years to align with the NIS2 evidence baseline.

Priva integrates with Microsoft Purview classifications so DSR discovery is driven by governed data maps rather than ad-hoc service scans. Purview labels and lineage are used to target Dataverse, PostgreSQL, Redis session traces, ADLS Gen2, and Fabric Lakehouse gold-layer data while excluding ephemeral bronze layers.

See:

- `priva-config.yaml` for declarative tenant, SLA, data-source and escalation settings.
- `priva-policies/` for minimisation, transfer and DSR routing policies.
- `dsr-templates/` for multilingual acknowledgement and completion templates.
- `runbooks/` for operations and migration guidance.
