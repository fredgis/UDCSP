# UDCSP — Identity providers per sovereign zone

> Anchored on:
> - eIDAS Regulation (EU) 910/2014 (eIDAS-1)
> - eIDAS-2 amending Regulation (EU) 2024/1183 (EUDI-Wallet baseline)
> - Microsoft Entra External ID for citizen federation
>
> Companion: [`eudi-wallet-readiness.md`](eudi-wallet-readiness.md),
> [`docs/tech/architecture.md` §4](../../docs/tech/architecture.md#4-identity--access-zero-trust-for-citizens)

---

## 1. Why a per-country identity broker

Each Nordic country runs its own legally-recognised eIDAS High scheme:

| Country | National scheme | Operator | Notified eIDAS level |
|---|---|---|---|
| Denmark | **MitID**    | MitID-broker A/S (Nets DanID) on behalf of DK Digitaliseringsstyrelsen | High |
| Sweden  | **BankID**   | Finansiell ID-Teknik BID AB (industry consortium) | High |
| Norway  | **Vipps MobilePay BankID** *(formerly BankID NO)* | BankID BankAxept AS / Vipps MobilePay | High (via NO eID notification under eIDAS) |

These are **the only acceptable strong-identity assertions** for new
applications, signing of decisions, and biometric step-ups. Username +
password is **not** offered for citizen flows.

## 2. Federation topology

```
Citizen browser / mobile app
       │  (OIDC `code` flow with PKCE, asssurance‐level claim required)
       ▼
Microsoft Entra External ID  (per-tenant; one tenant per country)
       │  (federated user flow `SignUpSignIn`)
       ▼
Country IdP — MitID broker / BankID Norden / Vipps
       │  (national assurance ceremony — biometric, hardware-bound)
       ▼
Returns signed JWT with: pseudonymous PID, `acr=eidas-high`,
country claim, name, age band — **never** the raw national ID.
```

## 3. Mapping

| External ID claim    | Source                      | Used by             |
|----------------------|-----------------------------|---------------------|
| `sub` (pseudonym)    | Country IdP                 | All UDCSP services  |
| `acr`                | Country IdP                 | RBAC & step-up      |
| `country`            | Tenant alias                | Sovereignty router  |
| `name`               | Country IdP                 | UI, case file       |
| `age_band`           | Country IdP-derived (DPIA)  | Eligibility agent   |
| **(no national ID)** | -                           | -                   |

## 4. Token flow

* OIDC code flow with PKCE, RFC 9126 PAR
* `acr=eidas-high` claim required for any sensitive scope
* Refresh tokens disabled for sensitive scopes — re-auth required

## 5. Caseworker identity

Caseworkers federate via the relevant agency tenant (Migrationsverket,
UDI, …) directly into the per-country D365 environment with conditional-
access and PIM. They never assert the citizen identity.

## 6. References

* [governance/gdpr/sub-processors.md](../gdpr/sub-processors.md) — IdP brokers as sub-processors
* [docs/tech/architecture.md §4](../../docs/tech/architecture.md#4-identity--access-zero-trust-for-citizens)
