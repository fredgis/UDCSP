# WCAG 2.1 AA Checklist Traceability

Mirrors `apps/web/i18n/accessibility/wcag-2.1-aa-checklist.md`.

| WCAG criterion | Evidence | Test files / notes |
|---|---|---|
| 1.1.1 Non-text Content | automated/manual | `automated/axe-runner.spec.ts` |
| 1.3.1 Info and Relationships | automated | `tests/e2e/tests/scenario-03-maria-pl-screen-reader.spec.ts` |
| 1.4.3 Contrast | automated | `axe-config.json`, Lighthouse budget |
| 2.1.1 Keyboard | manual | `keyboard-only/*.md` |
| 2.4.3 Focus Order | manual | `keyboard-only/portal-navigation.md` |
| 3.3.2 Labels or Instructions | NVDA/manual | `screen-reader/nvda-maria-pl.md` |
| 4.1.2 Name, Role, Value | automated | `automated/axe-runner.spec.ts` |

TODO: case-study scaffold. Expand after A12 publishes canonical checklist.
