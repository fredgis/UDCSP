// Scenario ID: D3 from docs/uses.md — Maria Polish screen-reader benefit.
// Eval matrix rows: 2,3,4,5,6,7,8,12,13,17.
// TODO: case-study scaffold. Replace test IDs with finalized selectors/imports.
import { test, expect } from '../fixtures/personas';
import { signInWithB2CTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { postJson, getJson, expectTraceVisible } from '../helpers/api-client';

test('Scenario 03 - Maria Polish screen-reader benefit @a11y', async ({ page, request, persona }) => {
  const traceparent=createTraceparent(); const token=await signInWithB2CTestToken(page,'SE',persona.id);
  await page.setExtraHTTPHeaders({ traceparent }); await page.goto('/demo/d3');
  await expect(page.getByRole('heading',{ name:/UDCSP|Citizen|Case|Audit|Cockpit/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('housing-benefit-accessible'); await page.getByTestId('start-scenario').click();
  const submission=await postJson(request,'/gateway/demo-scenarios/d3',{personaId:persona.id,scenario:'D3',intent:'housing-benefit-accessible'},traceparent,token);
  expect(submission.traceparent).toBe(traceparent); expect(submission.status??'accepted').toMatch(/accepted|queued|completed/);
  const foundry=await getJson(request,`/foundry/traces/${traceparent.split('-')[1]}`,traceparent,token); expect(foundry.traceId).toBe(traceparent.split('-')[1]);
  await expectTraceVisible(request,traceparent);
});
