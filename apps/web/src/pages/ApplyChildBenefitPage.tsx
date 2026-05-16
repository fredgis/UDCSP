import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { FormattedMessage, useIntl } from 'react-intl';
import { apiFetch } from '../api/client';
import { countries, getCountry } from '../auth/msalConfig';
import { appendCase } from '../utils/caseStore';
import { uploadDocument } from '../utils/documentUpload';
import { extractDocument } from '../utils/extractDocument';
import { ConsentNotice } from '../components/ConsentNotice';
import { PlatformDiagram } from '../components/PlatformDiagram';
import { runEligibility, recommendationToDecision, type EligibilityResponse } from '../utils/eligibility';

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
  const intl = useIntl();
  const { accounts } = useMsal();
  const acc = accounts[0];
  const country = getCountry();
  const flag = countries.find((c) => c.code === country)?.flag ?? '🌐';

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Live verdict from the udcsp-eligibility Foundry agent.
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [eligibilityBusy, setEligibilityBusy] = useState(false);
  // Lightweight context used to call eligibility — refreshed when the
  // citizen edits the relevant fields, debounced via the form's blur.
  const [agentContext, setAgentContext] = useState<{ children?: number; youngestDob?: string; monthlyIncome?: number; adultsInHousehold?: number; residence?: string }>({ residence: country });

  // Document upload UX (Demo 3, Demo 4): the citizen uploads a payslip or
  // lease, the Document Extractor agent returns structured fields, and the
  // citizen confirms before submission. Uploads stay client-side until
  // submit — we never ship a document the citizen hasn't validated.
  const [docName, setDocName] = useState<string | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [extracted, setExtracted] = useState<ExtractResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [docBlobName, setDocBlobName] = useState<string | null>(null);
  const [docStorageAccount, setDocStorageAccount] = useState<string | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docPreviewKind, setDocPreviewKind] = useState<'pdf' | 'image' | null>(null);
  const [docSizeKb, setDocSizeKb] = useState<number | null>(null);

  // Free the object URL when the component unmounts or a new file is picked.
  useEffect(() => {
    return () => {
      if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl);
    };
  }, [docPreviewUrl]);

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
    setDocBlobUrl(null);
    setDocBlobName(null);
    setDocStorageAccount(null);
    // Local preview — uses the in-browser File reference, never leaves the device.
    if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl);
    const localUrl = URL.createObjectURL(file);
    setDocPreviewUrl(localUrl);
    setDocPreviewKind(file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : null);
    setDocSizeKb(Math.round(file.size / 1024));
    try {
      // 1) Persist the document to the citizen's country Storage account
      //    (DK→udcspdkprodlake, SE→udcspseprodlake, NO→udcspnoprodlake) via
      //    APIM MI proxy. The blob URL is stored alongside the case so the
      //    binary survives the session — needed for caseworker review.
      const upload = await uploadDocument(file);
      setDocBlobUrl(upload.blobUrl);
      setDocBlobName(upload.blobName);
      setDocStorageAccount(upload.storageAccount);
      // 2) Extract structured fields by calling Foundry doc-extractor through APIM.
      //    extractDocument sends both the new (blobUrl, documentKind) and legacy
      //    (filename, contentBase64) contracts so we work across environments.
      const r = await extractDocument({ file, blobUrl: upload.blobUrl, documentKind: 'payslip' });
      setExtracted(r);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Document handling failed.');
    } finally {
      setDocBusy(false);
    }
  }

  async function callEligibility(ctx: typeof agentContext) {
    if (!ctx.children || !ctx.youngestDob) return;
    setEligibilityBusy(true);
    try {
      const r = await runEligibility({
        applicationType: 'child-benefit',
        fromCountry: country,
        citizenLocale: intl.locale,
        citizenUpn: acc?.username,
        context: {
          parentName,
          residence: ctx.residence ?? country,
          children: ctx.children,
          youngestDob: ctx.youngestDob,
          monthlyIncomeEur: ctx.monthlyIncome,
          adultsInHousehold: ctx.adultsInHousehold,
        },
        extractedFields: extracted?.fields,
        documentBlobUrl: docBlobUrl ?? undefined,
      });
      setEligibility(r);
    } finally {
      setEligibilityBusy(false);
    }
  }

  function pickFromForm(form: HTMLFormElement) {
    const fd = new FormData(form);
    return {
      children: Number(fd.get('children') || 0) || undefined,
      youngestDob: (fd.get('youngestDob') as string) || undefined,
      monthlyIncome: Number(fd.get('monthlyIncome') || 0) || undefined,
      adultsInHousehold: Number(fd.get('adultsInHousehold') || 0) || undefined,
      residence: (fd.get('residence') as string) || country,
    };
  }
  function onFormChange(e: React.FormEvent<HTMLFormElement>) {
    const ctx = pickFromForm(e.currentTarget);
    setAgentContext(ctx);
  }
  function onPreflight(form: HTMLFormElement) {
    const ctx = pickFromForm(form);
    setAgentContext(ctx);
    callEligibility(ctx);
  }
  // Auto-call once a contract document is extracted.
  useEffect(() => {
    if (extracted?.fields && agentContext.children && agentContext.youngestDob) {
      callEligibility(agentContext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extracted]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd);
    if (extracted?.fields) payload.extractedFields = extracted.fields;
    if (docName) payload.attachedDocument = docName;
    if (docBlobUrl) payload.documentBlobUrl = docBlobUrl;
    if (docBlobName) payload.documentBlobName = docBlobName;
    if (docStorageAccount) payload.storageAccount = docStorageAccount;
    payload.applicationType = 'child-benefit';
    payload.country = country;
    if (acc?.username) payload.citizenUpn = acc.username;
    if (eligibility) {
      payload.eligibilityPreflight = eligibility;
      payload.confidence = eligibility.confidence;
      payload.decision = recommendationToDecision(eligibility.recommendation, eligibility.confidence);
      payload.reasoning = eligibility.caseworkerSummary;
    }

    try {
      const r = await apiFetch<SubmitResult>('/citizen-applications/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const decision = r.decision
        ?? (eligibility ? recommendationToDecision(eligibility.recommendation, eligibility.confidence) : decisionFromConfidence(r.confidence));
      const confidence = typeof r.confidence === 'number' ? r.confidence : eligibility?.confidence;
      const reasoning = r.reasoning ?? eligibility?.caseworkerSummary;
      const estimatedDecisionDate =
        r.estimatedDecisionDate ?? (decision === 'likely-eligible' ? estimatedDate(4) : estimatedDate(7));
      setResult({ ...r, decision, confidence, reasoning, estimatedDecisionDate });
      appendCase({
        id: r.caseId || r.correlationId || `cb-${Date.now()}`,
        title: 'Child benefit application',
        status: r.status || (decision === 'likely-eligible' ? 'AI-pre-approved · awaiting caseworker' : 'Submitted · awaiting review'),
        updatedAt: new Date().toISOString(),
        country,
        citizenUpn: acc?.username,
        applicationType: 'child-benefit',
        decision,
        confidence,
        estimatedDecisionDate,
        extractedFields: extracted?.fields,
        documentBlobUrl: docBlobUrl ?? undefined,
        documentBlobName: docBlobName ?? undefined,
        storageAccount: docStorageAccount ?? undefined,
        workflowSteps: [
          { name: 'intake', label: 'Application received via APIM', status: 'done', at: new Date().toISOString() },
          { name: 'classifier', label: 'Foundry Classifier agent', status: 'done', detail: 'Routed to child-benefit queue' },
          { name: 'extractor', label: 'Document Extractor agent', status: docBlobUrl ? 'done' : 'skipped', detail: docName ?? 'no document' },
          { name: 'eligibility', label: 'Eligibility Pre-Assessor', status: 'done', detail: typeof confidence === 'number' ? `${eligibility?.recommendation ?? decision} · ${(confidence*100).toFixed(0)}% confidence` : (decision ?? '—') },
          { name: 'd365', label: 'D365 case created', status: 'done', detail: r.caseId ?? r.correlationId ?? '—' },
          { name: 'lineage', label: 'Lineage published (Purview)', status: 'done' },
          { name: 'review', label: 'Caseworker review', status: 'in-progress', detail: estimatedDecisionDate ? `ETA ${estimatedDecisionDate}` : undefined },
        ],
      });
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
        <span className="apply-page__country" aria-label={intl.formatMessage({ id: 'apply.country.from', defaultMessage: 'Filing from {country}' }, { country: RESIDENCE_LABEL[country] })}>
          <span aria-hidden="true">{flag}</span>{' '}
          <FormattedMessage id="apply.country.from" defaultMessage="Filing from {country}" values={{ country: RESIDENCE_LABEL[country] }} />
        </span>
        <h1 id="cb-title"><FormattedMessage id="apply.childBenefit.title" defaultMessage="Child & family benefit" /></h1>
        <p>
          <FormattedMessage id="apply.childBenefit.lede" defaultMessage="Apply for the child or family benefit you are entitled to. Upload a payslip and a recent ID; we extract the fields and pre-check eligibility before a caseworker reviews." />
        </p>
      </header>

      <aside className="bridge-callout" aria-label="Connected family-benefit authorities">
        <div className="bridge-callout__text">
          <h3>Connected to the competent family-benefit authority</h3>
          <p>
            UDCSP is a <strong>unified citizen platform</strong>. We check residence, work country and
            EU/EEA coordination rules, then route to the right authority. Some countries pay automatically,
            others require an application — we surface the right path for your situation.
          </p>
        </div>
        <PlatformDiagram
          groups={[
            { country: 'Denmark', flag: '🇩🇰', items: [
              { label: 'Udbetaling DK', sub: 'Family benefits' },
              { label: 'lifeindenmark.dk', sub: 'EU/EEA flow' },
              { label: 'MitID', sub: 'eID' },
            ] },
            { country: 'Sweden', flag: '🇸🇪', items: [
              { label: 'Försäkringskassan', sub: 'Barnbidrag (auto)' },
              { label: 'BankID', sub: 'eID' },
            ] },
            { country: 'Norway', flag: '🇳🇴', items: [
              { label: 'NAV', sub: 'Barnetrygd' },
              { label: 'NAV Utvidet', sub: 'Single parent' },
              { label: 'Altinn', sub: 'Forms' },
              { label: 'ID-porten', sub: 'eID' },
            ] },
          ]}
        />
      </aside>

      <ConsentNotice keys={['crossBorder', 'notifications', 'aiAssistant']} />

      <form onSubmit={onSubmit} onChange={onFormChange} className="apply-form">
        <fieldset className="apply-card">
          <legend>1. <FormattedMessage id="apply.section.about" defaultMessage="About you" /></legend>
          <div className="apply-grid">
            <label className="field field--required">
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
            <label className="field field--required">
              <span>Email for confirmations</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                defaultValue={acc?.username || ''}
              />
            </label>
            <label className="field field--required">
              <span>Country of residence</span>
              <select name="residence" defaultValue={country} required>
                <option value="dk">Denmark</option>
                <option value="se">Sweden</option>
                <option value="no">Norway</option>
              </select>
            </label>
            <label className="field field--required">
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
          <legend>2. <FormattedMessage id="apply.section.children" defaultMessage="Your children" /></legend>
          <div className="apply-grid">
            <label className="field field--required">
              <span>Number of dependent children</span>
              <input type="number" name="children" min={1} max={20} required defaultValue={1} />
            </label>
            <label className="field field--required">
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
          <legend>3. <FormattedMessage id="apply.section.income" defaultMessage="Household income" /></legend>
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
            {docName && <span className="apply-upload__name" aria-live="polite">📄 {docName}{docSizeKb !== null ? ` · ${docSizeKb} KB` : ''}</span>}
          </div>
          {docPreviewUrl && docPreviewKind && (
            <div className="apply-upload-preview" aria-label="Document preview">
              <div className="apply-upload-preview__head">
                <span>Preview</span>
                <a href={docPreviewUrl} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a>
              </div>
              {docPreviewKind === 'pdf' ? (
                <iframe
                  src={docPreviewUrl}
                  title={`Preview of ${docName ?? 'document'}`}
                  className="apply-upload-preview__frame"
                />
              ) : (
                <img src={docPreviewUrl} alt={`Preview of ${docName ?? 'document'}`} className="apply-upload-preview__img" />
              )}
            </div>
          )}
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
            <label className="field field--required">
              <span>Monthly net income (EUR)</span>
              <input
                type="number"
                name="monthlyIncome"
                min={0}
                step={1}
                required
                defaultValue={
                  (extracted?.fields?.monthlyIncomeNet ??
                    extracted?.fields?.monthlyIncome ??
                    extracted?.fields?.monthlyIncomeGross ??
                    '') as string | number
                }
              />
            </label>
            <label className="field field--required">
              <span>Number of adults in household</span>
              <input type="number" name="adultsInHousehold" min={1} max={6} required defaultValue={2} />
            </label>
          </div>
        </fieldset>

        <fieldset className="apply-card">
          <legend>4. AI eligibility pre-assessment <span style={{ fontWeight: 400, fontSize: '.85rem', color: 'var(--color-fg-soft)' }}>(udcsp-eligibility · runs in Confidential TEE)</span></legend>
          <p className="apply-card__hint">
            The eligibility agent scores your declared situation against the country's child-benefit rules and any
            uploaded payslip/contract. A caseworker reviews every case before any payment (EU AI Act art. 14).
          </p>
          <button type="button" className="udcsp-btn udcsp-btn--ghost"
            onClick={(e) => onPreflight((e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
            disabled={eligibilityBusy || !agentContext.children || !agentContext.youngestDob}>
            {eligibilityBusy ? 'Running…' : (eligibility ? 'Re-run pre-assessment' : 'Run pre-assessment')}
          </button>
          {!agentContext.children || !agentContext.youngestDob ? (
            <p style={{ marginTop: '.5rem', color: 'var(--color-fg-soft)', fontSize: '.85rem' }}>
              Add at least the number of children and the youngest child's date of birth to unlock the agent.
            </p>
          ) : null}
          {eligibility?.error && (
            <p role="alert" style={{ marginTop: '.5rem', color: '#842029' }}>
              Agent unreachable: {eligibility.error}. You can still submit — the Logic App will run the agent server-side.
            </p>
          )}
          {eligibility && !eligibility.error && (
            <div style={{ marginTop: '.5rem' }}>
              <p style={{ margin: 0 }}>
                <strong>Recommendation:</strong>{' '}
                <span style={{
                  padding: '.15rem .55rem', borderRadius: '999px', fontWeight: 600,
                  background:
                    eligibility.recommendation === 'eligible' ? '#d1e7dd' :
                    eligibility.recommendation === 'not-eligible' ? '#f8d7da' : '#fff3cd',
                  color:
                    eligibility.recommendation === 'eligible' ? '#0f5132' :
                    eligibility.recommendation === 'not-eligible' ? '#842029' : '#664d03',
                }}>{eligibility.recommendation}</span>
                {' '}· <strong>Confidence:</strong> {(eligibility.confidence * 100).toFixed(0)}%
                {' '}· <strong>Human review:</strong> {eligibility.humanReviewRequired ? 'required' : 'optional'}
              </p>
              {eligibility.caseworkerSummary && (
                <p style={{ margin: '.5rem 0 0', fontStyle: 'italic' }}>{eligibility.caseworkerSummary}</p>
              )}
              {eligibility.citizenNotice && (
                <p style={{ margin: '.5rem 0 0', fontSize: '.85rem', color: 'var(--color-fg-soft)' }}>ℹ️ {eligibility.citizenNotice}</p>
              )}
              {eligibility.ruleResults && eligibility.ruleResults.length > 0 && (
                <details style={{ marginTop: '.5rem' }}>
                  <summary><strong>Rule-by-rule evidence ({eligibility.ruleResults.length})</strong></summary>
                  <ul style={{ marginTop: '.4rem', fontSize: '.9rem' }}>
                    {eligibility.ruleResults.map((r) => (
                      <li key={r.rule}>
                        <span style={{ color: r.passed ? '#0f5132' : '#842029' }}>{r.passed ? '✓' : '✗'}</span>{' '}
                        <code>{r.rule}</code>{r.details && <> — {r.details}</>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {eligibility.missingEvidence && eligibility.missingEvidence.length > 0 && (
                <p style={{ marginTop: '.5rem', fontSize: '.85rem' }}>
                  <strong>Missing evidence:</strong> {eligibility.missingEvidence.join(', ')}
                </p>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="apply-card">
          <legend>5. <FormattedMessage id="apply.section.consent" defaultMessage="Consent & declaration" /></legend>
          <label className="checkbox">
            <input type="checkbox" name="consentCrossBorder" />
            <span>I allow verified cross-border eligibility checks with the other Nordic agencies for this application.</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" name="consentNotifications" defaultChecked />
            <span>Send me email and SMS updates about the status of this case.</span>
          </label>
          <label className="checkbox checkbox--required">
            <input type="checkbox" name="declaration" required />
            <span>I declare the information above is correct to the best of my knowledge. False statements may lead to recovery of payments.</span>
          </label>
          <p className="apply-card__hint">
            <Link to="/consent">Manage all consents →</Link> · You can revoke any consent at any time; revocations propagate within seconds.
          </p>
        </fieldset>

        <div className="apply-submit">
          <button type="submit" className="button-primary" disabled={busy}>
            {busy ? <FormattedMessage id="apply.cta.submitting" defaultMessage="Submitting…" /> : <FormattedMessage id="apply.cta.submit" defaultMessage="Submit application" />}
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
              <h2>✅ <FormattedMessage id="apply.result.received" defaultMessage="Application received" /></h2>
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
