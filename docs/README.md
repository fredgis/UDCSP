<div align="center">

# 📂 UDCSP — Documentation Hub

### *Business* documentation · *Technical* documentation · One repo, two audiences

[![Folders](https://img.shields.io/badge/📁_Folders-2-1565C0?style=for-the-badge)](#)
[![Docs](https://img.shields.io/badge/📑_Docs-28-2E7D32?style=for-the-badge)](#)

</div>

---

> **Status vocabulary used across the documentation set:** 🟢 **Live** (deployed and exercised end to end) · 🟡 **Partially deployed** (limited to some countries or paths) · 🔵 **In repo** (code exists, not deployed) · ⚙️ **Scripted** (an installer phase or patch deploys it, not yet validated here) · 🗺️ **Roadmap** (designed, not built).
>
> [`tech/inprogress.md`](./tech/inprogress.md) is the **source of truth for status**. Where a document and the tracker disagree, the tracker wins.

---

## 🗂️ Browse the docs

| Folder | For whom | What you'll find |
|---|---|---|
| 📚 [`biz/`](./biz/) | Business stakeholders, evaluators, PMs, demoers | The case-study brief, the 7 channels, the AI architecture (business view), the decision trail, data-compliance map, cost model, demo scenarios, acceptance recipe. **17 docs.** |
| ⚙️ [`tech/`](./tech/) | Engineers, SREs, security & compliance auditors | The deep-dive architecture, data & retention truth, network truth, monitoring, install guide, demo-readiness tracker, build history, DR runbook. **11 docs.** |

---

## 🧭 Read these three first

| Doc | Why |
|---|---|
| 📋 [`biz/case-study-11.md`](./biz/case-study-11.md) | The verbatim brief the platform answers. |
| 🏛️ [`tech/architecture.md`](./tech/architecture.md) | What was built, layer by layer. |
| 📌 [`tech/inprogress.md`](./tech/inprogress.md) | What actually runs today, demo by demo. |

---

## 📦 Where the implementation lives

The documentation describes these folders; the code is the proof.

| Folder | What it holds |
|---|---|
| 🏗️ [`../infra/`](../infra/) | Bicep for every sovereign zone: landing zone, identity, security, observability, data. |
| 🧠 [`../foundry/`](../foundry/) | The 7 Foundry agents (topic-router plus 6 specialists), shared prompts, evaluation suites, golden datasets. |
| 🔌 [`../services/`](../services/) | API Management APIs and policies, Logic Apps workflows, Functions and Container Apps. |
| 💻 [`../apps/`](../apps/) | Web portal, mobile shell, voice orchestrator, Dataverse and Power Apps caseworker artefacts. |
| 🛡️ [`../governance/`](../governance/) | Purview classifications, AI Act registry, Priva, GDPR records, identity readiness. |
| 🧪 [`../tests/`](../tests/) | Playwright scenarios, evaluation pipelines, accessibility, load and security suites. |
| 🩹 [`../patch/`](../patch/) | Idempotent operational fixes not yet folded into the IaC. `Enable-PrivateUploadPath.ps1` is **mandatory** after a fresh install. |
| ⚙️ [`../scripts/`](../scripts/) | The installer, the dev bootstrap and the cleanup scripts. |

---

## 🔗 See also

| Where | What |
|---|---|
| 🏠 [`../README.md`](../README.md) | Repo entry point — start here if you're new. |
