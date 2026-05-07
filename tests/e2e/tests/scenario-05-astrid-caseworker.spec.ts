// Scenario ID: D5/D6 from docs/uses.md — Astrid caseworker AI review.
// Eval matrix rows: 3,7,9,13,14,15,16,17.
// TODO: case-study scaffold. Replace test IDs with finalized selectors/imports.
import { test, expect } from '../fixtures/personas';
import { signInWithB2CTestToken } from '../fixtures/auth';
import { createTraceparent } from '../helpers/traceparent';
import { postJson, getJson, expectTraceVisible } from '../helpers/api-client';

test('Scenario 05 - Astrid caseworker AI review', async ({ page, request, persona }) => {
  const traceparent=createTraceparent(); const token=await signInWithB2CTestToken(page,'SE',persona.id);
  await page.setExtraHTTPHeaders({ traceparent }); await page.goto('/demo/d5-d6');
  await expect(page.getByRole('heading',{ name:/UDCSP|Citizen|Case|Audit|Cockpit/i })).toBeVisible();
  await page.getByTestId('scenario-intent').fill('caseworker-triage'); await page.getByTestId('start-scenario').click();
  const submission=await postJson(request,'/gateway/demo-scenarios/d5-d6',{personaId:persona.id,scenario:'D5/D6',intent:'caseworker-triage'},traceparent,token);
  expect(submission.traceparent).toBe(traceparent); expect(submission.status??'accepted').toMatch(/accepted|queued|completed/);
  const foundry=await getJson(request,`/foundry/traces/${traceparent.split('-')[1]}`,traceparent,token); expect(foundry.traceId).toBe(traceparent.split('-')[1]);
  await expectTraceVisible(request,traceparent);
});
