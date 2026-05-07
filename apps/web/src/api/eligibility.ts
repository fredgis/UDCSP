import { apiFetch } from './client';
export const preAssessEligibility = (payload: Record<string, unknown>) => apiFetch<{ recommendation: 'likely' | 'unclear' | 'unlikely'; explanation: string; humanReviewRequired: true }>('/eligibility/pre-assess', { method: 'POST', body: JSON.stringify(payload) });
