import { apiFetch } from './client';
export type ApplicationDraft = { type: 'residency' | 'tax-cert' | 'child-benefit'; country: string; payload: Record<string, unknown> };
export const submitApplication = (draft: ApplicationDraft) => apiFetch<{ id: string; status: string }>('/applications', { method: 'POST', body: JSON.stringify(draft) });
export const listApplications = () => apiFetch<Array<{ id: string; type: string; status: string }>>('/applications');
