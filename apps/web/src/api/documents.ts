import { apiFetch } from './client';
export const listDocuments = (caseId: string) => apiFetch<Array<{ id: string; name: string; classification: string }>>(`/cases/${encodeURIComponent(caseId)}/documents`);
export const createDocumentUpload = (caseId: string, fileName: string) => apiFetch<{ uploadUrl: string }>(`/cases/${encodeURIComponent(caseId)}/documents`, { method: 'POST', body: JSON.stringify({ fileName }) });
