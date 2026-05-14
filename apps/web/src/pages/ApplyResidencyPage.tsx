import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { FormattedMessage, useIntl } from 'react-intl';
import { apiFetch } from '../api/client';
import { countries, getCountry } from '../auth/msalConfig';
import { appendCase } from '../utils/caseStore';
import { PlatformDiagram } from '../components/PlatformDiagram';

type SubmitResult = { correlationId?: string; caseId?: string; status?: string; error?: string };

const COUNTRY_LABEL: Record<string, string> = { dk: 'Denmark', se: 'Sweden', no: 'Norway' };

export function ApplyResidencyPage() {
  const intl = useIntl();
  const { accounts } = useMsal();
  const acc = accounts[0];
  const country = getCountry();
  const flag = countries.find((c) => c.code === country)?.flag ?? '🌐';

  const STEPS = useMemo(() => [
    intl.formatMessage({ id: 'apply.residency.step.1', defaultMessage: 'Your move' }),
    intl.formatMessage({ id: 'apply.residency.step.2', defaultMessage: 'Documents' }),
    intl.formatMessage({ id: 'apply.residency.step.3', defaultMessage: 'Review & submit' }),
  ], [intl]);

  const [step, setStep] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Live form state — kept in React so we can validate per step and show
  // a Review tab before submission.
  const [form, setForm] = useState({
    fromCountry: country,
    destination: '',
    moveDate: '',
    employerName: '',
    employerCountry: '',
    passportRef: '',
    dependents: 0,
    consentCrossBorder: false,
  });
  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => upd('fromCountry', country), [country]);

  function next() {
    if (step === 0 && (!form.destination || !form.moveDate)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  const step0Valid = Boolean(form.destination && form.moveDate);
  const canSubmit = step0Valid;

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const r = await apiFetch<SubmitResult>('/citizen-applications/', {
        method: 'POST',
        body: JSON.stringify({
          applicationType: 'residency-transfer',
          country,
          citizenUpn: acc?.username,
          ...form,
        }),
      });
      setResult(r);
      appendCase({
        id: r.caseId || r.correlationId || `res-${Date.now()}`,
        title: `Residency transfer to ${COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase() ?? '—'}`,
        status: r.status || 'Submitted · awaiting review',
        updatedAt: new Date().toISOString(),
        country,
        citizenUpn: acc?.username,
        applicationType: 'residency-transfer',
      });
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="res-title" className="apply-page">
      <header className="apply-page__head">
        <span className="apply-page__country" aria-label={intl.formatMessage({ id: 'apply.country.from', defaultMessage: 'Filing from {country}' }, { country: COUNTRY_LABEL[country] })}>
          <span aria-hidden="true">{flag}</span>{' '}
          <FormattedMessage id="apply.country.from" defaultMessage="Filing from {country}" values={{ country: COUNTRY_LABEL[country] }} />
        </span>
        <h1 id="res-title"><FormattedMessage id="apply.residency.title" defaultMessage="Residency transfer" /></h1>
        <p>
          <FormattedMessage id="apply.residency.lede" defaultMessage="One guided intake. We pre-fill the country-specific registration with your eID data, check the cross-border rules, and route your application to the competent national authority." />
        </p>
      </header>

      <aside className="bridge-callout" aria-label="Connected national registers">
        <div className="bridge-callout__text">
          <h3>Connected to the official population registers</h3>
          <p>
            UDCSP is a <strong>unified citizen platform</strong>. Depending on your destination, your
            registration is sent to the competent national authority — using your existing eID and the
            cross-border rules from Info Norden, Øresunddirekt and Grensetjänsten.
          </p>
        </div>
        <PlatformDiagram
          groups={[
            { country: 'Denmark', flag: '🇩🇰', items: [
              { label: 'CPR', sub: 'Population register' },
              { label: 'borger.dk', sub: 'Citizen portal' },
              { label: 'MitID', sub: 'eID' },
            ] },
            { country: 'Sweden', flag: '🇸🇪', items: [
              { label: 'Skatteverket', sub: 'Folkbokföring' },
              { label: 'BankID / Freja+', sub: 'eID' },
            ] },
            { country: 'Norway', flag: '🇳🇴', items: [
              { label: 'Skatteetaten', sub: 'Folkeregisteret' },
              { label: 'UDI', sub: 'Permits (non-Nordic)' },
              { label: 'Altinn', sub: 'Forms portal' },
              { label: 'ID-porten', sub: 'eID' },
            ] },
          ]}
        />
      </aside>

      <ol className="apply-stepper" aria-label="Application progress">
        {STEPS.map((label, idx) => (
          <li
            key={label}
            className={`apply-stepper__item${idx === step ? ' apply-stepper__item--current' : ''}${idx < step ? ' apply-stepper__item--done' : ''}`}
            aria-current={idx === step ? 'step' : undefined}
          >
            <span className="apply-stepper__num">{idx + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      <div className="apply-form">
        {step === 0 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.1" defaultMessage="Your move" /></legend>
            <div className="apply-grid">
              <label className="field field--required">
                <span>Destination country</span>
                <select value={form.destination} onChange={(e) => upd('destination', e.target.value)} required>
                  <option value="">Select…</option>
                  <option value="dk" disabled={country === 'dk'}>Denmark</option>
                  <option value="se" disabled={country === 'se'}>Sweden</option>
                  <option value="no" disabled={country === 'no'}>Norway</option>
                </select>
              </label>
              <label className="field field--required">
                <span>Planned move date</span>
                <input type="date" value={form.moveDate} onChange={(e) => upd('moveDate', e.target.value)} required />
              </label>
              <label className="field">
                <span>Dependents moving with you</span>
                <input type="number" min={0} max={10} value={form.dependents} onChange={(e) => upd('dependents', Number(e.target.value))} />
              </label>
              <label className="field">
                <span>New employer (optional)</span>
                <input value={form.employerName} onChange={(e) => upd('employerName', e.target.value)} placeholder="e.g. Volvo Group" />
              </label>
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.2" defaultMessage="Documents" /></legend>
            <p className="apply-card__hint">
              We pre-fill identity, address and tax data from your eID and the population register of {COUNTRY_LABEL[country]}.
              You only need to provide things we don&rsquo;t already have.
            </p>
            <div className="apply-grid">
              <label className="field">
                <span>Passport or national ID reference</span>
                <input value={form.passportRef} onChange={(e) => upd('passportRef', e.target.value)} placeholder="123-456-789" />
              </label>
              <label className="field">
                <span>Country of new employer (if any)</span>
                <select value={form.employerCountry} onChange={(e) => upd('employerCountry', e.target.value)}>
                  <option value="">Same as destination</option>
                  <option value="dk">Denmark</option>
                  <option value="se">Sweden</option>
                  <option value="no">Norway</option>
                </select>
              </label>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.3" defaultMessage="Review & submit" /></legend>
            <dl className="apply-review">
              <div><dt>Filing from</dt><dd>{flag} {country.toUpperCase()}</dd></div>
              <div><dt>Destination</dt><dd>{form.destination ? `${COUNTRY_LABEL[form.destination] ?? form.destination}` : '—'}</dd></div>
              <div><dt>Move date</dt><dd>{form.moveDate || '—'}</dd></div>
              <div><dt>Dependents</dt><dd>{form.dependents}</dd></div>
              <div><dt>Employer</dt><dd>{form.employerName || '—'} {form.employerCountry && `(${form.employerCountry.toUpperCase()})`}</dd></div>
              <div><dt>Passport / ID</dt><dd>{form.passportRef || 'pre-fill from eID'}</dd></div>
            </dl>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.consentCrossBorder}
                onChange={(e) => upd('consentCrossBorder', e.currentTarget.checked)}
              />
              <span>I allow verified cross-border checks with the destination country to validate this application.</span>
            </label>
          </fieldset>
        )}

        <div className="apply-stepper__actions">
          <button type="button" className="button-secondary" onClick={back} disabled={step === 0 || busy}><FormattedMessage id="apply.cta.back" defaultMessage="← Back" /></button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="button-primary" onClick={next} disabled={step === 0 && !step0Valid}>
              <FormattedMessage id="apply.cta.continue" defaultMessage="Continue →" />
            </button>
          ) : (
            <button type="button" className="button-primary" onClick={submit} disabled={busy || !canSubmit}>
              {busy ? <FormattedMessage id="apply.cta.submitting" defaultMessage="Submitting…" /> : <FormattedMessage id="apply.cta.submit" defaultMessage="Submit application" />}
            </button>
          )}
        </div>
      </div>

      {result?.error && <p role="alert" className="info-banner info-banner--warn">⚠ {result.error}</p>}
      {result && !result.error && (
        <article className="apply-result apply-result--likely-eligible" tabIndex={-1}>
          <h2>✅ <FormattedMessage id="apply.result.received" defaultMessage="Application received" /></h2>
          <p>
            <FormattedMessage id="apply.result.caseRef" defaultMessage="Case reference" /> <code>{result.caseId || result.correlationId || 'pending'}</code>.{' '}
            <Link to="/cases"><FormattedMessage id="apply.result.trackInCases" defaultMessage="Track in My cases →" /></Link>
          </p>
        </article>
      )}
    </section>
  );
}
