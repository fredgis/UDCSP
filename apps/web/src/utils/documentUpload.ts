// Document upload helper.
// Uploads a file to the country-specific Storage account by going through
// APIM's MI-proxy POST /documents/upload-url. The API takes base64 + filename
// JSON and pushes the bytes into the citizen-uploads blob container of the
// citizen's country (DK · SE · NO).
//
// Returns the persisted blob coordinates so the application submission can
// reference the document by URL — proper data residency: DK citizen → DK
// storage, SE → SE storage, NO → NO storage. Nothing leaves the country.

import { apiFetch } from '../api/client';

export type UploadResult = {
  blobUrl: string;
  blobName: string;
  container: string;
  storageAccount: string;
};

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB safety cap (APIM proxy + base64 inflation)

export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  if (file.size > MAX_BYTES) {
    throw new Error('File is too large for this demo (max 4 MB).');
  }
  const contentBase64 = await readFileAsBase64(file);
  const r = await apiFetch<UploadResult & { error?: string; status?: number; raw?: string }>(
    '/documents/upload-url',
    {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        contentBase64,
      }),
    },
  );
  if (r.error) {
    throw new Error(`Upload failed (${r.status ?? 'unknown'}): ${r.error}`);
  }
  return { blobUrl: r.blobUrl, blobName: r.blobName, container: r.container, storageAccount: r.storageAccount };
}
