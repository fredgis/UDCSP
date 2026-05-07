import { generateTraceparent } from '../utils/traceparent';

const baseUrl = import.meta.env.VITE_APIM_BASE_URL || 'https://udcsp-apim.azure-api.net';
export type ApiOptions = RequestInit & { retries?: number };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const retries = options.retries ?? 2;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json', traceparent: generateTraceparent(), ...(options.headers || {}) },
    });
    if (response.ok) return (response.status === 204 ? undefined : response.json()) as T;
    if (attempt === retries || ![408, 429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`APIM request failed: ${response.status}`);
    }
    await sleep(250 * 2 ** attempt);
  }
  throw new Error('Unreachable retry state');
}
