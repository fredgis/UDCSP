// Scenario ID: D3 plus D1-D4 accessibility smoke from docs/uses.md.
// Eval matrix rows: 8,12,13,17.
// TODO: case-study scaffold. Run with Playwright a11y project.
import { test, expect } from '@playwright/test'; import AxeBuilder from '@axe-core/playwright';
for (const path of ['/demo/d1','/demo/d2','/demo/d3?locale=pl','/demo/d4']) test(`axe WCAG 2.1 AA scan ${path} @a11y`, async ({ page }) => { await page.goto(path); const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze(); expect(r.violations.filter(v=>v.tags.some(t=>['wcag2a','wcag2aa'].includes(t)))).toEqual([]); });
