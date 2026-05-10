<div align="center">

# 📋 Case Study 11

### Unified Digital Citizen Services Platform for Scandinavian Public Administration

*The original Microsoft case-study brief — verbatim, immutable, the source of truth that everything else in this repository answers to.*

[![Case Study](https://img.shields.io/badge/📋_Case_Study-11-1565C0?style=for-the-badge)](#)
[![Industry](https://img.shields.io/badge/🏛️_Industry-Public_Sector-2E7D32?style=for-the-badge)](#)
[![Region](https://img.shields.io/badge/🌍_Region-DK_·_SE_·_NO-AD1457?style=for-the-badge)](#)
[![Compliance](https://img.shields.io/badge/🛡️_Compliance-GDPR_·_EU_AI_Act-C62828?style=for-the-badge)](#)

[![Citizens](https://img.shields.io/badge/👥_Citizens-2.1M-E65100?style=flat-square)](#)
[![Languages](https://img.shields.io/badge/🗣️_Languages-12-5E35B1?style=flat-square)](#)
[![Processing](https://img.shields.io/badge/⚡_Processing-28d_→_4d-00796B?style=flat-square)](#)
[![Portals](https://img.shields.io/badge/🏛️_Portals-47_→_1-FF6F00?style=flat-square)](#)

</div>

---

> [!IMPORTANT]
> **This document is immutable.** It is the verbatim case-study brief delivered as input to the team. Every other file in this repository (`README.md`, `docs/tech/architecture.md`, `docs/biz/ai.md`, `docs/biz/uses.md`, `docs/biz/recipe.md`, `docs/tech/plan.md`, `docs/tech/installation.md`, `docs/tech/agents.md`) is a *response* to this brief — and must remain consistent with it.

---

## 📑 At a Glance

| | | | |
|---|---|---|---|
| **Industry** | Public Sector & Government | **Headquarters** | Denmark |
| **Operating Region** | Denmark, Sweden, and Norway | **Regulatory Context** | GDPR · EU AI Act · Sector-specific EU Directives |

---

## 🧩 Business Challenge

Three Nordic governments participating in a cross-border digital government initiative operate **47 citizen-facing service portals**, each built on different legacy platforms.

**Key challenges include:**

- 📝 Citizens required to submit identical personal data to multiple agencies for cross-border services
- ⏳ Back-office processing of residency, tax, and social benefit applications averaging **28 days**
- 🔓 No shared identity federation across the three countries
- ⚖️ National data protection authorities imposing different interpretations of data sharing rules
- ♿ Accessibility compliance gaps affecting citizens with disabilities

---

## 🎯 Transformation Objective

Create a federated digital citizen services platform that enables cross-border service delivery, automates back-office processing, and provides inclusive, accessible experiences within national sovereignty frameworks.

---

## ☁️ Azure Services

| | |
|---|---|
| Azure Active Directory B2C | Microsoft Entra ID |
| Azure OpenAI | Microsoft Fabric |
| Dynamics 365 Customer Service | Azure API Management |
| Microsoft Purview | Power BI |
| Azure Logic Apps | |

> [!NOTE]
> **Azure AD B2C** is listed verbatim in the brief. Microsoft retired it for new customers on **May 1, 2025**; UDCSP substitutes **Microsoft Entra External ID for customers** as the strict successor product. The substitution is documented in [`../tech/architecture.md` § 14 — Identity deviation from the case study's B2C mandate](../tech/architecture.md#identity-deviation-from-the-case-studys-b2c-mandate). All other services are honoured exactly as listed.

---

## 🚀 Expected Outcomes

Application processing time reduced from **28 days to 4 days**, citizen satisfaction scores increased by **38 %**, cross-border identity federation established for **2.1 million citizens**, full **WCAG 2.1 AA** accessibility compliance achieved.

---

## 🤖 AI Infusion Point

An **AI application processing engine** classifies and routes citizen requests in **12 languages**. A **GenAI citizen assistant** answers service queries in natural language across web, mobile, and telephone channels. An **automated eligibility determination model** pre-assesses benefit entitlements before human review.

---

<div align="center">

*This brief is the contract. Everything in this repository is built to satisfy it.* 🇩🇰 🇸🇪 🇳🇴

</div>