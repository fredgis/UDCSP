# UDCSP Identity & Federation (A2)

## Purpose
Scaffold Entra External ID, country B2C tenants, custom policies, Conditional Access baselines, PIM eligibility templates, and federation test helpers for DK/SE/NO.

## Deploy
Deploy B2C tenant scaffolds per country, then apply custom policies and JSON CA/PIM templates with Microsoft Graph automation.

## Test
```powershell
.\scripts\Test-IdentityFederation.ps1 -TenantDomain udcsp-dk-prod.b2clogin.com -Policy B2C_1A_SIGNUP_SIGNIN
```

## Tear-down
Remove test app registrations, custom policies, CA policies, PIM assignments, then delete B2C tenants after downstream app registrations are removed.

## Owner
A2 — Identity & Federation.
