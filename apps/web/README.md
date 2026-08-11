# UDCSP Web Citizen Portal

_Last verified: 2026-08-11 · commit f940d39_

## Purpose
Accessible React citizen portal for Denmark, Sweden and Norway. It provides the single front door for residency, tax-certificate, child-benefit, case-status, consent and AI assistant chat journeys.

🟢 **Live**: chat uses the Foundry `topic-router` through APIM at `/agent-topic-router/messages`. The live URL is <https://udcsp.fredgis.com>.

## Dev setup
Prerequisites: Node.js 20 LTS. Run `npm install`, then `npm run dev` for local Vite development.

The 12 i18n catalogues are included in `apps/web/i18n/messages/`: `ar`, `da`, `de`, `en`, `fi`, `fr`, `nb`, `nn`, `pl`, `se`, `sv`, `uk`.

Environment variables:

- `VITE_APIM_BASE_URL`: fallback APIM base URL.
- `VITE_APIM_BASE_URL_DK`, `VITE_APIM_BASE_URL_SE`, `VITE_APIM_BASE_URL_NO`: country-specific APIM base URLs.
- `VITE_APIM_SCOPE`: optional login scope override, defaults to `openid`.
- `VITE_EXTERNAL_ID_CLIENT_ID`: fallback External ID SPA client ID.
- `VITE_EXTERNAL_ID_CLIENT_ID_DK`, `VITE_EXTERNAL_ID_CLIENT_ID_SE`, `VITE_EXTERNAL_ID_CLIENT_ID_NO`: country-specific External ID SPA client IDs.

## Build
`npm run build` creates a Vite production bundle in `dist`.

🔵 **In repo**: the multi-stage `Dockerfile` builds an nginx image for local or container validation. Production demo deployment uses Azure Static Web Apps.

## Test
`npm test` runs Vitest unit tests. `npm run test:a11y` runs the axe sample; agent-qa owns the complete e2e gate.

## Accessibility approach
WCAG 2.1 AA is enforced through Fluent UI v9 primitives, visible focus indicators, associated labels, ARIA live regions in forms, reduced-motion and high-contrast preferences, keyboard-first navigation, and axe-core checks.

## Deploy
🟢 **Live**: Static Web App `udcsp-web-dev` has no GitHub Action. Push each change live with:

```powershell
npm run build
npx --yes @azure/static-web-apps-cli@latest deploy ./dist --deployment-token <key> --env production --no-use-keychain
```

Get the deployment token with `az staticwebapp secrets list -n udcsp-web-dev`. Do not commit or paste the token into this file.

## Owner
Frontend & Channels build agent, work package A9.
