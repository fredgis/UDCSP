# UDCSP QA & Evaluation (A14)

Owner: **A14 — QA & Evaluation build agent**.

| Layer | Path | Purpose | Local run | CI run |
|---|---|---|---|---|
| E2E | `tests/e2e/` | Playwright journeys mapped to `docs/uses.md` demos and README eval rows 1–18. | `cd tests/e2e && npm ci && npm run test` | `tests/e2e/.github/workflows/e2e-playwright.yml` |
| Eval | `tests/eval/` | Foundry regression, bias, safety and promotion gates. | `pwsh tests/eval/scripts/Run-Eval-Pipeline.ps1 -Pipeline nightly-assistant` | `tests/eval/.github/workflows/` |
| Accessibility | `tests/accessibility/` | WCAG 2.1 AA automated and manual evidence. | `pwsh tests/accessibility/scripts/Run-Accessibility.ps1` | `tests/accessibility/.github/workflows/accessibility-gate.yml` |
| Load | `tests/load/` | k6/Azure Load Testing against SLOs. | `pwsh tests/load/scripts/Run-Load.ps1 -Scenario burst` | `tests/load/.github/workflows/load-weekly.yml` |
| Security | `tests/security/` | Dependency, DAST, IaC and secret scans. | `pwsh tests/security/scripts/Run-Security.ps1` | `tests/security/.github/workflows/security-weekly.yml` |
| Conformance | `tests/conformance/` | eIDAS, GDPR, EU AI Act and WCAG evidence bundles. | `pwsh tests/conformance/scripts/Generate-Conformance-Pack.ps1` | `tests/conformance/.github/workflows/conformance-on-release.yml` |

How to read results: each suite writes `results/<date>/` artefacts linked to scenario IDs and evaluation rows. No tenant/subscription IDs are hardcoded; all runtime values are environment variables or workflow secrets.

Cross-agent dependencies: `data/synthetic/personas/`, `foundry/evaluations/eval-suites/`, `apps/web/i18n/accessibility/`, `services/apim/apis/*/openapi.yaml`, `scripts/install/reports/`.
