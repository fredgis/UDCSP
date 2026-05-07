// Scenario ID: D1 from docs/biz/uses.md — Anna DK to SE residency.
// Eval matrix rows: 1,2,3,4,5,6,7,9,10,11,12,13,14,15,16,17.
// TODO: case-study scaffold. Replace test IDs with finalized selectors/imports.
import { test, expect } from '../fixtures/personas';
import { signInWithExternalIdTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { postJson, getJson, expectTraceVisible } from '../helpers/api-client';

test('Scenario 01 - Anna DK to SE residency', async ({ page, request, persona }) => {
  const traceparent=createTraceparent(); const token=await signInWithExternalIdTestToken(page,'DK',persona.id);
  await page.setExtraHTTPHeaders({ traceparent }); await page.goto('/demo/d1');
  await expect(page.getByRole('heading',{ name:/UDCSP|Citizen|Case|Audit|Cockpit/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('cross-border-residency-transfer'); await page.getByTestId('start-scenario').click();
  const submission=await postJson(request,'/gateway/demo-scenarios/d1',{personaId:persona.id,scenario:'D1',intent:'cross-border-residency-transfer'},traceparent,token);
  expect(submission.traceparent).toBe(traceparent); expect(submission.status??'accepted').toMatch(/accepted|queued|completed/);
  const foundry=await getJson(request,`/foundry/traces/${traceparent.split('-')[1]}`,traceparent,token); expect(foundry.traceId).toBe(traceparent.split('-')[1]);
  await expectTraceVisible(request,traceparent);
});
