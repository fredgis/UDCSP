# UDCSP — Microsoft Entra External ID user flows

This folder replaces the legacy Azure AD B2C custom-policy XML files. **Azure AD B2C is no longer available for new customers as of 1 May 2025**, so the architecture substitutes it with its successor product, **Microsoft Entra External ID** (external tenants).

| File | Purpose | B2C policy it replaces |
|---|---|---|
| `sign-up-sign-in.json`        | Combined sign-up + sign-in user flow with eIDAS federation and country / language attribute collection. | `B2C_1A_SignUpOrSignIn`     |
| `password-reset.json`         | Self-service password reset (SSPR) tenant configuration.                                                | `B2C_1A_PasswordReset`      |
| `profile-edit.json`           | Editable / read-only attribute contract for the My-Account portal.                                      | `B2C_1A_ProfileEdit`        |
| `eidas-claims-extension.json` | Token-augmentation custom authentication extension that injects `country`, `eidasLoA`, `nationalIdHash`. | `eidas-bridge-claims.xml`   |

## Apply
Each JSON file is consumed by Microsoft Graph beta endpoints under `/identity/authenticationEventsFlows` and `/identity/customAuthenticationExtensions`. Use the per-country External tenant set in `scripts/install/config/udcsp.config.psd1 > ExternalIdTenants`.

## Why External ID and not B2C?
See [`docs/tech/architecture.md` § Identity deviation note](../../../../docs/tech/architecture.md#identity-deviation-from-the-case-studys-b2c-mandate).
