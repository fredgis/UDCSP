import { expect, it, vi } from 'vitest';
import { apiFetch } from '../src/api/client';
it('injects traceparent header', async () => { const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) }); vi.stubGlobal('fetch', fetchMock); await apiFetch('/ping'); expect(fetchMock.mock.calls[0][1].headers.traceparent).toMatch(/^00-/); });
