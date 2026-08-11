// Thin wrapper around App Insights that adds OTel-style structured fields
// (callId, traceparent, country, locale, intent) to every log line so the
// voice channel correlates 1-to-1 with Foundry traces in App Insights.

import { useAzureMonitor } from '@azure/monitor-opentelemetry';
import { logs, SeverityNumber, type LogAttributes, type Logger } from '@opentelemetry/api-logs';
import type { Config } from './config.js';

export interface LogContext {
  callConnectionId?: string;
  traceparent?: string;
  country?: string;
  locale?: string;
  intent?: string;
}

let started = false;
let unsafeConsoleLogging = false;
let telemetryLogger: Logger | null = null;

function safeAttributes(values: Record<string, unknown>): LogAttributes {
  const attributes: LogAttributes = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' || typeof value === 'boolean') {
      attributes[key] = value;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      attributes[key] = value;
    } else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      attributes[key] = value;
    }
  }
  return attributes;
}

export function startTelemetry(cfg: Config): void {
  unsafeConsoleLogging = cfg.trace.unsafeDebugLogging;
  if (started) return;
  if (!cfg.trace.appInsightsConnectionString) {
    return; // dev mode — App Insights disabled
  }
  process.env.OTEL_SERVICE_NAME ??= cfg.trace.serviceName;
  useAzureMonitor({
    azureMonitorExporterOptions: { connectionString: cfg.trace.appInsightsConnectionString },
    instrumentationOptions: { console: { enabled: false } },
  });
  telemetryLogger = logs.getLogger(cfg.trace.serviceName);
  started = true;
}

export function logEvent(name: string, ctx: LogContext, props: Record<string, unknown> = {}): void {
  const payload = { ...ctx, ...props };
  telemetryLogger?.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: name,
    attributes: safeAttributes({ event: name, ...payload }),
  });
  if (unsafeConsoleLogging) {
    console.log(JSON.stringify({ event: name, ts: new Date().toISOString(), ...payload }));
  }
}

export function logError(err: unknown, ctx: LogContext): void {
  const e = err instanceof Error ? err : new Error(String(err));
  const errorCode = typeof (e as Error & { code?: unknown }).code === 'string' ? (e as Error & { code: string }).code : undefined;
  telemetryLogger?.emit({
    severityNumber: SeverityNumber.ERROR,
    severityText: 'ERROR',
    body: 'voice.error',
    attributes: safeAttributes({ event: 'error', errorType: e.name, errorCode, ...ctx }),
  });
  if (unsafeConsoleLogging) {
    console.error(JSON.stringify({ event: 'error', ts: new Date().toISOString(), message: e.message, stack: e.stack, ...ctx }));
  }
}
