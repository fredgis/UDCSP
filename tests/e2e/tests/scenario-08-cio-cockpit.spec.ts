// Scenario ID: D9 from docs/biz/uses.md — Henrik CIO cockpit.
// Eval matrix rows: 1,2,3,4,8,10,12,13,14,15,16.
// TODO: case-study scaffold. Replace test IDs with finalized selectors/imports.
import { test, expect } from '../fixtures/personas';
import { signInWithExternalIdTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { postJson, getJson, expectTraceVisible } from '../helpers/api-client';

test('Scenario 09 - Henrik CIO cockpit', async ({ page, request, persona }) => {
  const traceparent=createTraceparent(); const token=await signInWithExternalIdTestToken(page,'DK',persona.id);
  await page.setExtraHTTPHeaders({ traceparent }); await page.goto('/demo/d9');
  await expect(page.getByRole('heading',{ name:/UDCSP|Citizen|Case|Audit|Cockpit/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('executive-cockpit'); await page.getByTestId('start-scenario').click();
  const submission=await postJson(request,'/gateway/demo-scenarios/d9',{personaId:persona.id,scenario:'D9',intent:'executive-cockpit'},traceparent,token);
  expect(submission.traceparent).toBe(traceparent); expect(submission.status??'accepted').toMatch(/accepted|queued|completed/);
  const foundry=await getJson(request,`/foundry/traces/${traceparent.split('-')[1]}`,traceparent,token); expect(foundry.traceId).toBe(traceparent.split('-')[1]);
  await expectTraceVisible(request,traceparent);
});
