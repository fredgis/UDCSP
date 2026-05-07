# UDCSP Identity & Federation (A2)

## Purpose
Scaffold **Microsoft Entra External ID** (CIAM) per-country tenants, user flows, custom authentication extensions, eIDAS bridge, **Microsoft Entra ID** (workforce) Conditional Access baselines, PIM eligibility templates, and federation test helpers for DK/SE/NO.

> **Identity deviation note** — The case study lists **Azure AD B2C** as a mandatory service. As of **1 May 2025** Microsoft no longer offers Azure AD B2C to new customers, and recommends **Microsoft Entra External ID** as the successor product. We adopt that successor here. See [docs/architecture.md § Identity deviation](../../docs/architecture.md#identity-deviation-from-the-case-studys-b2c-mandate) for the full rationale and capability mapping.

## Layout
- `external-id/dk-external-id.bicep`, `se-external-id.bicep`, `no-external-id.bicep` — per-country External (CIAM) tenants via `Microsoft.AzureActiveDirectory/ciamDirectories`.
- `external-id/user-flows/*.json` — sign-up/sign-in, profile-edit, SSPR user flows + eIDAS-claims custom authentication extension. Applied via Microsoft Graph beta.
- `entra-id/conditional-access/*.json` — workforce CA baselines.
- `entra-id/pim/*.json` — PIM eligibility templates.

## Deploy
Deploy External ID tenant scaffolds per country, then apply user flows and JSON CA/PIM templates with Microsoft Graph automation.

## Test
```powershell
.\scripts\Test-IdentityFederation.ps1 -TenantDomain udcsp-dk-prod.ciamlogin.com -UserFlows SignUpSignIn,ProfileEdit,PasswordReset
```

## Tear-down
Remove test app registrations, custom authentication extensions, user flows, CA policies, PIM assignments, then delete External tenants after downstream app registrations are removed.

## Owner
A2 — Identity & Federation.
