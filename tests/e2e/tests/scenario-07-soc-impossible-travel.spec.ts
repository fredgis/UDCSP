// Scenario ID: D8 from docs/uses.md — Ingrid SOC impossible travel alert.
// Eval matrix rows: 6,9,14,15,17.
// TODO: case-study scaffold. Replace test IDs with finalized selectors/imports.
import { test, expect } from '../fixtures/personas';
import { signInWithB2CTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { postJson, getJson, expectTraceVisible } from '../helpers/api-client';

test('Scenario 08 - Ingrid SOC impossible travel alert', async ({ page, request, persona }) => {
  const traceparent=createTraceparent(); const token=await signInWithB2CTestToken(page,'NO',persona.id);
  await page.setExtraHTTPHeaders({ traceparent }); await page.goto('/demo/d8');
  await expect(page.getByRole('heading',{ name:/UDCSP|Citizen|Case|Audit|Cockpit/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('security-containment'); await page.getByTestId('start-scenario').click();
  const submission=await postJson(request,'/gateway/demo-scenarios/d8',{personaId:persona.id,scenario:'D8',intent:'security-containment'},traceparent,token);
  expect(submission.traceparent).toBe(traceparent); expect(submission.status??'accepted').toMatch(/accepted|queued|completed/);
  const foundry=await getJson(request,`/foundry/traces/${traceparent.split('-')[1]}`,traceparent,token); expect(foundry.traceId).toBe(traceparent.split('-')[1]);
  await expectTraceVisible(request,traceparent);
});
