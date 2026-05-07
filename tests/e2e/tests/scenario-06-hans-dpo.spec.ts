// Scenario ID: D7 from uses.md — Hans DPO subject access request.
// Eval matrix rows: 7,9,10,11,13,14,15,17.
// TODO: case-study scaffold. Replace test IDs with finalized selectors/imports.
import { test, expect } from '../fixtures/personas';
import { signInWithB2CTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { postJson, getJson, expectTraceVisible } from '../helpers/api-client';

test('Scenario 07 - Hans DPO subject access request', async ({ page, request, persona }) => {
  const traceparent=createTraceparent(); const token=await signInWithB2CTestToken(page,'DK',persona.id);
  await page.setExtraHTTPHeaders({ traceparent }); await page.goto('/demo/d7');
  await expect(page.getByRole('heading',{ name:/UDCSP|Citizen|Case|Audit|Cockpit/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('dsar-audit'); await page.getByTestId('start-scenario').click();
  const submission=await postJson(request,'/gateway/demo-scenarios/d7',{personaId:persona.id,scenario:'D7',intent:'dsar-audit'},traceparent,token);
  expect(submission.traceparent).toBe(traceparent); expect(submission.status??'accepted').toMatch(/accepted|queued|completed/);
  const foundry=await getJson(request,`/foundry/traces/${traceparent.split('-')[1]}`,traceparent,token); expect(foundry.traceId).toBe(traceparent.split('-')[1]);
  await expectTraceVisible(request,traceparent);
});
