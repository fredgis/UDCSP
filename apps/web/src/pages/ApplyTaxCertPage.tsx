import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { apiFetch } from '../api/client';
import { countries, getCountry } from '../auth/msalConfig';

type Result = { correlationId?: string; caseId?: string; error?: string };

const COUNTRY_LABEL: Record<string, string> = { dk: 'Denmark', se: 'Sweden', no: 'Norway' };

export function ApplyTaxCertPage() {
  const { accounts } = useMsal();
  const acc = accounts[0];
  const country = getCountry();
  const flag = countries.find((c) => c.code === country)?.flag ?? '🌐';

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const currentYear = new Date().getFullYear();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    try {
      const r = await apiFetch<Result>('/citizen-applications/', {
        method: 'POST',
        body: JSON.stringify({
          applicationType: 'tax-certificate',
          country,
          citizenUpn: acc?.username,
          ...Object.fromEntries(fd),
        }),
      });
      setResult(r);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="tax-title" className="apply-page">
      <header className="apply-page__head">
        <span className="apply-page__country">
          <span aria-hidden="true">{flag}</span> {country.toUpperCase()} — {COUNTRY_LABEL[country]}
        </span>
        <h1 id="tax-title">Tax residency certificate</h1>
        <p>
          Request an official tax residency certificate. We&rsquo;ll generate it from your records in the {COUNTRY_LABEL[country]} tax
          authority and notify you when it&rsquo;s ready to download — usually within a few minutes.
        </p>
      </header>

      <form onSubmit={onSubmit} className="apply-form" noValidate>
        <fieldset className="apply-card">
          <legend>1. Certificate details</legend>
          <div className="apply-grid">
            <label className="field">
              <span>Tax year</span>
              <input
                type="number"
                name="taxYear"
                min={currentYear - 10}
                max={currentYear}
                required
                defaultValue={currentYear - 1}
              />
            </label>
            <label className="field">
              <span>Format</span>
              <select name="format" defaultValue="pdf">
                <option value="pdf">PDF (signed)</option>
                <option value="xml">Machine-readable XML</option>
              </select>
            </label>
            <label className="field apply-grid__wide">
              <span>Purpose (helps the issuing office)</span>
              <textarea name="purpose" rows={3} required placeholder="e.g. apply for a mortgage in Spain, prove residency for an EU tax treaty…" />
            </label>
          </div>
        </fieldset>

        <fieldset className="apply-card">
          <legend>2. Delivery</legend>
          <div className="apply-grid">
            <label className="field">
              <span>Delivery email</span>
              <input type="email" name="email" required defaultValue={acc?.username || ''} />
            </label>
            <label className="field">
              <span>Send a copy by SMS?</span>
              <select name="smsCopy" defaultValue="no">
                <option value="no">No</option>
                <option value="yes">Yes (uses your SMS consent)</option>
              </select>
            </label>
          </div>
        </fieldset>

        <div className="apply-submit">
          <button type="submit" className="button-primary" disabled={busy}>
            {busy ? 'Requesting…' : 'Request certificate'}
          </button>
          <p className="apply-submit__hint">
            The certificate is issued by your country&rsquo;s tax authority. UDCSP only routes the request — it never
            persists the certificate beyond your inbox.
          </p>
        </div>
      </form>

      {result?.error && <p role="alert" className="info-banner info-banner--warn">⚠ {result.error}</p>}
      {result && !result.error && (
        <article className="apply-result apply-result--likely-eligible" tabIndex={-1}>
          <h2>✅ Request received</h2>
          <p>
            Case reference <code>{result.caseId || result.correlationId || 'pending'}</code>. The certificate will be
            emailed to you shortly. You can also follow it from <Link to="/cases">My cases</Link>.
          </p>
        </article>
      )}
    </section>
  );
}
