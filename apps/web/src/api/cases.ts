import { apiFetch } from './client';
export const listCases = () => apiFetch<Array<{ id: string; title: string; status: string; updatedAt: string }>>('/cases');
export const getCase = (id: string) => apiFetch<{ id: string; title: string; status: string; timeline: string[] }>(`/cases/${encodeURIComponent(id)}`);
