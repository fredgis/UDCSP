const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

export function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return hex(buffer);
}

export function getSessionTraceId(): string {
  const key = 'udcsp.traceId';
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const traceId = randomHex(16);
  sessionStorage.setItem(key, traceId);
  return traceId;
}

export function generateTraceparent(): string {
  return `00-${getSessionTraceId()}-${randomHex(8)}-01`;
}
