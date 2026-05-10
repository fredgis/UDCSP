// Scenario ID: D3 from docs/biz/uses.md — Maria Polish screen-reader benefit.
// Eval matrix rows: 2,3,4,5,6,7,8,12,13,17.
import { test, expect } from '../fixtures/personas';
import { signInWithExternalIdTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { mockDemoGateway } from '../helpers/mock-demo-gateway';

test('Scenario 03 - Maria Polish screen-reader benefit @a11y', async ({ page, persona }) => {
  const traceparent = createTraceparent();
  await signInWithExternalIdTestToken(page, 'SE', persona.id);
  await page.setExtraHTTPHeaders({ traceparent });
  await mockDemoGateway(page, { scenarioSlug: 'd3', traceparent });

  await page.goto('/demo/d3');
  await expect(page.getByRole('heading', { name: /UDCSP demo scenario/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('a11y-child-benefit');
  await page.getByTestId('start-scenario').click();

  await expect(page.getByTestId('scenario-traceparent')).toHaveText(traceparent);
  await expect(page.getByTestId('scenario-result')).toContainText('D3');
});
