// Wrapper around POST /agent-doc-extractor/extract that is defensive about
// the contract drift between the older "filename+contentBase64" payload and
// the newer "blobUrl+documentKind" payload. The function sends BOTH shapes
// in a single request so the APIM operation can read whichever form it
// understands. Once every environment migrates to the new contract, the
// legacy fields can be dropped without touching the SPA.

import { apiFetch } from '../api/client';
import { readFileAsBase64 } from './documentUpload';

export type ExtractResult = {
  fields?: Record<string, string>;
  summary?: string;
  warnings?: string[];
};

export type DocumentKind = 'payslip' | 'employment-contract' | 'lease' | 'id-card' | 'other';

export async function extractDocument(args: {
  file: File;
  blobUrl: string | null;
  documentKind: DocumentKind;
}): Promise<ExtractResult> {
  const { file, blobUrl, documentKind } = args;
  const contentBase64 = await readFileAsBase64(file);
  const payload: Record<string, unknown> = {
    blobUrl: blobUrl ?? undefined,
    documentKind,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    contentBase64,
  };
  return apiFetch<ExtractResult>('/agent-doc-extractor/extract', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
