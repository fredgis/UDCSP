# UDCSP Web Citizen Portal

## Purpose
Accessible React citizen portal for Denmark, Sweden, and Norway. It provides the single front door for residency, tax-certificate, child-benefit, case-status, consent, and AI assistant chat journeys (multi-turn, 12 languages — backed by the Foundry **topic-router** agent through APIM, post-audit refactor).

## Dev setup
Prerequisites: Node.js 20 LTS. This scaffold intentionally does not install packages. Run `npm install` when package feeds and agent-owned i18n catalogues are available.

## Build
`npm run build` creates a Vite production bundle served by Azure Static Web Apps or the nginx Docker image.

## Test
`npm test` runs Vitest unit tests. `npm run test:a11y` runs the axe sample; agent-qa owns the complete e2e gate.

## Accessibility approach
WCAG 2.1 AA is enforced through Fluent UI v9 primitives, visible focus indicators, associated labels, ARIA live regions in forms, reduced-motion/high-contrast preferences, keyboard-first navigation, and axe-core checks. Translation catalogues are loaded from `apps/web/i18n/messages/{lang}.json`, which is owned by agent-foundry/A12 and is not included here.

## Deploy
Static Web Apps uses `staticwebapp.config.json`. Docker uses the included multi-stage `Dockerfile` as a placeholder until CI supplies real environment values.

## Owner
Frontend & Channels build agent — work package A9.
