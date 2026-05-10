# Data Processing Agreement (DPA) — UDCSP Template

> **Purpose** — template UDCSP uses to establish GDPR Art. 28 data
> processing agreements with sub-processors that are not already covered
> by a Microsoft Online Services DPA (e.g. Camunda 8 SaaS, ServiceNow
> GovCloud, third-party translation vendors).

> **Status** — operational template. Customise per engagement; final
> signed copies are stored under `governance/gdpr/dpa-signed/` (ACL:
> DPO + Legal only) and indexed in
> [`sub-processors.md`](./sub-processors.md).

---

## 1. Parties

* **Controller** — UDCSP federation lead (per the country whose citizens'
  data is processed: DK / SE / NO).
* **Processor** — _<sub-processor legal name + address>_.

## 2. Subject-matter and duration

* **Subject** — _<short description of the processing>_.
* **Duration** — co-terminus with the underlying service contract.
* **Termination** — see §10.

## 3. Nature and purpose

| Activity | Purpose | Lawful basis (Art. 6) | Special category? (Art. 9) |
|---|---|---|---|
| _e.g. workflow execution_ | _social-protection case routing_ | _6(1)(e)_ | _yes — health data; Art. 9(2)(b)_ |

## 4. Categories of data subjects and personal data

* **Data subjects** — citizens applying to UDCSP-federated services.
* **Personal data** — see Annex A (mirror the controller's RoPA entry).

## 5. Sub-processor obligations (GDPR Art. 28(3))

The processor commits to:

1. Process personal data only on documented instructions from the controller.
2. Ensure persons authorised to process the data are bound by confidentiality.
3. Implement Art. 32 security measures (see Annex B; minimum bar = the
   UDCSP "S-1 baseline" — encryption at rest with CMK, MFA, audit logging,
   least-privilege, breach detection within 24 h).
4. Engage further sub-processors only with prior written authorisation
   from the controller (general or specific) and pass-through of these
   terms.
5. Assist the controller with Art. 32-36 obligations (security, breach
   notification, DPIAs, prior consultation).
6. Assist the controller in fulfilling data-subject-rights requests
   (Art. 12-23) within the timelines set by Microsoft Priva integration
   (see [`governance/priva/`](../priva/)).
7. At termination, delete or return all personal data and certify the
   action within 30 days.
8. Make available all information necessary to demonstrate compliance
   and submit to audits / inspections.

## 6. International transfers

If the processor is established outside the EU/EFTA, the parties enter
into the EU Standard Contractual Clauses (Module 2 — Controller to
Processor) and complete a Transfer Impact Assessment per the UDCSP
TIA template (`governance/gdpr/tia-template.md`).

## 7. Breach notification

The processor notifies the controller's DPO (`dpo@udcsp.eu`) **without
undue delay and in any event within 24 hours** of becoming aware of any
personal-data breach. Notification follows
[`governance/security/breach-notification.md`](../security/breach-notification.md).

## 8. Audit rights

Annual audit by the controller or an independent third-party auditor
appointed by the controller, with at least 30 days notice. The processor
provides the most recent SOC 2 Type II / ISO 27001 / ISO 27701 report
in lieu of on-site audit when available and acceptable to the controller.

## 9. Liability and indemnity

Per the underlying service agreement; not modified by this DPA.

## 10. Termination and exit

Upon termination, the processor returns all personal data in a
machine-readable format and securely deletes residual copies within
30 days. A signed deletion certificate is filed with the controller's
DPO and recorded in [`change-log.md`](../dpia/change-log.md).

---

## Annex A — Categories of personal data

_Mirror the relevant controller RoPA entry._

## Annex B — Technical and organisational measures (TOMs)

_Minimum baseline = UDCSP S-1; processor may exceed but not weaken._

| Control | Requirement |
|---|---|
| Encryption at rest | AES-256, customer-managed keys where supported |
| Encryption in transit | TLS 1.2+ |
| Access control | RBAC + MFA + just-in-time elevation |
| Logging & monitoring | 12-month retention; SIEM-readable |
| Backup | 3-2-1, geo-redundant within EU/EFTA |
| Personnel | NDA + annual privacy training |

---

*Linked from [`sub-processors.md`](./sub-processors.md) §5.*
