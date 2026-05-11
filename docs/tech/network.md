# 🌐 Network Architecture

> **Every packet's path, every private endpoint, every NSG, every public IP.** Companion to [`architecture.md`](./architecture.md) (the *what is built*) and [`data.md`](./data.md) (the *where bytes live*). This document is the **network truth**: 3 sovereign spokes, 1 optional federation hub, 18 named subnets, ~25 private endpoints, 1 public IP per country (Bastion only), 0 shared data path.

---

> [!IMPORTANT]
> **TL;DR.** Each country (DK · SE · NO) runs in its own `/16` spoke VNet, in its own Azure region, in its own RG. Every PaaS that touches citizen data is reached via **Private Endpoint** with `publicNetworkAccess: Disabled`. The **only public IP per country** is the Azure Bastion PIP — all admin access funnels through it (no jump-box, no public NICs). The **LandingZone module is the single ARM owner of every subnet** (including `AzureBastionSubnet`); all downstream modules reference subnets via `existing` to keep redeploys idempotent. One **Azure DDoS Protection Standard** plan covers all 3 spokes via one association per VNet.
>
> 📐 The accompanying schematic is generated from [`network.drawio`](./network.drawio) and exported below as [`network.png`](./network.png). Re-render with the `drawio2png` skill if you edit the source.
>
> 🔧 **Owner:** Landing Zone module · **Implemented in:** `infra/landing-zone/modules/networking.bicep` · **Last reviewed:** 2026-05-11.

![UDCSP network topology](./network.png)

---

## 📑 Table of contents

1. [Design principles](#1-design-principles)
2. [Address plan](#2-address-plan)
3. [Topology overview](#3-topology-overview)
4. [Connectivity matrix](#4-connectivity-matrix)
5. [Private Endpoint inventory](#5-private-endpoint-inventory)
6. [Azure Bastion — sole admin shell path](#6-azure-bastion--sole-admin-shell-path)
7. [DDoS protection](#7-ddos-protection)
8. [Identity & cross-tenant flows](#8-identity--cross-tenant-flows)
9. [Idempotency guardrails (lessons learned)](#9-idempotency-guardrails-lessons-learned)
10. [References](#10-references)

---

## 1. Design principles

| # | Principle | Why |
|---|-----------|-----|
| 1 | **Per-country sovereign spoke VNet** | Each citizen-data plane (DK, SE, NO) lives in its own VNet, in its own Azure region, in its own resource group. No cross-country data path at network layer. |
| 2 | **Hub-and-spoke ready** | Each spoke optionally peers to a federation hub VNet (`hubVnetId` parameter) for shared egress, DNS, and inter-country APIs that are explicitly allow-listed. Today the federation hub is not deployed; the parameter is left empty. |
| 3 | **Private endpoints by default** | Every PaaS service that touches citizen data (Key Vault, Storage Account, ACR, PostgreSQL, Redis Enterprise, Recovery Services Vault) has `publicNetworkAccess: Disabled` and is reached via a Private Endpoint inside the spoke. |
| 4 | **One public IP exception: Azure Bastion** | The only public IP per country is the Bastion `pip`. All admin sessions go through Bastion → no jump-box, no NIC-level public IPs anywhere else. Tagged `publicIpException: 'azure-bastion-only'` for Policy enforcement. |
| 5 | **NSG per subnet, not per workload** | Each named subnet (web, app, data, integration, ai) gets its own NSG. Default-deny inbound from Internet; rules are added by capability modules. |
| 6 | **LandingZone owns ALL subnets** | The LZ is the single ARM owner of subnet definitions including `AzureBastionSubnet`. Every other module (Bastion, future Postgres delegated subnet, APIM premium, etc.) references subnets via `existing` so re-deploying the LZ stays idempotent and cannot accidentally drop in-use subnets. |
| 7 | **DDoS Protection Plan attached** | One Azure Standard DDoS Protection Plan covers all 3 spoke VNets (one association per VNet — `infra/security/ddos/vnet-association.bicep`). |

---

## 2. Address plan

The 3 country spokes use disjoint, RFC1918, `/16` blocks. Subnetting is fully derived from the country prefix via `cidrSubnet()` so the layout is identical across countries.

| Country | Region | RG | VNet CIDR |
|---------|--------|----|----|
| DK | `northeurope` | `udcsp-dk-prod-platform-rg` | `10.10.0.0/16` |
| SE | `swedencentral` | `udcsp-se-prod-platform-rg` | `10.20.0.0/16` |
| NO | `norwayeast` | `udcsp-no-prod-platform-rg` | `10.30.0.0/16` |

Inside each spoke (replace `X` with `10`/`20`/`30`):

| Subnet | CIDR | NSG | Purpose | Hosts |
|--------|------|-----|---------|-------|
| `web` | `10.X.1.0/24` | `udcsp-{c}-prod-web-nsg` | Public-facing front door / APIM ingress, Static Web App PEs | Front Door origin PE, Static Web App PE, public TLS termination |
| `app` | `10.X.2.0/24` | `udcsp-{c}-prod-app-nsg` | Containerized workloads (Container Apps env, Functions Premium VNet integration) | Voice Call-Automation, agent runtime, Logic Apps Standard |
| `data` | `10.X.3.0/24` | `udcsp-{c}-prod-data-nsg` | Private Endpoints for stateful PaaS | KV PE, Storage Lake PE, PostgreSQL PE, Redis Enterprise PE, RSV PE, Confidential Ledger PE |
| `integration` | `10.X.4.0/24` | `udcsp-{c}-prod-integration-nsg` | Service Bus / ACR / Event Grid / APIM private endpoints | ACR PE, APIM internal-mode (when applicable), Service Bus PE |
| `ai` | `10.X.5.0/24` | `udcsp-{c}-prod-ai-nsg` | Foundry / Cognitive Services egress, Confidential Compute pools | Foundry PE, Confidential Compute VMSS NICs |
| `AzureBastionSubnet` | `10.X.250.0/26` | (Azure-managed default) | Reserved for Azure Bastion only — name + size mandated by the service | Bastion host NICs |

`privateEndpointNetworkPolicies` is `Disabled` on all 5 named subnets so PEs can be created without NSG-rule rewrites; NSGs still apply to the workload NICs in those subnets.

The Bastion subnet sits at `.250.0/26` (offset index `1000` in `cidrSubnet(addr, 26, 1000)`) — far enough from `.1.0`–`.5.0` to leave room for future workload subnets without re-numbering.

---

## 3. Topology overview

```mermaid
flowchart TB
    Internet(["🌍 Internet<br/>citizens · operators"]):::internet

    subgraph Hub["🔗 Federation Hub VNet · optional · <code>hubVnetId</code> param"]
        direction LR
        HubDNS["🧭 Private DNS<br/>shared zones"]:::hub
        HubEgress["🚪 Shared egress<br/>NAT / Firewall"]:::hub
    end

    subgraph DK["🇩🇰 DK spoke · northeurope · 10.10.0.0/16"]
        direction TB
        DKsubs["web · app · data · integration · ai<br/>10.10.{1..5}.0/24"]:::subnet
        DKbas["🛡️ AzureBastionSubnet<br/>10.10.250.0/26"]:::bastion
    end

    subgraph SE["🇸🇪 SE spoke · swedencentral · 10.20.0.0/16"]
        direction TB
        SEsubs["web · app · data · integration · ai<br/>10.20.{1..5}.0/24"]:::subnet
        SEbas["🛡️ AzureBastionSubnet<br/>10.20.250.0/26"]:::bastion
    end

    subgraph NO["🇳🇴 NO spoke · norwayeast · 10.30.0.0/16"]
        direction TB
        NOsubs["web · app · data · integration · ai<br/>10.30.{1..5}.0/24"]:::subnet
        NObas["🛡️ AzureBastionSubnet<br/>10.30.250.0/26"]:::bastion
    end

    DDoS{{"🛡️ Azure DDoS Protection Standard<br/>1 plan · 3 associations"}}:::ddos

    Internet -- "Front Door · APIM · ACS · Bastion PIP" --> DK
    Internet -- "Front Door · APIM · ACS · Bastion PIP" --> SE
    Internet -- "Front Door · APIM · ACS · Bastion PIP" --> NO

    Hub -. "peering<br/>(when deployed)" .-> DK
    Hub -. "peering<br/>(when deployed)" .-> SE
    Hub -. "peering<br/>(when deployed)" .-> NO

    DDoS --- DK
    DDoS --- SE
    DDoS --- NO

    DK x--x SE
    SE x--x NO
    DK x--x NO

    classDef internet fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#0D47A1
    classDef hub fill:#FFF8E1,stroke:#F9A825,stroke-width:1.5px,color:#E65100
    classDef subnet fill:#E8F5E9,stroke:#2E7D32,stroke-width:1.5px,color:#1B5E20
    classDef bastion fill:#FCE4EC,stroke:#AD1457,stroke-width:1.5px,color:#880E4F
    classDef ddos fill:#EDE7F6,stroke:#4527A0,stroke-width:2px,color:#311B92

    style DK fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style SE fill:#E1F5FE,stroke:#0277BD,stroke-width:2px,color:#01579B
    style NO fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px,color:#E65100
    style Hub fill:#FFFDE7,stroke:#F9A825,stroke-width:2px,color:#F57F17
```

> **Legend** — solid arrows = Internet ingress; dashed arrows = optional hub peering (today `hubVnetId` is empty); `x--x` lines = **no** spoke-to-spoke peering (cross-country flows must traverse the hub when deployed, and are explicitly allow-listed by APIM policy).

The 3 spokes are isolated from each other at L3 — there is no spoke-to-spoke peering. Cross-country flows always traverse the federation hub (when deployed) and are policy-controlled.

---

## 4. Connectivity matrix

### 4.1 Inbound (Internet → spoke)

| Surface | Path | Notes |
|---------|------|-------|
| Citizen web/chat UI | Internet → Azure Front Door (Premium, WAF) → origin = Static Web App PE in `web` subnet | TLS 1.2+; WAF in Prevention mode; Defender for APIs onboarded |
| Citizen voice | Internet → ACS (managed) → Container App Job in `app` subnet | ACS is a Microsoft-hosted PaaS; the App-side runtime is private |
| APIM gateway | Internet → APIM (External, Premium) → backends via VNet integration in `app` / `integration` | APIM rate-limit policy enforced for `/agents/topic-router/messages` (see `services/apim`) |
| Admin (operators only) | Internet → Azure Bastion PIP → SSH/RDP to NICs inside the spoke | Only one public IP per country; Conditional Access + PIM required; tagged `publicIpException: 'azure-bastion-only'` |

### 4.2 Outbound (spoke → Internet / Azure)

- **Default**: NAT Gateway in each spoke for workload egress (planned) — currently Azure default outbound (to be replaced before GA).
- **Private**: Foundry, Storage, KV, ACR, Postgres, Redis, RSV, Confidential Ledger are reached via **Private Endpoint only**; their public endpoints are disabled (`publicNetworkAccess: Disabled`).
- **Microsoft Graph** (Identity / Verified ID / Priva / Purview management): reached via Service Tag rules in NSGs; APIs are public Microsoft endpoints.

### 4.3 East-west (intra-spoke)

- `web` → `app` : APIM dispatch + Front Door origin → containerised agents.
- `app` → `data` : workloads → PEs of KV/Postgres/Redis/Storage.
- `app` → `integration` : workloads → ACR pulls, Service Bus, APIM internal.
- `app` → `ai` : workloads → Foundry PE, Confidential Compute attestation.
- `AzureBastionSubnet` → any : SSH/RDP via Bastion only.

NSG inter-subnet rules are restricted to the explicit pairs above; everything else is denied by the subnet-level NSG.

---

## 5. Private Endpoint inventory

Per country, the LandingZone module creates these PEs out of the box (commit `be46598`):

| Service | Subnet | PE name pattern | DNS zone |
|---------|--------|-----------------|----------|
| Key Vault | `data` | `udcsp-{c}-prod-kv-pe` | `privatelink.vaultcore.azure.net` |
| Storage Lake (ADLS Gen2) | `data` | `udcsp-{c}-prod-lake-pe` | `privatelink.dfs.core.windows.net` |
| Container Registry (ACR Premium) | `integration` | `udcsp-{c}-prod-acr-pe` | `privatelink.azurecr.io` |

Added by capability modules:

| Service | Subnet | Module |
|---------|--------|--------|
| PostgreSQL Flexible | `data` | `infra/data/postgresql/postgresql-flexible.bicep` |
| Redis Enterprise | `data` | `infra/data/redis/redis-enterprise.bicep` |
| Recovery Services Vault | `data` | `infra/security/backup-asr/recovery-services-vault-country.bicep` |
| Confidential Ledger | `data` | `infra/security/confidential-ledger/confidential-ledger.bicep` |
| Foundry / AI Services | `ai` | `infra/foundry/*` |

All PE-fronted resources have `publicNetworkAccess: Disabled` enforced in their bicep.

---

## 6. Azure Bastion — sole admin shell path

- One Bastion **per country** (Standard SKU, IP Connect + native client tunneling enabled).
- One **Standard public IP** per Bastion (`udcsp-{c}-prod-bastion-pip`) — this is the only public IP allowed outside Front Door / APIM.
- Subnet `AzureBastionSubnet` (mandatory name) at `.250.0/26`, owned by the LandingZone (see commit `8ee3227` rationale).
- Tagged `sovereigntyPolicy: 'bastion-public-ip-only'` for Azure Policy detection of any other Public IP creation.

---

## 7. DDoS protection

- One Azure Standard DDoS Protection Plan in the shared platform RG.
- Associated to each of the 3 spoke VNets via `infra/security/ddos/vnet-association.bicep`.
- Covers the Bastion PIP and all future Front Door origin PIPs.

---

## 8. Identity & cross-tenant flows

These are not L3 paths but illustrate the **trust boundaries** that surround the network:

| Flow | Tenant A | Tenant B | Transport |
|------|----------|----------|-----------|
| Citizen sign-in (DK) | `udcspdk.onmicrosoft.com` (External ID CIAM) | UDCSP platform tenant (`MngEnvMCAP294737`) | OIDC over HTTPS via Microsoft Graph endpoints |
| Verified ID issuance | UDCSP platform tenant (issuer authority) | Citizen wallet (any) | DIDComm / OpenID4VC over HTTPS |
| MS Graph admin | UDCSP platform tenant | Microsoft Graph API | HTTPS, Conditional Access |

External ID tenants are **separate Microsoft Entra tenants** with their own boundary — no VNet peering, no Private Endpoint. Communication is exclusively Graph/OIDC over the public Microsoft endpoints from inside the spoke.

---

## 9. Idempotency guardrails (lessons learned)

The most subtle network failure modes the installer has hit (and now guards against):

| Failure | Root cause | Guardrail |
|---------|------------|-----------|
| `InUseSubnetCannotBeDeleted: AzureBastionSubnet` | LZ re-deploy didn't list the Bastion subnet → ARM tried to drop it | LZ now declares `AzureBastionSubnet` inline; Bastion module references it via `existing` (commit `8ee3227`). |
| `InUsePrefixCannotBeDeleted: 10.X.250.0/26` | Different CIDR computed by LZ vs Bastion → ARM tried to change the prefix on an in-use subnet | Both modules now derive the prefix from the same `cidrSubnet(addressPrefix, 26, 1000)` (commit `be46598`). |
| `InUseSubnetCannotBeDeleted: data` (KV/ACR/Lake PEs attached) | Migration from inline to child subnet resources triggered DELETE+CREATE on subnets that already had PEs | Reverted to inline subnets — the LZ is the single ARM owner; no other module re-declares them. |
| Bastion DK deploy lands in SE/NO RGs | Old Bastion bicep iterated over countries inside one deploy | Refactored to single-country (`@allowed(['dk','se','no']) param country`); installer loops per country (commit `552a5aa`). |

---

## 10. References

- `infra/landing-zone/modules/networking.bicep` — VNet + subnets + NSGs + optional hub peering.
- `infra/landing-zone/main.bicep` — orchestrates network + KV PE + Lake PE + ACR PE per country.
- `infra/landing-zone/parameters/{dk,se,no}.bicepparam` — country CIDR + region.
- `infra/identity/bastion/bastion.bicep` — Bastion host + PIP, references `AzureBastionSubnet` via `existing`.
- `infra/security/ddos/{ddos-protection-plan,vnet-association}.bicep` — DDoS plan + per-spoke association.
- `docs/tech/architecture.md` — full platform architecture (this doc is the network-only deep dive).
- `docs/tech/installation.md` — phase ordering and prerequisites; LandingZone is phase A1.
