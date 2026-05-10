// Scenario ID: D10 from docs/biz/uses.md — Evaluator dry-run cross-cutting walkthrough.
// Eval matrix rows: 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18.
import { test, expect } from '../fixtures/personas';
import { signInWithExternalIdTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { mockDemoGateway } from '../helpers/mock-demo-gateway';

test('Scenario 10 - Evaluator dry-run all demos', async ({ page, persona }) => {
  const traceparent = createTraceparent();
  await signInWithExternalIdTestToken(page, 'SE', persona.id);
  await page.setExtraHTTPHeaders({ traceparent });
  await mockDemoGateway(page, { scenarioSlug: 'd10', traceparent });

  await page.goto('/demo/d10');
  await expect(page.getByRole('heading', { name: /UDCSP demo scenario/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('evaluator-cross-cutting');
  await page.getByTestId('start-scenario').click();

  await expect(page.getByTestId('scenario-traceparent')).toHaveText(traceparent);
  await expect(page.getByTestId('scenario-result')).toContainText('D10');
});
