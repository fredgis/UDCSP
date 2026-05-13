import { useState } from 'react';
import { apiFetch } from '../api/client';

type Result = { correlationId?: string; status?: string; error?: string };

export function ApplyChildBenefitPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await apiFetch<Result>('/citizen-applications/', {
        method: 'POST',
        body: JSON.stringify({ applicationType: 'child-benefit', ...payload }),
      });
      setResult(r);
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="cb-title">
      <h1 id="cb-title">Apply — child benefit</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="children">Number of children</label>
        <input id="children" name="children" type="number" min={1} required />
        <label htmlFor="residence">Residence country</label>
        <select id="residence" name="residence" required>
          <option value="dk">Denmark</option>
          <option value="se">Sweden</option>
          <option value="no">Norway</option>
        </select>
        <button type="submit" className="button-primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
      {result?.correlationId && (
        <p role="status" className="info-banner">
          ✅ Application received. Correlation ID: <code>{result.correlationId}</code> · status: <code>{result.status ?? 'received'}</code>. Check <a href="/cases">My cases</a>.
        </p>
      )}
      {result?.error && (
        <p role="alert" className="info-banner">⚠ {result.error}</p>
      )}
    </section>
  );
}
