import { generateTraceparent } from '../utils/traceparent';
import { apimBaseUrlForCountry, apiScopeForCountry, getCountry } from '../auth/msalConfig';
import { msalInstance } from '../auth/msalConfig';

export type ApiOptions = RequestInit & { retries?: number; auth?: boolean };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function bearerForCurrentCountry(): Promise<string | null> {
  const accounts = msalInstance.getAllAccounts();
  if (!accounts.length) return null;
  try {
    const tok = await msalInstance.acquireTokenSilent({
      account: accounts[0],
      scopes: [apiScopeForCountry(getCountry())],
    });
    return tok.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const retries = options.retries ?? 2;
  const country = getCountry();
  const baseUrl = apimBaseUrlForCountry(country) || (import.meta.env.VITE_APIM_BASE_URL as string) || '';
  const bearer = options.auth === false ? null : await bearerForCurrentCountry();
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        traceparent: generateTraceparent(),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (response.ok) return (response.status === 204 ? undefined : response.json()) as T;
    if (attempt === retries || ![408, 429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`APIM request failed: ${response.status}`);
    }
    await sleep(250 * 2 ** attempt);
  }
  throw new Error('Unreachable retry state');
}
