// Scenario ID: D8 from docs/biz/uses.md — Ingrid SOC impossible travel alert.
// Eval matrix rows: 6,9,14,15,17.
import { test, expect } from '../fixtures/personas';
import { signInWithExternalIdTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { mockDemoGateway } from '../helpers/mock-demo-gateway';

test('Scenario 08 - Ingrid SOC impossible travel alert', async ({ page, persona }) => {
  const traceparent = createTraceparent();
  await signInWithExternalIdTestToken(page, 'NO', persona.id);
  await page.setExtraHTTPHeaders({ traceparent });
  await mockDemoGateway(page, { scenarioSlug: 'd8', traceparent });

  await page.goto('/demo/d8');
  await expect(page.getByRole('heading', { name: /UDCSP demo scenario/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('soc-impossible-travel');
  await page.getByTestId('start-scenario').click();

  await expect(page.getByTestId('scenario-traceparent')).toHaveText(traceparent);
  await expect(page.getByTestId('scenario-result')).toContainText('D8');
});
