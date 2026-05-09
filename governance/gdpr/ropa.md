# UDCSP — Record of Processing Activities (RoPA), GDPR Art. 30

> Status: **scaffold**. Each row is a real processing activity that the
> platform performs. The DPO maintains the live spreadsheet; this file is
> the version-controlled mirror used for code-review and citizen
> transparency.

---

## 1. Joint-controller statement

The three national agencies (DK Ministry of Foreign Affairs ·
SE Migrationsverket · NO UDI) are **joint controllers** of the citizen
identity scope handled by UDCSP. The joint-controllership arrangement is
documented in `governance/gdpr/joint-controller-arrangement.md` (TODO).

## 2. Processing activities

| # | Activity | Categories of subjects | Categories of data | Recipients | Transfers | Retention | Legal basis |
|---|---|---|---|---|---|---|---|
| 1 | Citizen enquiry — voice / web / chat / SMS / email / mobile | Citizens, prospective applicants | Pseudonymous PID, name, free-text query, language | Citizen Assistant agent, country caseworkers (D365) | None outside EU | 24h (chat), 30d (email), per-channel | GDPR Art. 6(1)(e) public task |
| 2 | Application submission | Applicants | Form fields, attachments (passport, payslips, …) | D365 caseworker, per-country authority | None outside EU | Operational (until decision + appeal) then archive (DK Arkivloven / SE Arkivlagen / NO Arkivlova) | Art. 6(1)(e) + Art. 6(1)(c) statutory |
| 3 | Eligibility pre-assessment (AI-assisted) | Applicants | Slot-filled form fields, derived eligibility flag | Caseworker (advisory only) | None | 30d (PostgreSQL draft), Redis session cache per token lifetime, then mirrored to OneLake Bronze/Silver/Gold | Art. 6(1)(e) + AI Act Art. 26 |
| 4 | Decision letter | Applicants | Decision verdict, rationale, signed letter | Citizen, archive, MFA / Migrationsverket / UDI | Citizen postal address | 7-10 years (per national archive law) | Art. 6(1)(c) statutory |
| 5 | Authentication & strong-identity assertion | Citizens | Pseudonymous PID, assurance level, country claim | UDCSP services | None | Token lifetime (30 min); no body persisted | Art. 6(1)(e) + eIDAS Art. 6 |
| 6 | Push notifications & consent | Mobile app citizens | Device push token, language, consent flag | Apple APNs / Google FCM / Expo (transit only) | Apple/Google for transport only | Until uninstall / consent withdrawal | Art. 6(1)(a) consent |
| 7 | Accessibility settings | Citizens | UI preferences (font size, contrast, screen reader hints) | Citizen-only client cache | None | Local device | Art. 6(1)(b) contractual / app-functioning |
| 8 | Audit / security telemetry | All actors | Sign-in events, traceparent, customDimensions | SecOps, DPO | None outside EU | 180 days hot, 7 years cold (Sentinel + Log Analytics) | Art. 6(1)(c) + NIS2 Art. 21 |
| 9 | AI Act registration | n/a (system metadata) | Agent metadata, model card, DPIA reference | EU AI Office (when GPAI), national NCA | None outside EU | Lifetime of agent + 10y | EU AI Act Art. 49 + Annex VIII |
| 10| Sub-processor governance | Vendors / sub-processors | Vendor contact, contract refs | DPO, vendor management | None outside EU | Contract life + 10y | Art. 28 |
| 11| Microsoft Priva — DSR processor | Citizens, applicants, request representatives | DSR request metadata, identity evidence reference, country claim, Priva request ID, export/erasure evidence | Country DPO, Microsoft Priva, technical Logic Apps sub-processors | None outside EU Data Boundary | DSR audit logs 7y | GDPR Art. 12, 15, 17, 20, 21 + Art. 28 |

## 2.1 DSR orchestration

Microsoft Priva is the primary processor for GDPR subject rights requests. The configuration, policies, templates and runbooks are maintained in [`governance/priva/`](../priva/). During the transition, the custom GDPR Logic Apps continue as technical sub-processors for platform-specific export and erasure when Priva delegates a request with a `priva-request-id` header; requests without that header follow the legacy compatibility path. Microsoft Priva is covered through the Microsoft sub-processor chain under the EU Data Boundary; see [`sub-processors.md`](sub-processors.md).

## 3. Sub-processors

See [`sub-processors.md`](sub-processors.md).

## 4. Transfers outside EU/EEA

**None.** All personal data stays inside the EU Data Boundary. See
`docs/biz/datacompliance.md` for the citizen-facing explanation.

## 5. Security measures

See [`governance/security/breach-notification.md`](../security/breach-notification.md)
and [`docs/tech/architecture.md` §10](../../docs/tech/architecture.md#10-security-architecture-zero-trust-defence-in-depth).

## 6. Versioning

| Version | Date | Author | Notes |
|---|---|---|---|
| 0.1 | 2026-05-08 | DPO | Scaffold to close the conformance-matrix gap. |
