import { apiFetch } from './client';
export const listDocuments = (caseId: string) => apiFetch<Array<{ id: string; name: string; classification: string }>>(`/documents?caseId=${encodeURIComponent(caseId)}`);
export const createDocumentUpload = (caseId: string, fileName: string) => apiFetch<{ uploadUrl: string }>('/documents/upload-url', { method: 'POST', body: JSON.stringify({ caseId, fileName }) });
