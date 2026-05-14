# 👥 UDCSP — Demo Personas & Identity Provisioning

> **Source of truth** for every named persona in [`uses.md`](./uses.md), the AD/tenant where their account lives, and the licences / groups they need to play their demo.
>
> All personas are **synthetic** — produced by the **A15 Synthetic Data & Personas** track. No real PII anywhere.

---

## 🪪 Citizens — Microsoft Entra **External ID** (CIAM)

> One CIAM tenant per country. Citizens authenticate via [`MitID` / `BankID` / `BankID Norge`](../tech/architecture.md#4-identity-federation-detail) brokered by Criipto / Signicat in production; via email + OTP in the sandbox.

| Persona | Demo(s) | Country tenant | Suggested UPN | Notes |
|---|:-:|---|---|---|
| **Anna Jensen** — 34, software engineer, Copenhagen → Stockholm | D1 | `udcspdk.ciamlogin.com` | `anna.jensen@udcspdk.onmicrosoft.com` | Primary account in DK CIAM. After the cross-border transfer, **Verified ID** auto-onboards her into `udcspse.ciamlogin.com` — provision an SE account in advance only if you want to demo the "she logs back in on the SE portal" step without waiting for the VID issuance. |
| **Maria Kowalska** — 41, Polish citizen living in Copenhagen, NVDA user | D3 | `udcspdk.ciamlogin.com` | `maria.kowalska@udcspdk.onmicrosoft.com` | Resident in DK; UI preference set to **Polish (`pl`)** in profile attributes so the SPA picks `pl.json` on sign-in. |
| **Erik Hansen** — 52, freelance carpenter in Aarhus | D4 | `udcspdk.ciamlogin.com` | `erik.hansen@udcspdk.onmicrosoft.com` | Used for the mobile payslip-snap flow. |
| **Lars Berg** — 67, retired, Norwegian Bokmål speaker | D2 | `udcspno.ciamlogin.com` | `lars.berg@udcspno.onmicrosoft.com` | Voice-channel demo — also used to test the warm transfer to a NO caseworker. |

### TL;DR — minimum CIAM accounts

| Tenant | Accounts to provision |
|---|---|
| 🇩🇰 `udcspdk.ciamlogin.com` | Anna · Maria · Erik *(3 accounts)* |
| 🇸🇪 `udcspse.ciamlogin.com` | *(none required — Anna is provisioned by Verified ID at the cross-border step)* — provision an Anna SE account manually if you want to skip the wait. |
| 🇳🇴 `udcspno.ciamlogin.com` | Lars *(1 account)* |

---

## 🧑‍💼 Back-office staff — Microsoft Entra **ID** (workforce, **UDCSP system tenant**)

> All caseworkers, DPOs, SOC analysts, CIOs and SREs live in the **UDCSP system tenant** — not in any of the per-country CIAM tenants. Rationale: caseworkers triage cases from any country via D365 / Power Apps, and the system tenant is where the Logic Apps / APIM managed identities are scoped (see [`docs/tech/inprogress.md` § Caseworker UI strategy](../tech/inprogress.md#caseworker-ui-strategy-d7)).

| Persona | Demo(s) | Functional role | Country queue | Licences | Group / scope |
|---|:-:|---|:-:|---|---|
| **Astrid Lindgren** — 38, senior caseworker, Stockholm | D1 · D5 · D6 | Caseworker | 🇸🇪 SE | D365 Customer Service Enterprise · Copilot for Service · Power Apps (per-app) | `udcsp-caseworkers-se` |
| **Caseworker DK** *(implicit in D3 — receives Maria's case translated to DA)* | D3 | Caseworker | 🇩🇰 DK | D365 Customer Service Enterprise · Copilot for Service | `udcsp-caseworkers-dk` |
| **Caseworker NO** *(implicit in D2 — warm transfer target)* | D2 | Caseworker | 🇳🇴 NO | D365 Customer Service Enterprise · Copilot for Service | `udcsp-caseworkers-no` |
| **Hans Bjerg** — Data Protection Officer, Danish administration | D7 | DPO | 🇩🇰 DK *(scoped)* | Microsoft Purview Compliance Reader · Microsoft Priva DSR Operator | `udcsp-dpo` |
| **Ingrid Olsen** — SOC analyst, federation security ops | D8 | SOC analyst | 🇪🇺 federation-wide | Microsoft Sentinel Reader/Responder · Defender for Cloud Reader | `udcsp-soc` |
| **Henrik Lund** — CIO, federated programme | D9 | Executive / governance | 🇪🇺 federation-wide | Power BI Pro · Fabric Capacity Viewer | `udcsp-execs` |
| **Ole Sørensen** — DevOps engineer evaluating UDCSP for adoption | D10 | Platform engineer / SRE | 🇪🇺 federation-wide | Owner on the sandbox subscription · Azure DevOps contributor | `udcsp-platform-engineers` |

### TL;DR — minimum workforce accounts

7 accounts in the UDCSP system tenant:

- 3 caseworkers — Astrid (SE) + 1 DK + 1 NO
- 1 DPO — Hans
- 1 SOC analyst — Ingrid
- 1 CIO — Henrik
- 1 DevOps — Ole

---

## 🤖 Persona-less actors (mentioned in `uses.md` but not human accounts)

These are **agents** or **services**, not users — listed here to avoid confusion when scanning the demo scripts.

| Actor | Demo(s) | Where it lives |
|---|:-:|---|
| **Eligibility Pre-Assessor** (Foundry agent) | D1 · D6 | Foundry project `udcspai/udcsp` — agent name `udcsp-eligibility:2`. Identity = Foundry project's managed identity. |
| **Citizen Assistant** (Foundry agent) | D1 · D2 · D3 · D8 | Foundry agent `udcsp-citizen-assistant:1`. |
| **Topic Router** (Foundry agent) | every chat / voice flow | Foundry agent `topic-router:1`. |
| **Document Extractor** (Foundry agent) | D3 · D4 | Foundry agent `udcsp-doc-extractor:1`. |
| **Translator** (Foundry agent) | D1 · D3 · D5 | Foundry agent `udcsp-translator:1`. |
| **Caseworker Helper** (Foundry agent) | D5 · D6 | Foundry agent `udcsp-caseworker-helper:2`. |
| **Classifier** (Foundry agent) | every intake | Foundry agent `udcsp-classifier:1`. |
| **APIM system MI** | every API call | Subscription-scoped MI on `udcsp-{country}-prod-apim`. Application User in Dataverse `org939d8f07`. |
| **Logic Apps system MI** | every case write | Per-LA system-assigned MI on `udcsp-{country}-dev-application-intake`. Application User in Dataverse with **System Customizer + Basic User** roles. |

---

## 🔧 Provisioning order (recommended)

1. **Workforce tenant first** — caseworker groups must exist before D365 security roles can be assigned.
2. **CIAM tenants** — citizen accounts can be created any time after the SPA app registration is in place ([`installation.md` § Step 2](../tech/installation.md)).
3. **Foundry agents** — already provisioned by `Install-Foundry.psm1`; re-create only if the project endpoint changes (see [`docs/tech/inprogress.md` § Foundry agents](../tech/inprogress.md#foundry-agents-dkseno--same-project-new-agents-v1-api)).
4. **Verified ID issuance** — only required to demo the D1 cross-border auto-onboarding step into the SE tenant.

---

## 🔗 See also

| Doc | What it covers |
|---|---|
| 📖 [`uses.md`](./uses.md) | The 10 end-to-end demo scripts these personas play. |
| 🪪 [`../tech/architecture.md` § 4](../tech/architecture.md#4-identity-federation-detail) | Identity federation — citizen CIAM vs workforce Entra ID, eID broker layer, per-country tenants. |
| 🛠️ [`../tech/installation.md`](../tech/installation.md) | App registrations, redirect URIs, Application Users in Dataverse, role assignments. |
| 🧑‍💼 [`./caseworker.md`](./caseworker.md) | Caseworker channel deep-dive — D365 + Copilot for Service. |
