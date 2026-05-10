// Scenario ID: D4 from docs/biz/uses.md — Erik mobile payslip upload.
// Eval matrix rows: 2,3,4,5,6,7,10,12,13,14,15,17.
import { test, expect } from '../fixtures/personas';
import { signInWithExternalIdTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { mockDemoGateway } from '../helpers/mock-demo-gateway';

test('Scenario 04 - Erik mobile payslip upload', async ({ page, persona }) => {
  const traceparent = createTraceparent();
  await signInWithExternalIdTestToken(page, 'DK', persona.id);
  await page.setExtraHTTPHeaders({ traceparent });
  await mockDemoGateway(page, { scenarioSlug: 'd4', traceparent });

  await page.goto('/demo/d4');
  await expect(page.getByRole('heading', { name: /UDCSP demo scenario/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('mobile-payslip');
  await page.getByTestId('start-scenario').click();

  await expect(page.getByTestId('scenario-traceparent')).toHaveText(traceparent);
  await expect(page.getByTestId('scenario-result')).toContainText('D4');
});
