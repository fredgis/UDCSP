// Thin wrapper around App Insights that adds OTel-style structured fields
// (callId, traceparent, country, locale, intent) to every log line so the
// voice channel correlates 1-to-1 with Foundry traces in App Insights.

import appInsights from 'applicationinsights';
import type { Config } from './config.js';

export interface LogContext {
  callConnectionId?: string;
  traceparent?: string;
  country?: string;
  locale?: string;
  intent?: string;
}

let started = false;

export function startTelemetry(cfg: Config): void {
  if (started) return;
  if (!cfg.trace.appInsightsConnectionString) {
    return; // dev mode — App Insights disabled
  }
  appInsights
    .setup(cfg.trace.appInsightsConnectionString)
    .setAutoCollectRequests(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectExceptions(true)
    .setUseDiskRetryCaching(true)
    .start();
  appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = cfg.trace.serviceName;
  started = true;
}

export function logEvent(name: string, ctx: LogContext, props: Record<string, unknown> = {}): void {
  const payload = { ...ctx, ...props };
  if (started) {
    appInsights.defaultClient.trackEvent({ name, properties: payload as Record<string, string> });
  }
  // Also emit to stdout (Container App stdout → App Insights via OTEL exporter)
  console.log(JSON.stringify({ event: name, ts: new Date().toISOString(), ...payload }));
}

export function logError(err: unknown, ctx: LogContext): void {
  const e = err instanceof Error ? err : new Error(String(err));
  if (started) {
    appInsights.defaultClient.trackException({ exception: e, properties: ctx as Record<string, string> });
  }
  console.error(JSON.stringify({ event: 'error', ts: new Date().toISOString(), message: e.message, stack: e.stack, ...ctx }));
}
