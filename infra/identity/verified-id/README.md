# UDCSP Verified ID issuer

This folder turns the EUDI Wallet posture from readiness-only into an active issuer/verifier implementation. `verified-id-issuer.bicep` defines one shared Microsoft Entra Verified ID authority in the federation hub region (`westeurope`). The authority uses an ION DID for production, with Web DID available for development environments.

## Credential contracts

The issuer publishes three deployable credential contracts:

| Contract | Purpose |
|---|---|
| `credential-contracts/udcsp-residency-credential.json` | Cross-border residency assertion for DK, SE and NO flows. |
| `credential-contracts/udcsp-eligibility-receipt.json` | Signed proof that the Eligibility Pre-Assessor produced a recommendation for the citizen. |
| `credential-contracts/udcsp-eudi-wallet-bridge.json` | Bridge credential that maps an EUDI Wallet OpenID4VP `vp_token` to UDCSP routing claims without storing the token. |

Each contract has a matching presentation policy in `presentation-policies/`.

## OpenID4VP support

The presentation policies require `vp_token` responses and are shaped around Presentation Exchange input descriptors. The verifier accepts transient wallet presentations, validates holder binding and issuer trust, derives the pseudonymous `subjectId` and assurance level, and then discards the raw `vp_token`.

## eIDAS 2.0 roadmap

1. Use Web DID in development to validate wallet UX and OpenID4VP request/response handling.
2. Promote the issuer to ION DID anchoring for production trust durability.
3. Register trusted wallet issuers as national EUDI Wallet schemes become available.
4. Align the contract metadata with final EUDI ARF and eIDAS 2.0 conformance test vectors.

Run `scripts/Test-VerifiedId.ps1 -Offline` to validate local assets without Azure access.
