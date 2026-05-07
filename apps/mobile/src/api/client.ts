const baseUrl = process.env.EXPO_PUBLIC_APIM_BASE_URL || 'https://udcsp-apim.azure-api.net';
const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
export const traceparent = () => `00-${hex(32)}-${hex(16)}-01`;
export async function apiFetch<T>(path: string, init: RequestInit = {}, retries = 2): Promise<T> { for (let attempt = 0; attempt <= retries; attempt++) { const res = await fetch(`${baseUrl}${path}`, { ...init, headers: { 'content-type': 'application/json', traceparent: traceparent(), ...(init.headers || {}) } }); if (res.ok) return res.json(); if (attempt === retries) throw new Error(`APIM ${res.status}`); await new Promise(r => setTimeout(r, 250 * 2 ** attempt)); } throw new Error('retry failed'); }
