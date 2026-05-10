// Scenario ID: D9 from docs/biz/uses.md — Henrik CIO cockpit.
// Eval matrix rows: 1,2,3,4,8,10,12,13,14,15,16.
import { test, expect } from '../fixtures/personas';
import { signInWithExternalIdTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { mockDemoGateway } from '../helpers/mock-demo-gateway';

test('Scenario 09 - Henrik CIO cockpit', async ({ page, persona }) => {
  const traceparent = createTraceparent();
  await signInWithExternalIdTestToken(page, 'DK', persona.id);
  await page.setExtraHTTPHeaders({ traceparent });
  await mockDemoGateway(page, { scenarioSlug: 'd9', traceparent });

  await page.goto('/demo/d9');
  await expect(page.getByRole('heading', { name: /UDCSP demo scenario/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('cio-cockpit');
  await page.getByTestId('start-scenario').click();

  await expect(page.getByTestId('scenario-traceparent')).toHaveText(traceparent);
  await expect(page.getByTestId('scenario-result')).toContainText('D9');
});
