// TODO: case-study scaffold. W3C trace context helper.
import { randomBytes } from 'crypto';
export function createTraceparent(): string { return `00-${randomBytes(16).toString('hex')}-${randomBytes(8).toString('hex')}-01`; }
export function traceIdFromTraceparent(traceparent: string): string { return traceparent.split('-')[1]; }
