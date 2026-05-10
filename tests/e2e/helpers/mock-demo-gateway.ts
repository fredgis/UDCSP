// Shared Playwright route mocks for the demo scenarios. The case-study
// installer is the source of truth for the live `/gateway/...` and
// `/foundry/traces/...` endpoints; in unit/e2e against the dev preview we
// stub them so the spec only verifies the channel surface (the React demo
// page) plus the W3C trace propagation contract.
import type { Page } from '@playwright/test';

export interface MockOptions {
  scenarioSlug: string;
  traceparent: string;
}

export async function mockDemoGateway(page: Page, opts: MockOptions): Promise<void> {
  const traceId = opts.traceparent.split('-')[1];

  await page.route(/\/gateway\/demo-scenarios\/[^/]+$/, async (route) => {
    const incoming = route.request().headers()['traceparent'] ?? opts.traceparent;
    const body = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        traceparent: incoming,
        status: 'accepted',
        scenarioId: body.scenario ?? opts.scenarioSlug.toUpperCase(),
        receivedAt: new Date().toISOString(),
      }),
    });
  });

  await page.route(/\/foundry\/traces\/[a-f0-9]+$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ traceId, backends: ['apim', 'foundry'], spans: 4 }),
    });
  });

  await page.route(/\/observability\/traces\/[a-f0-9]+$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ traceId, backends: ['apim', 'foundry'], sampled: true }),
    });
  });
}
