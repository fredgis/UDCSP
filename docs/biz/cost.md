<div align="center">

# 💶 UDCSP — Cost to Run

### *What the platform costs at rest, and what it costs at national scale*

*A non-technical, FinOps view of the run-rate — what is a fixed platform floor, what scales with citizens, and why the cost per citizen falls sharply as the platform grows.*

[![Scale](https://img.shields.io/badge/📈_Scale-10k_→_1M_per_country-1565C0?style=for-the-badge)](#)
[![Run--rate](https://img.shields.io/badge/💶_Run--rate-€60k_→_€749k_/_month-2E7D32?style=for-the-badge)](#)
[![Per_citizen](https://img.shields.io/badge/👤_Per_citizen-€24_→_€3_/_year-E65100?style=for-the-badge)](#)
[![Economies](https://img.shields.io/badge/⚖️_Unit_cost-↓_8×_with_scale-AD1457?style=for-the-badge)](#)

[![Pricing](https://img.shields.io/badge/💱_Prices-Indicative_·_EUR_·_list-5E35B1?style=flat-square)](#)
[![Region](https://img.shields.io/badge/🌍_Regions-North_·_West_Europe-00796B?style=flat-square)](#)
[![Reservations](https://img.shields.io/badge/🏷️_Reservations-−30%25_to_−40%25_achievable-FF6F00?style=flat-square)](#)
[![Sovereign](https://img.shields.io/badge/🛡️_Per_country-DK_·_SE_·_NO-37474F?style=flat-square)](#)

</div>

---

> [!IMPORTANT]
> **TL;DR.** UDCSP has a **fixed platform floor** — the always-on cost of running three sovereign zones (gateway, firewalls, identity, security, integration, analytics) — and a **variable layer** that grows with citizen activity (AI capacity, caseworker licences, communications, telemetry). At a 10 000-citizen-per-country pilot the floor dominates, so each citizen looks "expensive" (**≈ €24 / citizen / year**). As the platform grows to **1 000 000 citizens per country**, that same floor is spread across 100× more people and the unit cost collapses to **≈ €3 / citizen / year** — an **8× improvement** in cost efficiency. The two biggest variable lines at national scale are **reserved AI capacity (PTU)** and **Dynamics 365 caseworker licences**; the most usage-sensitive line is **SMS**, which is why the platform prefers push and email.
>
> | Tier | Citizens / country | Total citizens | Run-rate / month | Run-rate / year | Per citizen / year |
> |---|--:|--:|--:|--:|--:|
> | 🟢 **Pilot** | 10 000 | 30 000 | **≈ €60 k** | ≈ €0.72 M | **≈ €24** |
> | 🟡 **Regional** | 100 000 | 300 000 | **≈ €144 k** | ≈ €1.73 M | **≈ €5.8** |
> | 🔵 **National** | 1 000 000 | 3 000 000 | **≈ €749 k** | ≈ €9.0 M | **≈ €3.0** |
>
> *All figures are **indicative list prices** (EUR, North/West Europe, 2026), before Microsoft Customer Agreement discounts, Azure Reservations and Savings Plans — which typically remove a further **30–40 %** from the compute and AI lines. This is a **run-rate** (steady-state operating cost); one-time build, migration and certification costs are out of scope (see §8).*

---

## 📑 Table of contents

1. [How to read this document](#1-how-to-read-this-document)
2. [The activity model — from citizens to load](#2-the-activity-model--from-citizens-to-load)
3. [Where the cost comes from — the ten cost centres](#3-where-the-cost-comes-from--the-ten-cost-centres)
4. [Cost at three scales](#4-cost-at-three-scales)
5. [Fixed floor vs variable layer](#5-fixed-floor-vs-variable-layer)
6. [Why unit cost falls — economies of scale](#6-why-unit-cost-falls--economies-of-scale)
7. [The levers — how we keep the bill down](#7-the-levers--how-we-keep-the-bill-down)
8. [What this estimate does NOT include](#8-what-this-estimate-does-not-include)
9. [Assumptions register](#9-assumptions-register)

---

## 1. How to read this document

This is a **business** estimate, not a billing quote. It answers three executive questions:

- **"What does it cost to keep the lights on?"** — the fixed platform floor (§5).
- **"What happens to the bill when usage grows 100×?"** — the scale table (§4).
- **"Is it efficient?"** — the per-citizen unit cost and the levers that drive it down (§6, §7).

Three deployment tiers anchor the estimate. They are not three different products — they are **the same platform** sized for three population bands:

| Tier | Per country | Total (DK + SE + NO) | Monthly active citizens (MAU, ≈ 40 %) | Peak concurrent sessions |
|---|--:|--:|--:|--:|
| 🟢 **Pilot** | 10 000 | 30 000 | ≈ 12 000 | ≈ 240 |
| 🟡 **Regional** | 100 000 | 300 000 | ≈ 120 000 | ≈ 2 400 |
| 🔵 **National** | 1 000 000 | 3 000 000 | ≈ 1.2 M | ≈ 24 000 |

> **Why MAU and concurrency matter more than "registered users".** You do not pay for a citizen who never logs in. The cost drivers are **monthly active citizens** (identity, AI, communications) and **peak concurrency** (how much capacity you must reserve). We assume 40 % of registered citizens are active in a given month, and that peak concurrency is ≈ 2 % of MAU — both conservative for digital government.

---

## 2. The activity model — from citizens to load

Cost follows behaviour. The estimate turns "a citizen" into a measurable monthly load using one transparent set of per-active-citizen assumptions:

| Activity | Per active citizen / month | What it drives | Cost centre |
|---|--:|---|---|
| 💬 AI assistant conversations | 0.8 (≈ 6 turns each) | Token + reserved AI capacity | AI & Foundry |
| 📞 Voice (PSTN) calls | 0.06 (≈ 4 min) | Realtime AI capacity + telephony | AI, Communications |
| 📲 SMS (status + OTP) | 0.6 | Per-message telephony | Communications |
| 📧 Email (notifications) | 1.0 | Per-message + storage | Communications |
| 🧾 Eligibility assessments | 0.15 | Strong-model + Confidential Compute | AI & Foundry |
| 📄 Documents extracted | 0.30 | Small-model + Document Intelligence | AI & Foundry |
| 🧑‍💼 Escalations to a caseworker | ≈ 4 % of conversations | D365 licences + Dataverse | Dynamics 365 |

From these, the load at each tier is:

| Load (per month) | 🟢 Pilot | 🟡 Regional | 🔵 National |
|---|--:|--:|--:|
| AI conversation **turns** | ≈ 58 k | ≈ 0.58 M | ≈ 5.8 M |
| Voice **minutes** | ≈ 2.9 k | ≈ 29 k | ≈ 288 k |
| SMS sent | ≈ 7 k | ≈ 72 k | ≈ 720 k |
| Eligibility assessments | ≈ 1.8 k | ≈ 18 k | ≈ 180 k |
| Caseworkers needed (with multilingual + shift cover) | ≈ 20 | ≈ 150 | ≈ 1 000 |

The **AI brain** keeps cost flat per turn by routing cheap work to a small model. Only the assistant, eligibility, translation and caseworker-helper run on the **strong** model; the topic-router, classifier and document-extractor run on **`gpt-5.4-mini`**, which is roughly an order of magnitude cheaper per token (see [`ai.md`](./ai.md) §13).

---

## 3. Where the cost comes from — the ten cost centres

Every deployed service maps to one of ten cost centres. The table names the **real services** in the repository (`infra/`, `services/`, `apps/`) so each line is auditable.

| # | Cost centre | What is inside | Scales with |
|:-:|---|---|---|
| 1 | 🧠 **AI & Foundry** | Azure AI Foundry (3 hubs) · Azure OpenAI **PTU** pools for `gpt-5.4` (assistant, eligibility, translator, caseworker-helper) and `gpt-realtime` (voice) · pay-as-you-go `gpt-5.4-mini` (router, classifier, doc-extractor) · Content Safety · Document Intelligence | Peak concurrency + turns |
| 2 | 🧑‍💼 **Dynamics 365 & Power Platform** | D365 Customer Service Enterprise · Copilot for Service · Dataverse capacity · model-driven caseworker Power App | Caseworker headcount |
| 3 | 🛡️ **Network & Security** | Front Door Premium + WAF · Azure Firewall Premium (1 / zone) · DDoS Protection Standard · Bastion Standard · Defender for Cloud · Sentinel · Entra Permissions Management (CIEM) | Floor + resource count |
| 4 | ⚙️ **Compute & Integration** | API Management Premium (VNet, multi-region) · Logic Apps Standard · Azure Functions · Confidential Compute (eligibility enclave) | Floor + throughput |
| 5 | 🗄️ **Data & Caching** | PostgreSQL Flexible (HA / zone) · Redis Enterprise · ADLS / Blob storage · Confidential Ledger | Data volume |
| 6 | 🔭 **Observability** | Log Analytics + Application Insights ingestion (3 zones) | Telemetry volume |
| 7 | 📡 **Communications** | Azure Communication Services — PSTN voice, SMS, email + phone-number rental | Messages + minutes |
| 8 | 📊 **Analytics** | Microsoft Fabric capacity (F-SKU) · Power BI Premium semantic models (internal) | Data + report users |
| 9 | 🪪 **Identity** | Entra External ID (per-country, MAU-billed) · Entra ID P2 (workforce) · Verified ID | MAU + workforce |
| 10 | 📒 **Governance** | Microsoft Purview · Microsoft Priva (DSR + privacy risk) | Catalogue + subjects |

---

## 4. Cost at three scales

Indicative **monthly** run-rate by cost centre (EUR, list price, rounded). The arithmetic behind each line is the activity model in §2 applied to the unit prices in §9.

| Cost centre | 🟢 Pilot | 🟡 Regional | 🔵 National |
|---|--:|--:|--:|
| 🧠 AI & Foundry | 23 500 | 59 700 | 363 000 |
| 🧑‍💼 Dynamics 365 & Power Platform | 2 400 | 16 250 | 110 000 |
| 🛡️ Network & Security | 12 700 | 22 500 | 66 000 |
| ⚙️ Compute & Integration | 10 400 | 12 900 | 38 800 |
| 🗄️ Data & Caching | 3 750 | 8 700 | 39 900 |
| 🔭 Observability | 2 500 | 8 000 | 45 000 |
| 📡 Communications | 900 | 4 840 | 36 200 |
| 📊 Analytics | 1 900 | 4 250 | 16 600 |
| 🪪 Identity | 270 | 2 200 | 20 350 |
| 📒 Governance | 2 000 | 4 500 | 13 000 |
| **Total / month** | **≈ €60 k** | **≈ €144 k** | **≈ €749 k** |
| **Total / year** | **≈ €0.72 M** | **≈ €1.73 M** | **≈ €9.0 M** |
| **Per citizen / year** | **≈ €24** | **≈ €5.8** | **≈ €3.0** |
| **Per active citizen / month** | **≈ €5.0** | **≈ €1.20** | **≈ €0.62** |

```mermaid
xychart-beta
    title "Cost per citizen per year (EUR) — falls as the platform scales"
    x-axis ["Pilot 30k", "Regional 300k", "National 3M"]
    y-axis "EUR / citizen / year" 0 --> 26
    bar [24, 5.8, 3.0]
```

---

## 5. Fixed floor vs variable layer

Not every euro behaves the same way. Some cost is **fixed** — you pay it whether one citizen logs in or a million do, because it is the price of running three sovereign, private, regulated zones. The rest is **variable** — it tracks usage.

| Behaviour | What is in it | 🟢 Pilot | 🔵 National |
|---|---|--:|--:|
| 🧱 **Fixed platform floor** | Gateway, firewalls, DDoS, Bastion, base AI reservation, core data tier, base analytics, governance | ≈ €45 k / mo | ≈ €120 k / mo |
| 📈 **Variable with usage** | AI tokens & extra PTU, caseworker licences, communications, telemetry, External-ID MAU | ≈ €15 k / mo | ≈ €629 k / mo |

```mermaid
pie showData
    title National tier (€749 k / month) — where the money goes
    "AI & Foundry" : 363
    "Dynamics 365" : 110
    "Network & Security" : 66
    "Observability" : 45
    "Data & Caching" : 40
    "Compute & Integration" : 39
    "Communications" : 36
    "Identity" : 20
    "Analytics" : 17
    "Governance" : 13
```

The story the chart tells: at national scale the bill is dominated by **reserved AI capacity** and **caseworker licences** — both of which are *value* lines (they are the citizen assistant and the humans who keep the AI accountable), not waste. Everything else is a thin, well-controlled tail.

---

## 6. Why unit cost falls — economies of scale

The headline is the slope, not the absolute number. From pilot to national the platform serves **100× more citizens per country** but the bill grows only **≈ 12×** — because the fixed floor is paid once and then amortised.

| Metric | 🟢 Pilot | 🟡 Regional | 🔵 National | Pilot → National |
|---|--:|--:|--:|:-:|
| Citizens served | 30 000 | 300 000 | 3 000 000 | **×100** |
| Run-rate / year | €0.72 M | €1.73 M | €9.0 M | **×12.5** |
| **Per citizen / year** | €24 | €5.8 | €3.0 | **÷8** |

This is the answer to *"can a citizen platform be affordable?"* — **yes, if it is built once and scaled, not rebuilt per service.** The same three sovereign zones, the same AI brain, the same gateway carry the 47 services the case study targets and the hundreds a national rollout would add (see the *Scaling to thousands of services* slides and [`architecture.md`](../tech/architecture.md)).

---

## 7. The levers — how we keep the bill down

The estimate above is **list price with no optimisation**. Each lever below is already designed into the platform (`architecture.md` §11.6 FinOps, `ai.md` §13):

| 🎚️ Lever | What it does | Typical saving |
|---|---|--:|
| 🏷️ **Reservations & Savings Plans** | 1- or 3-year commitment on PTU, App Service, PostgreSQL, Fabric | **−30 % to −40 %** on those lines |
| 🧠 **Model routing (mini-first)** | Cheap `gpt-5.4-mini` handles routing/classification/extraction; the strong model is reserved for reasoning | ≈ 10× cheaper per routed token |
| 📐 **PTU right-sizing to peak** | Reserve AI capacity to *peak concurrency*, autoscale pay-as-you-go for spikes only | Avoids over-provisioning the 98 % off-peak |
| 📲 **Push & email before SMS** | SMS is the most usage-sensitive line; prefer in-app push and email, keep SMS for OTP/critical | Can halve the Communications line |
| 🔭 **Telemetry sampling & tiering** | Adaptive sampling in App Insights, basic-tier logs, archive to cheap storage | −40 % to −60 % on Observability at scale |
| 📊 **Fabric capacity right-sizing** | One F-SKU sized per tier (F16 → F32 → F64), pause dev capacities | Match analytics spend to refresh load |
| 🧰 **Dev/test scales to zero** | Logic Apps Consumption + serverless in non-prod; PTU only in prod | Non-prod ≈ a fraction of prod |
| 🏷️ **Tag-enforced showback** | Every resource tagged `country` / `workload` / `cost-center`; the build **fails** if an agent exceeds its token budget | Stops cost drift before it ships |

> Applied together, these levers realistically take the **National** run-rate from the **≈ €9.0 M / year** list figure toward **≈ €5.5–6.5 M / year** committed — without changing a line of citizen-facing behaviour.

---

## 8. What this estimate does NOT include

To stay honest, the run-rate **excludes** the following — they are real, but they are not monthly platform-operation cost:

- **One-time build & migration** — the engineering already done (see *built by an agent swarm*), plus integration with each national authority's legacy registers (the adapters in [`architecture.md`](../tech/architecture.md) §2.3).
- **Microsoft licensing baselines** not driven by citizens — e.g. workforce Microsoft 365, Power Platform per-app fall-backs in degraded mode.
- **Support plan** — Microsoft Unified support is typically a percentage of annual Azure consumption.
- **Data egress between continents** — by design, raw data never leaves its country, so cross-border egress is intentionally near-zero; only aggregated server-side semantic models cross for the executive view.
- **Certification & audit** — EU AI Act conformity assessment, third-party WCAG and penetration testing, ISO 27001 / SOC 2 audit fees.
- **FX and price drift** — Azure list prices move; treat every figure as ± a band, not a quote.

---

## 9. Assumptions register

Every number above is reproducible from these inputs. Prices are **indicative list, EUR, North/West Europe, 2026**.

| Assumption | Value | Note |
|---|--:|---|
| Active share of registered citizens (MAU) | 40 % | Conservative for digital government |
| Peak concurrency | 2 % of MAU | Drives reserved capacity |
| AI conversations / active citizen / month | 0.8 | ≈ 6 turns each |
| Strong model (`gpt-5.4`) capacity | PTU pools, peak-sized per hub | Reserved monthly |
| Small model (`gpt-5.4-mini`) | Pay-as-you-go tokens | ≈ €0.15 in / €0.60 out per 1M tokens |
| PTU unit price | ≈ €260 / PTU / month | Monthly reservation |
| Content Safety | ≈ €0.70 / 1 000 records | In + out checked |
| Entra External ID | First 50 000 MAU / tenant free, then ≈ €0.003 / MAU | 3 tenants (one per country) |
| D365 Customer Service Enterprise | ≈ €95 / caseworker / month | Copilot for Service included |
| SMS (Nordic A2P) | ≈ €0.045 / message | Most usage-sensitive line |
| Voice (PSTN inbound) | ≈ €0.0075 / minute + number rental | Realtime AI on PTU |
| Fabric capacity | F16 (Pilot) · F32 (Regional) · F64 (National) | Reserved |
| Reservations / Savings Plans | −30 % to −40 % on committed lines | Not applied to headline totals |

> **See also:** [`ai.md`](./ai.md) (capacity & token model) · [`architecture.md`](../tech/architecture.md) §11.6 (FinOps controls) · [`datacompliance.md`](./datacompliance.md) (why three sovereign zones are non-negotiable) · the *Scaling to thousands of services* slides in the deck.

---

<div align="center">

*Indicative figures for executive planning. For a binding estimate, model the target tenant in the [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/) with the assumptions in §9.*

</div>
