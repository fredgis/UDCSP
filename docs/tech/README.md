<div align="center">

# ⚙️ UDCSP — Technical Documentation

### *What* is built · *How* it fits together · *How* to install, operate, recover

[![Docs](https://img.shields.io/badge/📑_Docs-8-1565C0?style=for-the-badge)](#)
[![Phases](https://img.shields.io/badge/🛠️_Install_phases-25-2E7D32?style=for-the-badge)](#)
[![Zones](https://img.shields.io/badge/🌍_Sovereign_zones-3-AD1457?style=for-the-badge)](#)
[![Stores](https://img.shields.io/badge/🗄️_Data_stores-25-E65100?style=for-the-badge)](#)

</div>

---

## 🎯 Start here

| Doc | What it is | Read first if you are… |
|---|---|---|
| 🏛️ [`architecture.md`](./architecture.md) | **The platform definition.** Every layer, every sovereignty zone, every AI agent, every governance control. | New to the codebase — read this once. |
| 🗄️ [`data.md`](./data.md) | **Storage truth.** 5 zones · ~25 stores · retention matrix · compliance map. | Anyone touching data, retention, or DSR flows. |
| 🌐 [`network.md`](./network.md) | **Network truth.** 3 sovereign spokes · ~25 private endpoints · 1 public IP per country (Bastion) · DDoS + NSG topology. Includes [`network.drawio`](./network.drawio) schematic. | Anyone wiring a new service into the spoke or troubleshooting connectivity. |
| 🛠️ [`installation.md`](./installation.md) | **Install guide.** 4 collapsible sections (Prerequisites · Mandatory · Optional · Re-run). | About to deploy on a fresh tenant. |

---

## 📜 Build history & rationale

| Doc | What it covers |
|---|---|
| 📝 [`agents.md`](./agents.md) | Multi-agent build log — *who built what, with which model, in how much wall-clock time*. |
| 📐 [`plan.md`](./plan.md) | Original multi-agent build plan (historical). |
| 🔄 [`plan_post_audit.md`](./plan_post_audit.md) | May 2026 stack refactor diff (Verified ID + Priva + Confidential Ledger added; Azure SQL + Cosmos + Copilot Studio + Power BI Embedded removed). |

---

## 🚨 Operate & recover

| Doc | What it covers |
|---|---|
| 🆘 [`runbook-dr.md`](./runbook-dr.md) | Disaster Recovery runbook — twice-yearly drills, per country, with caseworker simulation. |

---

<details>
<summary><h2>☁️ Azure Service Inventory — what UDCSP actually deploys</h2></summary>

**39 services total — 9 mandatory (case-study) + 30 additional.**

> Source of truth for architecture: [`architecture.md` § 14](./architecture.md#14-service-inventory). The tables below add a **deployment-level** column verified against the repo:
>
> - ✅ **Bicep** — `.bicep` template + `az deployment` cabled in an `Install-*.psm1` module → fully automated.
> - ⚠️ **CLI / API** — no Bicep, but the installer drives a third-party CLI or REST API (Foundry CLI, `pac`, `swa`, Microsoft Graph, Fabric REST). Often requires a pre-existing tenant/workspace.
> - ❌ **Manual** — referenced in the architecture, but no deployment code in this repo. Provisioned by hand.

### ✅ The 9 mandatory (case-study)

| # | Service | Role | Deployment |
|:-:|---|---|:-:|
| 1 | **Microsoft Entra External ID** | CIAM citoyen — 1 CIAM tenant per country (DK / SE / NO). Substitutes Azure AD B2C (retired 2025-05-01). | ✅ Bicep |
| 2 | **Microsoft Entra ID** | Workforce identity (caseworkers, SREs). | ⚠️ CLI / API |
| 3 | **Azure OpenAI** *(via Foundry)* | LLMs (GPT-4o, GPT-4o Realtime, embeddings). | ⚠️ CLI / API *(Realtime model has Bicep; rest via Foundry)* |
| 4 | **Microsoft Fabric** | Federated lakehouse + analytics, one workspace per country. | ✅ Bicep *(capacity)* + ⚠️ REST *(content)* |
| 5 | **Dynamics 365 Customer Service** | Case management, omnichannel, Copilot for Service. | ⚠️ `pac` CLI *(solutions only — env pre-exists)* |
| 6 | **Azure API Management** | Single API front door for the 47 consolidated portals. | ✅ Bicep |
| 7 | **Microsoft Purview** | Data governance, DPIAs, AI Act registry. | ✅ Bicep |
| 8 | **Azure Logic Apps** | Business orchestration, GDPR erase, archive handover. | ✅ Bicep |
| 9 | **Power BI Premium** | Internal ops / executive / auditor dashboards. | ❌ Manual |

### ➕ The 30 additional services

| Domain | Service | Deployment |
|---|---|:-:|
| 🧠 **AI** | Microsoft Foundry (`topic-router` agent + downstream agents · evals · tracing) | ⚠️ Foundry CLI |
| | Azure AI Speech *(post-call analytics)* | ✅ Bicep |
| | Azure AI Translator | ❌ Manual *(via Foundry hub)* |
| | Azure AI Document Intelligence | ❌ Manual *(via Foundry hub)* |
| | Azure AI Content Safety | ❌ Manual *(via Foundry hub)* |
| | Azure AI Search | ❌ Manual |
| 🌐 **Edge** | Azure Front Door + WAF | ❌ Manual |
| | Azure DDoS Protection Standard *(post-audit, NIS2)* | ✅ Bicep |
| | Azure Static Web Apps | ⚠️ `swa` CLI |
| ⚙️ **Compute & messaging** | Azure Container Apps *(standard)* | ❌ Manual |
| | **Azure Confidential Container Apps** *(post-audit — Eligibility, AI Act high-risk)* | ✅ Bicep |
| | Azure Functions | ✅ Bicep |
| | Azure Service Bus | ✅ Bicep |
| | Azure Event Grid | ✅ Bicep |
| | Azure Communication Services *(voice + phone numbers)* | ✅ Bicep |
| | Voice orchestrator *(Container App + GPT-4o Realtime)* | ✅ Bicep |
| 💾 **Data** | Azure Database for PostgreSQL Flexible *(replaces SQL DB + Cosmos DB)* | ✅ Bicep |
| | Azure Cache for Redis Enterprise *(topic-router sessions)* | ✅ Bicep |
| | Azure Storage / ADLS Gen2 *(3 accounts per country)* | ✅ Bicep |
| 🛡️ **Security & compliance** | **Azure Confidential Ledger** *(AI Act Art. 26(6))* | ✅ Bicep |
| | **Azure Backup + Site Recovery** *(BCDR — RPO 15 min / RTO 4 h)* | ✅ Bicep |
| | **Azure Chaos Studio** *(proves 99.9 % SLO)* | ✅ Bicep |
| | **Azure Bastion Standard** *(sole admin shell path)* | ✅ Bicep |
| | **Microsoft Entra Permissions Management (CIEM)** | ✅ Bicep |
| | **Microsoft Entra Verified ID** *(EUDI Wallet / eIDAS 2.0)* | ✅ Bicep |
| | **Microsoft Priva** *(GDPR DSR system-of-record)* | ⚠️ Graph API |
| | Microsoft Defender for Cloud | ✅ Bicep |
| | **Microsoft Defender for APIs** | ✅ Bicep |
| | Microsoft Sentinel | ✅ Bicep |
| | Azure Key Vault | ✅ Bicep |
| | Azure Policy + Blueprints | ⚠️ JSON *(initiatives present, manual assignment)* |
| 📊 **Observability** | Azure Monitor · Log Analytics · Application Insights | ✅ Bicep |
| 🏗️ **DevOps & IaC** | Azure Container Registry | ✅ Bicep |
| | Azure Bicep | n/a *(the IaC tool itself)* |

### 📊 Deployment readiness summary

| Level | Count | What it means for an installer run |
|---|:-:|---|
| ✅ Bicep + module | **27** | Fully automated by `Install-UDCSP.ps1`. |
| ⚠️ CLI / API | **7** | Automated, but requires the target tenant / workspace to pre-exist (Foundry, Fabric content, D365 envs, SWA, Priva, Entra ID, Policy assignments). |
| ❌ Manual | **8** | Operator must provision before / outside the installer (Power BI Premium, Front Door, AI Search, AI Translator, AI Document Intelligence, AI Content Safety, Container Apps standard). |

### ❌ Removed in the post-audit refactor

Azure SQL Database · Azure Cosmos DB · Microsoft Copilot Studio · Power BI Embedded (citizen-facing — replaced by Chart.js HTML). Rationale in [`plan_post_audit.md`](./plan_post_audit.md).

### 🤔 Mentioned but not implemented (future considerations)

Camunda 8 (BPMN/DMN) as alternative to D365 + Logic Apps · ServiceNow GovCloud — see footer of root [`README.md`](../../README.md).

</details>

---

## 🔗 See also

| Where | What |
|---|---|
| 📚 [`../biz/`](../biz/) | Business documentation (case study, channels, scenarios, recipe). |
| 🏠 [`../../README.md`](../../README.md) | Repo entry point. |
