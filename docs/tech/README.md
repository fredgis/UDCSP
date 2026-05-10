<div align="center">

# ⚙️ UDCSP — Technical Documentation

### *What* is built · *How* it fits together · *How* to install, operate, recover

[![Docs](https://img.shields.io/badge/📑_Docs-7-1565C0?style=for-the-badge)](#)
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

> Authoritative source: [`architecture.md` § 14](./architecture.md#14-service-inventory). The list below is a quick map; rationale and Bicep paths are in §14.

### ✅ The 9 mandatory (case-study)

| # | Service | Role |
|:-:|---|---|
| 1 | **Microsoft Entra External ID** | CIAM citoyen — 1 CIAM tenant per country (DK / SE / NO). Substitutes Azure AD B2C (retired 2025-05-01). |
| 2 | **Microsoft Entra ID** | Workforce identity (caseworkers, SREs). |
| 3 | **Azure OpenAI** *(via Foundry)* | LLMs (GPT-4o, GPT-4o Realtime, embeddings). |
| 4 | **Microsoft Fabric** | Federated lakehouse + analytics, one workspace per country. |
| 5 | **Dynamics 365 Customer Service** | Case management, omnichannel, Copilot for Service. |
| 6 | **Azure API Management** | Single API front door for the 47 consolidated portals. |
| 7 | **Microsoft Purview** | Data governance, DPIAs, AI Act registry. |
| 8 | **Azure Logic Apps** | Business orchestration, GDPR erase, archive handover. |
| 9 | **Power BI Premium** | Internal ops / executive / auditor dashboards. |

### ➕ The 30 additional services

| Domain | Services |
|---|---|
| 🧠 **AI & conversation** | Microsoft Foundry (agents · evals · tracing · `topic-router`) · Azure AI Speech · Translator · Document Intelligence · Content Safety · AI Search |
| 🌐 **Edge & front** | Azure Front Door + WAF · **Azure DDoS Protection Standard** *(post-audit, NIS2)* · Azure Static Web Apps |
| ⚙️ **Compute & messaging** | Azure Container Apps · **Azure Confidential Container Apps** *(post-audit — TEE for Eligibility, AI Act high-risk)* · Azure Functions · Azure Service Bus · Azure Event Grid · Azure Communication Services (+ Event Capture) |
| 💾 **Data** | Azure Database for PostgreSQL Flexible *(replaces SQL DB + Cosmos DB)* · Azure Cache for Redis *(topic-router sessions)* · Azure Storage / ADLS Gen2 *(3 accounts per country)* |
| 🛡️ **Security & compliance** | **Azure Confidential Ledger** *(AI Act Art. 26(6) tamper-evident log)* · **Azure Backup + Site Recovery** *(BCDR — RPO 15 min / RTO 4 h)* · **Azure Chaos Studio** *(proves 99.9 % SLO)* · **Azure Bastion Standard** *(sole admin shell path)* · **Microsoft Entra Permissions Management (CIEM)** · **Microsoft Entra Verified ID** *(EUDI Wallet / eIDAS 2.0)* · **Microsoft Priva** *(GDPR DSR system-of-record)* · Microsoft Defender for Cloud · **Microsoft Defender for APIs** · Microsoft Sentinel · Azure Key Vault · Azure Policy + Blueprints |
| 📊 **Observability** | Azure Monitor · Log Analytics · Application Insights |
| 🏗️ **DevOps & IaC** | Azure Container Registry · Azure Bicep |

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
