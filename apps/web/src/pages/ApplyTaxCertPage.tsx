import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { apiFetch } from '../api/client';
import { countries, getCountry } from '../auth/msalConfig';
import { appendCase } from '../utils/caseStore';
import { PlatformDiagram } from '../components/PlatformDiagram';

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
      const fields = Object.fromEntries(fd) as Record<string, string>;
      appendCase({
        id: r.caseId || r.correlationId || `tax-${Date.now()}`,
        title: `Tax residency certificate ${fields.year ?? currentYear}`,
        status: 'Submitted · awaiting issuance',
        updatedAt: new Date().toISOString(),
        country,
        citizenUpn: acc?.username,
        applicationType: 'tax-certificate',
      });
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="tax-title" className="apply-page">
      <header className="apply-page__head">
        <span className="apply-page__country" aria-label={`Filing in ${COUNTRY_LABEL[country]}`}>
          <span aria-hidden="true">{flag}</span> Filing in {COUNTRY_LABEL[country]}
        </span>
        <h1 id="tax-title">Tax residency certificate</h1>
        <p>
          Request a tax residency certificate to claim a double-taxation treaty. We pick the right form based on
          your country, pre-fill it, and submit or prepare it for the {COUNTRY_LABEL[country]} tax authority.
        </p>
      </header>

      <aside className="bridge-callout" aria-label="Connected tax authorities">
        <div className="bridge-callout__text">
          <h3>Connected to the issuing tax authority</h3>
          <p>
            UDCSP is a <strong>unified citizen platform</strong>. The certificate is always issued by the
            national tax authority — UDCSP picks the right form, pre-fills it, and submits or prepares
            the request. Delivery time depends on the authority.
          </p>
        </div>
        <PlatformDiagram
          groups={[
            { country: 'Denmark', flag: '🇩🇰', items: [
              { label: 'SKAT', sub: 'Form 02.050' },
              { label: 'MitID', sub: 'eID' },
            ] },
            { country: 'Sweden', flag: '🇸🇪', items: [
              { label: 'Skatteverket', sub: 'Hemvistintyg' },
              { label: 'e-service', sub: 'since Feb 2026' },
              { label: 'SKV 2734', sub: 'Form (fallback)' },
            ] },
            { country: 'Norway', flag: '🇳🇴', items: [
              { label: 'Altinn', sub: 'Form RF-1306' },
              { label: 'Skatteetaten', sub: 'Issuing authority' },
              { label: 'ID-porten', sub: 'eID' },
            ] },
          ]}
        />
      </aside>

      <form onSubmit={onSubmit} className="apply-form">
        <fieldset className="apply-card">
          <legend>1. Certificate details</legend>
          <div className="apply-grid">
            <label className="field field--required">
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
            <label className="field field--required apply-grid__wide">
              <span>Purpose (helps the issuing office)</span>
              <textarea name="purpose" rows={3} required placeholder="e.g. apply for a mortgage in Spain, prove residency for an EU tax treaty…" />
            </label>
          </div>
        </fieldset>

        <fieldset className="apply-card">
          <legend>2. Delivery</legend>
          <div className="apply-grid">
            <label className="field field--required">
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
