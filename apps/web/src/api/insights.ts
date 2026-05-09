import type { AccountInfo } from '@azure/msal-browser';
import { apiFetch } from './client';
import { loginRequest, msalInstance } from '../auth/msalConfig';

export type ApplicationStatusInsight = {
  status: string;
  count: number;
};

export type ProcessingTimeInsight = {
  currentDays: number;
  slaDays: number;
  country: string;
};

export type LanguageSatisfactionInsight = {
  locale: string;
  points: Array<{ period: string; score: number }>;
};

export function getApplicationStatus(citizenId: string, locale: string) {
  return insightFetch<ApplicationStatusInsight[]>('application-status', { citizenId, locale });
}

export function getProcessingTime(country: string, locale: string) {
  return insightFetch<ProcessingTimeInsight>('processing-time', { country, locale });
}

export function getLanguageSatisfaction(locale: string) {
  return insightFetch<LanguageSatisfactionInsight>('language-satisfaction', { locale });
}

async function insightFetch<T>(type: string, query: Record<string, string>): Promise<T> {
  const token = await getCachedAccessToken();
  const search = new URLSearchParams(query);
  return apiFetch<T>(`/citizen/insights/${encodeURIComponent(type)}?${search.toString()}`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

async function getCachedAccessToken(): Promise<string> {
  await msalInstance.initialize();
  const account = getActiveAccount();
  if (!account) throw new Error('No signed-in citizen account is available for insights.');
  const response = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
  return response.accessToken;
}

function getActiveAccount(): AccountInfo | null {
  return msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
}
