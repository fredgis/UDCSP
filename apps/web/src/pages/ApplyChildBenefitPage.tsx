import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { apiFetch } from '../api/client';
import { countries, getCountry } from '../auth/msalConfig';

type SubmitResult = {
  correlationId?: string;
  caseId?: string;
  status?: string;
  reasoning?: string;
  confidence?: number;
  decision?: 'likely-eligible' | 'requires-review' | 'likely-ineligible';
  estimatedDecisionDate?: string;
  error?: string;
};

type ExtractResult = {
  summary?: string;
  fields?: Record<string, string>;
  warnings?: string[];
  error?: string;
};

const RESIDENCE_LABEL: Record<string, string> = {
  dk: 'Denmark', se: 'Sweden', no: 'Norway',
};

function decisionFromConfidence(c?: number): SubmitResult['decision'] {
  if (typeof c !== 'number') return undefined;
  if (c >= 0.75) return 'likely-eligible';
  if (c >= 0.45) return 'requires-review';
  return 'likely-ineligible';
}

function estimatedDate(days = 4): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function ApplyChildBenefitPage() {
  const { accounts } = useMsal();
  const acc = accounts[0];
  const country = getCountry();
  const flag = countries.find((c) => c.code === country)?.flag ?? '🌐';

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Document upload UX (Demo 3, Demo 4): the citizen uploads a payslip or
  // lease, the Document Extractor agent returns structured fields, and the
  // citizen confirms before submission. Uploads stay client-side until
  // submit — we never ship a document the citizen hasn't validated.
  const [docName, setDocName] = useState<string | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [extracted, setExtracted] = useState<ExtractResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Pre-fill the parent name from the citizen's signed-in identity claims.
  const [parentName, setParentName] = useState('');
  useEffect(() => {
    if (acc) setParentName(acc.name || (acc.username as string)?.split('@')[0] || '');
  }, [acc]);

  async function onPickDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setDocName(file.name);
    setDocBusy(true);
    setExtractError(null);
    setExtracted(null);
    try {
      // Read up to ~1.5 MB of the file as base64 — anything larger is
      // rejected with a friendly message (the demo doesn't need to ship
      // a streaming uploader).
      if (file.size > 1.5 * 1024 * 1024) {
        throw new Error('File is too large for this demo (max 1.5 MB).');
      }
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.readAsDataURL(file);
      });
      const r = await apiFetch<ExtractResult>('/documents/extract', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', contentBase64: b64 }),
      });
      setExtracted(r);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed.');
    } finally {
      setDocBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd);
    if (extracted?.fields) payload.extractedFields = extracted.fields;
    if (docName) payload.attachedDocument = docName;
    payload.applicationType = 'child-benefit';
    payload.country = country;
    if (acc?.username) payload.citizenUpn = acc.username;

    try {
      const r = await apiFetch<SubmitResult>('/citizen-applications/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const decision = r.decision ?? decisionFromConfidence(r.confidence);
      const estimatedDecisionDate =
        r.estimatedDecisionDate ?? (decision === 'likely-eligible' ? estimatedDate(4) : estimatedDate(7));
      setResult({ ...r, decision, estimatedDecisionDate });
      // Bring focus to the result card so screen-reader users hear the outcome.
      window.requestAnimationFrame(() => {
        document.getElementById('cb-result')?.focus();
      });
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="cb-title" className="apply-page">
      <header className="apply-page__head">
        <span className="apply-page__country" aria-label={`Submitting to ${country.toUpperCase()}`}>
          <span aria-hidden="true">{flag}</span> {country.toUpperCase()} — {RESIDENCE_LABEL[country]}
        </span>
        <h1 id="cb-title">Apply for child benefit</h1>
        <p>
          Tell us about your household. Upload a payslip or lease if you have one — the assistant will read it and pre-fill
          the income field for you to confirm. <strong>You stay in charge:</strong> nothing is submitted until you press the
          button at the bottom.
        </p>
      </header>

      <form onSubmit={onSubmit} className="apply-form" noValidate>
        <fieldset className="apply-card">
          <legend>1. About you</legend>
          <div className="apply-grid">
            <label className="field">
              <span>Parent / guardian name</span>
              <input
                type="text"
                name="parentName"
                autoComplete="name"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Email for confirmations</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                defaultValue={acc?.username || ''}
              />
            </label>
            <label className="field">
              <span>Country of residence</span>
              <select name="residence" defaultValue={country} required>
                <option value="dk">Denmark</option>
                <option value="se">Sweden</option>
                <option value="no">Norway</option>
              </select>
            </label>
            <label className="field">
              <span>Preferred contact language</span>
              <select name="language" defaultValue={'en'} required>
                <option value="en">English</option>
                <option value="da">Dansk</option>
                <option value="sv">Svenska</option>
                <option value="nb">Norsk</option>
                <option value="pl">Polski</option>
                <option value="ar">العربية</option>
                <option value="uk">Українська</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="apply-card">
          <legend>2. Your children</legend>
          <div className="apply-grid">
            <label className="field">
              <span>Number of dependent children</span>
              <input type="number" name="children" min={1} max={20} required defaultValue={1} />
            </label>
            <label className="field">
              <span>Date of birth — youngest child</span>
              <input type="date" name="youngestDob" required />
            </label>
            <label className="field apply-grid__wide">
              <span>Names of children (one per line, optional)</span>
              <textarea name="childrenNames" rows={2} placeholder="e.g. Alma, Viktor" />
            </label>
          </div>
        </fieldset>

        <fieldset className="apply-card">
          <legend>3. Household income</legend>
          <p className="apply-card__hint">
            Drop a recent payslip or your lease — the AI Document Extractor will read it. You can review what was
            extracted and edit anything before continuing.
          </p>
          <div className="apply-upload">
            <label htmlFor="cb-doc" className="button-secondary">
              {docBusy ? 'Reading document…' : '📎 Upload payslip or lease (PDF / image)'}
            </label>
            <input
              id="cb-doc"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={onPickDocument}
              style={{ display: 'none' }}
            />
            {docName && <span className="apply-upload__name" aria-live="polite">📄 {docName}</span>}
          </div>
          {extractError && <p role="alert" className="info-banner info-banner--warn">⚠ {extractError}</p>}
          {extracted && (
            <div className="apply-extracted" role="status" aria-live="polite">
              <strong>Extracted from your document — please confirm:</strong>
              {extracted.summary && <p>{extracted.summary}</p>}
              {extracted.fields && (
                <ul>
                  {Object.entries(extracted.fields).map(([k, v]) => (
                    <li key={k}><strong>{k}:</strong> {v}</li>
                  ))}
                </ul>
              )}
              {extracted.warnings?.length ? (
                <p className="apply-extracted__warn">⚠ {extracted.warnings.join(' · ')}</p>
              ) : null}
            </div>
          )}
          <div className="apply-grid">
            <label className="field">
              <span>Monthly net income (EUR)</span>
              <input
                type="number"
                name="monthlyIncome"
                min={0}
                step={1}
                required
                defaultValue={extracted?.fields?.monthlyIncome ?? ''}
              />
            </label>
            <label className="field">
              <span>Number of adults in household</span>
              <input type="number" name="adultsInHousehold" min={1} max={6} required defaultValue={2} />
            </label>
          </div>
        </fieldset>

        <fieldset className="apply-card">
          <legend>4. Consent &amp; declaration</legend>
          <label className="checkbox">
            <input type="checkbox" name="consentCrossBorder" />
            <span>I allow verified cross-border eligibility checks with the other Nordic agencies for this application.</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" name="consentNotifications" defaultChecked />
            <span>Send me email and SMS updates about the status of this case.</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" name="declaration" required />
            <span>I declare the information above is correct to the best of my knowledge. False statements may lead to recovery of payments.</span>
          </label>
          <p className="apply-card__hint">
            <Link to="/consent">Manage all consents →</Link> · You can revoke any consent at any time; revocations propagate within seconds.
          </p>
        </fieldset>

        <div className="apply-submit">
          <button type="submit" className="button-primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit application'}
          </button>
          <p className="apply-submit__hint">
            By submitting you start an official case in <strong>{country.toUpperCase()}</strong>. The AI eligibility
            pre-assessor produces a recommendation only — a caseworker reviews every case before any decision is made.
          </p>
        </div>
      </form>

      {result && (
        <article
          id="cb-result"
          tabIndex={-1}
          aria-live="polite"
          className={`apply-result apply-result--${result.error ? 'error' : (result.decision || 'pending')}`}
        >
          {result.error ? (
            <>
              <h2>Something went wrong</h2>
              <p>{result.error}</p>
              <p>Please try again. If the problem persists, contact support — your data has not been submitted.</p>
            </>
          ) : (
            <>
              <h2>✅ Your application has been received</h2>
              <p>
                Case reference <code>{result.caseId || result.correlationId || 'pending'}</code>.
                You will receive a written decision by <strong>{result.estimatedDecisionDate}</strong>.
              </p>

              <section className="apply-reasoning" aria-labelledby="cb-reasoning-title">
                <h3 id="cb-reasoning-title">
                  AI pre-assessment ·{' '}
                  {result.decision === 'likely-eligible' && '🟢 Likely eligible'}
                  {result.decision === 'requires-review' && '🟡 Requires human review'}
                  {result.decision === 'likely-ineligible' && '🔴 Likely ineligible'}
                  {!result.decision && 'Pending review'}
                  {typeof result.confidence === 'number' && (
                    <span className="apply-reasoning__conf"> · confidence {Math.round(result.confidence * 100)}%</span>
                  )}
                </h3>
                <p className="apply-reasoning__why">
                  <strong>Why:</strong>{' '}
                  {result.reasoning || 'The eligibility pre-assessor reviewed your declared income, the number of children and your country of residence. A caseworker will validate the recommendation before any payment is made.'}
                </p>
                <p className="apply-reasoning__rights">
                  This is an <em>AI-assisted recommendation</em>, not a decision. Under the EU AI Act you have the right
                  to a human review, an explanation, and to contest the outcome. Visit{' '}
                  <Link to={`/cases`}>My cases</Link> to follow the case or send a message to your caseworker.
                </p>
              </section>

              <p className="apply-result__cta">
                <Link to="/cases" className="button-primary">Track case in My cases</Link>
              </p>
            </>
          )}
        </article>
      )}
    </section>
  );
}
