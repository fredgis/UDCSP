# UDCSP — Sub-processor register (GDPR Art. 28(2) & (4))

> **Status:** Living document, version-controlled. Every addition requires
> a change-control record and citizen notification (`docs/biz/datacompliance.md` §5).
>
> **Owner:** Data Protection Officer (DPO) — `dpo@udcsp.eu`
>
> **Last reviewed:** 2026-05-08
>
> **Linked controls:** Art. 28 (processor contracts), Art. 32 (security),
> Art. 44–49 (international transfers), AI Act Art. 25 (along the AI value
> chain).

---

## 1. Why this register exists

GDPR Art. 28(2) requires the controller's **prior specific or general
written authorisation** before a processor (UDCSP-operated) engages a
sub-processor (Microsoft, Twilio, the national identity brokers, …).
Art. 28(4) requires the same data-protection obligations to flow down.
This document is the **public, auditable list** consulted by:

| Actor | Use of this list |
|---|---|
| Citizen | Article 13(1)(e) information notice — "who else may see my data" |
| DPO | Vendor-risk reviews, change-control approvals |
| National DPA | Art. 30 record of processing activities (RoPA) evidence |
| AI Act NCA | Art. 25 along-the-value-chain assurance |
| Auditor | Annex VIII (high-risk AI system) traceability |

We commit to a **30-day prior notice** to citizens before any new
sub-processor goes live (DPA template clause 9(b)).

---

## 2. Controller, processor and primary processor

| Role under GDPR | Identity | Notes |
|---|---|---|
| **Joint controllers** | DK Ministry of Foreign Affairs · SE Migrationsverket · NO UDI | One per country; the citizen interacts only with the controller of the residency country. |
| **Processor** | UDCSP platform operator (governmental shared-services entity, EU-established) | Acts strictly on documented controller instructions. |
| **Primary sub-processor** | **Microsoft Ireland Operations Limited** | EU-established legal entity behind every Azure resource. Single processor contract; the Online Services DPA is the master agreement.<br/>Reference: <https://aka.ms/dpa> |

---

## 3. Sub-processor list (in scope of UDCSP)

### 3.1 Microsoft sub-processors

The full chain that Microsoft itself engages (Azure regional ops, Azure
support, third-party integrations) is published, kept current, and notified
to UDCSP via the Microsoft Online Services Subprocessor List:

* **List URL:** <https://www.microsoft.com/licensing/docs/view/Microsoft-Online-Subprocessors>
* **Notification mechanism:** Microsoft Trust Portal subscription;
  changes flow to `dpo@udcsp.eu` and trigger an entry in
  `governance/dpia/change-log.md`.
* **Transfer mechanism:** EU Data Boundary for Microsoft Cloud
  (<https://aka.ms/EUDataBoundary>) covers all primary services in scope
  (Azure, Microsoft 365 / Dynamics 365). Personal data **at rest, in
  transit and in processing** stays inside the EU/EFTA boundary.

### 3.2 UDCSP-specific sub-processors

These are engaged directly by UDCSP and not covered by the Microsoft DPA.

| Sub-processor | Service to UDCSP | Personal data categories | Country / region | Transfer mechanism |
|---|---|---|---|---|
| **MitID-broker A/S** (Nets DanID, on behalf of DK Digitaliseringsstyrelsen) | Strong identity assertion for Danish residents (eIDAS High) | Pseudonymous PID, name, age band, MitID assurance level | Denmark | Intra-EEA — no transfer |
| **Finansiell ID-Teknik BID AB** (BankID Sverige) | Strong identity assertion for Swedish residents (eIDAS High) | Pseudonymous PID, name | Sweden | Intra-EEA — no transfer |
| **BankID BankAxept AS** (Vipps MobilePay) | Strong identity assertion for Norwegian residents (eIDAS High) | Pseudonymous PID, name | Norway / EEA | EEA — Art. 45 adequacy not required |
| **Twilio Ireland Ltd.** *(via Azure Communication Services telephony provider)* | PSTN inbound numbers (DK +45, SE +46, NO +47) and SMS A2P delivery | Calling-line identification (CLI), call duration, SMS delivery receipts | Ireland | Intra-EEA; supplementary measures: TLS 1.3, EU-only routing options enforced |
| **Statens Arkiver** (Danish National Archives) | Long-term retention of public-service case files after Arkivloven release | Case files at end of operational retention | Denmark | Statutory transfer (Arkivloven §5) — Art. 6(1)(c) lawful basis |
| **Riksarkivet** (Swedish National Archives) | Same role for SE under Arkivlagen | Case files at end of operational retention | Sweden | Statutory transfer (Arkivlagen 3§) — Art. 6(1)(c) lawful basis |
| **Arkivverket** (Norwegian National Archives) | Same role for NO under Arkivlova | Case files at end of operational retention | Norway | Statutory transfer (Arkivlova §9) — Art. 6(1)(c) lawful basis |

### 3.3 Sub-processors **explicitly out of scope**

| Vendor / category | Why excluded |
|---|---|
| Any LLM provider outside Microsoft Azure (OpenAI public endpoints, Anthropic, Google, …) | Azure OpenAI Service is the only AI-inference path; no data leaves Azure to a third-party model API. |
| US-hosted analytics tools (Google Analytics, Mixpanel, etc.) | The web channel runs Microsoft Clarity *only* on the cookie-banner-consented surface; product analytics are limited to App Insights inside the EU Data Boundary. |
| Personal-cloud sync providers | Mobile-app caches use device Keychain/Keystore only; no third-party MDM. |

---

## 4. Engagement and termination of sub-processors

| Stage | Procedure |
|---|---|
| **Onboarding** | (1) DPIA delta against `governance/dpia/dpia-template.md`; (2) due-diligence questionnaire (ISO 27001, SOC 2 Type II, penetration test, DPA signed); (3) DPO sign-off; (4) 30-day citizen notice; (5) entry added to this register. |
| **Operational change** *(scope, region, sub-sub-processors)* | Diff posted to `governance/gdpr/sub-processor-change-log.md`; if affecting the categories of personal data, repeat the citizen notice. |
| **Termination** | Documented exit plan (data return + certified erasure within 30 days of termination), confirmed by sub-processor and audited by DPO. |

---

## 5. Citizen-facing references

| Touchpoint | Where the sub-processor list is surfaced |
|---|---|
| Web portal | Footer link → "How we handle your data" → §6 ("Who else sees my data?") |
| Cookie banner / preference center | Each non-essential category names its processor |
| Mobile app | Settings → Privacy → "Sub-processors" |
| Caseworker D365 | Citizen-record sidebar shows the sub-processors that touched that case |

---

## 6. Versioning

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-05-08 | DPO | Initial public register following the GDPR Art. 28 audit close-out. |

---

*See also: `governance/gdpr/dpa.md` (data processing agreement template),
`governance/dpia/` (per-agent DPIAs), `docs/biz/datacompliance.md`
(citizen-facing compliance narrative).*
