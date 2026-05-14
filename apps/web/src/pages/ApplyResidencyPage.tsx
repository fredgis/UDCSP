import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { FormattedMessage, useIntl } from 'react-intl';
import { apiFetch } from '../api/client';
import { countries, getCountry } from '../auth/msalConfig';
import { appendCase } from '../utils/caseStore';
import { uploadDocument, readFileAsBase64 } from '../utils/documentUpload';
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

const COUNTRY_LABEL: Record<string, string> = { dk: 'Denmark', se: 'Sweden', no: 'Norway' };
const ORIGIN_REGISTER: Record<string, { eid: string; broker: string; register: string }> = {
  dk: { eid: 'MitID', broker: 'Criipto Verify', register: 'CPR (Det Centrale Personregister)' },
  se: { eid: 'BankID', broker: 'Criipto Verify', register: 'Skatteverket Folkbokföring' },
  no: { eid: 'BankID Norge / ID-porten', broker: 'Criipto Verify', register: 'Skatteetaten Folkeregisteret' },
};

// Eligibility criteria displayed in step 4 — these are the rules the
// Eligibility Pre-Assessor agent will check on the back-end. No client
// simulation: the verdict comes back from the agent on submit.
const ELIGIBILITY_CRITERIA: Array<{ id: string; legal: string; what: string }> = [
  {
    id: 'nordic-convention',
    legal: 'Nordic Convention on Social Security (1955, last amended 2014)',
    what: 'Nordic citizens may move freely between Nordic countries and register residence without a permit. Pension, sickness and unemployment rights are coordinated.',
  },
  {
    id: 'eu-reg-883-2004',
    legal: 'EU Regulation 883/2004 — coordination of social-security systems',
    what: 'Determines which Member State pays family, pension and unemployment benefits when a citizen lives in one country and works in another (lex loci laboris).',
  },
  {
    id: 'employment-claim',
    legal: 'Verified employment claim',
    what: 'A signed employment contract for the destination country supports portability of acquired pension rights (art. 50) and registration of habitual residence.',
  },
  {
    id: 'eidas-high',
    legal: 'eIDAS Regulation 910/2014 — assurance level High',
    what: 'Authentication via national eID at assurance level High satisfies the cross-border identity requirement under art. 6.',
  },
  {
    id: 'claims-mediation',
    legal: 'GDPR art. 5(1)(c) — data minimisation',
    what: 'Only signed claims (not raw national ID) cross the border, satisfying minimisation when transmitting personal data between member-state authorities.',
  },
  {
    id: 'human-review',
    legal: 'EU AI Act art. 14 — human oversight',
    what: 'A caseworker in the destination country reviews and approves every cross-border residency decision. The AI verdict is a recommendation, never the final decision.',
  },
];

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

export function ApplyResidencyPage() {
  const intl = useIntl();
  const { accounts } = useMsal();
  const acc = accounts[0];
  const country = getCountry();
  const flag = countries.find((c) => c.code === country)?.flag ?? '🌐';
  const origin = ORIGIN_REGISTER[country] ?? ORIGIN_REGISTER.dk;

  // 6 steps mapping 1-for-1 to docs/biz/uses.md §Demo 1 walk-through.
  const STEPS = useMemo(() => [
    intl.formatMessage({ id: 'apply.residency.step.move', defaultMessage: 'Your move' }),
    intl.formatMessage({ id: 'apply.residency.step.identity', defaultMessage: 'Identity (pre-filled)' }),
    intl.formatMessage({ id: 'apply.residency.step.docs', defaultMessage: 'Documents' }),
    intl.formatMessage({ id: 'apply.residency.step.eligibility', defaultMessage: 'Eligibility criteria' }),
    intl.formatMessage({ id: 'apply.residency.step.consent', defaultMessage: 'Cross-border consent' }),
    intl.formatMessage({ id: 'apply.residency.step.review', defaultMessage: 'Review & submit' }),
  ], [intl]);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Live verdict from the udcsp-eligibility Foundry agent (called via APIM).
  // Refreshed automatically when the citizen reaches step 4 with enough data.
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [eligibilityBusy, setEligibilityBusy] = useState(false);
  const [eligibilityRanForKey, setEligibilityRanForKey] = useState<string | null>(null);

  // Document upload + Foundry doc-extractor (real back-end calls).
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

  useEffect(() => () => { if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl); }, [docPreviewUrl]);

  // Form state.
  const [form, setForm] = useState({
    fromCountry: country,
    destination: '',
    moveDate: '',
    employerName: '',
    employerCountry: '',
    passportRef: '',
    dependents: 0,
    destinationAddress: '',
    consentCrossBorder: false,
    consentClaimsMediation: false,
  });
  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  useEffect(() => upd('fromCountry', country), [country]);

  // Pre-filled identity claims surfaced from MSAL account.
  const identity = useMemo(() => {
    const emailUser = (acc?.username || 'citizen').split('@')[0].split('.');
    const given = acc?.name?.split(' ')[0]
      || (emailUser[0] ? emailUser[0][0].toUpperCase() + emailUser[0].slice(1) : 'Anna');
    const family = acc?.name?.split(' ').slice(1).join(' ')
      || (emailUser[1] ? emailUser[1][0].toUpperCase() + emailUser[1].slice(1) : 'Hansen');
    const cprMask = country === 'dk' ? '••••••-1234' : country === 'se' ? '19••••••-•234' : '••••••-12345';
    return { given, family, cprMask, assurance: 'eIDAS High', eid: origin.eid, broker: origin.broker, register: origin.register };
  }, [acc, country, origin]);

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
    if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl);
    const localUrl = URL.createObjectURL(file);
    setDocPreviewUrl(localUrl);
    setDocPreviewKind(file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : null);
    setDocSizeKb(Math.round(file.size / 1024));
    try {
      const upload = await uploadDocument(file);
      setDocBlobUrl(upload.blobUrl);
      setDocBlobName(upload.blobName);
      setDocStorageAccount(upload.storageAccount);
      const b64 = await readFileAsBase64(file);
      const r = await apiFetch<ExtractResult>('/agent-doc-extractor/extract', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', contentBase64: b64 }),
      });
      setExtracted(r);
      // Pre-fill employer fields from the extraction so step 6 shows real values.
      const empName = r.fields?.employer || r.fields?.employerName || r.fields?.companyName;
      if (empName && !form.employerName) upd('employerName', String(empName));
      if (!form.employerCountry && form.destination) upd('employerCountry', form.destination);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Document handling failed.');
    } finally {
      setDocBusy(false);
    }
  }

  function next() {
    if (step === 0 && (!form.destination || !form.moveDate)) return;
    if (step === 4 && !(form.consentCrossBorder && form.consentClaimsMediation)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  // Auto-call the eligibility agent the first time the citizen lands on
  // step 4 with the minimum viable context (origin + destination + move
  // date). Re-call when those inputs change. The button below the panel
  // also lets the citizen retry manually.
  async function callEligibility() {
    setEligibilityBusy(true);
    try {
      const r = await runEligibility({
        applicationType: 'residency-transfer',
        fromCountry: country,
        destinationCountry: form.destination || undefined,
        citizenLocale: intl.locale,
        citizenUpn: acc?.username,
        context: {
          arrivalDate: form.moveDate,
          intendedStayMonths: 24,
          destinationAddress: form.destinationAddress,
          dependents: form.dependents,
          employerName: form.employerName || extracted?.fields?.employer,
          employerCountry: form.employerCountry || form.destination,
          passportRef: form.passportRef,
          citizen: { givenName: identity.given, familyName: identity.family, country },
        },
        extractedFields: extracted?.fields,
        documentBlobUrl: docBlobUrl ?? undefined,
      });
      setEligibility(r);
    } finally {
      setEligibilityBusy(false);
    }
  }

  // Re-trigger when the citizen reaches step 4 OR when the inputs that
  // matter for the verdict change (move date, destination, employer,
  // extracted contract fields).
  const eligibilityKey = useMemo(() => JSON.stringify([
    form.destination, form.moveDate, form.employerName, form.employerCountry, docBlobName,
    extracted?.fields ? Object.keys(extracted.fields).length : 0,
  ]), [form.destination, form.moveDate, form.employerName, form.employerCountry, docBlobName, extracted]);

  useEffect(() => {
    if (step !== 3) return;
    if (!form.destination || !form.moveDate) return;
    if (eligibilityRanForKey === eligibilityKey) return;
    setEligibilityRanForKey(eligibilityKey);
    callEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, eligibilityKey]);

  const step0Valid = Boolean(form.destination && form.moveDate);
  const canSubmit = step0Valid && form.consentCrossBorder && form.consentClaimsMediation && !busy;

  async function submit() {
    setBusy(true);
    setResult(null);
    const payload: Record<string, unknown> = {
      applicationType: 'residency-transfer',
      country,
      citizenUpn: acc?.username,
      ...form,
      // Cross-border routing markers consumed by the application-intake LA so it
      // can fan out to the cross-border-residency LA when destination ≠ origin.
      crossBorder: form.fromCountry !== form.destination,
      claimsEnvelope: 'signed-jwt-eidas-high',
    };
    if (extracted?.fields) payload.extractedFields = extracted.fields;
    if (docName) payload.attachedDocument = docName;
    if (docBlobUrl) payload.documentBlobUrl = docBlobUrl;
    if (docBlobName) payload.documentBlobName = docBlobName;
    if (docStorageAccount) payload.storageAccount = docStorageAccount;
    // Carry the eligibility verdict so the LA records it without re-running
    // (the LA still calls the agent for the AI Act audit registry).
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
      const estimatedDecisionDate = r.estimatedDecisionDate
        ?? (decision === 'likely-eligible' ? estimatedDate(4) : estimatedDate(7));
      setResult({ ...r, decision, confidence, reasoning, estimatedDecisionDate });
      appendCase({
        id: r.caseId || r.correlationId || `res-${Date.now()}`,
        title: `Residency transfer to ${COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase() ?? '—'}`,
        status: r.status || (decision === 'likely-eligible' ? 'AI-pre-approved · cross-border handoff in progress' : 'Submitted · awaiting caseworker review'),
        updatedAt: new Date().toISOString(),
        country,
        citizenUpn: acc?.username,
        applicationType: 'residency-transfer',
        decision,
        confidence,
        estimatedDecisionDate,
        extractedFields: extracted?.fields,
        documentBlobUrl: docBlobUrl ?? undefined,
        documentBlobName: docBlobName ?? undefined,
        storageAccount: docStorageAccount ?? undefined,
        workflowSteps: [
          { name: 'intake', label: 'Application received via APIM', status: 'done', at: new Date().toISOString() },
          { name: 'classifier', label: 'Foundry Classifier agent', status: 'done', detail: 'Routed to cross-border-residency queue' },
          { name: 'extractor', label: 'Document Extractor agent', status: docBlobUrl ? 'done' : 'skipped', detail: docName ?? 'no document' },
          { name: 'eligibility', label: 'Eligibility Pre-Assessor (TEE)', status: 'done', detail: typeof confidence === 'number' ? `${eligibility?.recommendation ?? decision} · ${(confidence * 100).toFixed(0)}% confidence` : (decision ?? '—') },
          { name: 'claims-envelope', label: 'Signed claims envelope (eIDAS High)', status: 'done', detail: 'Sealed in DK sovereign zone · Purview Restricted-Cross-Border' },
          { name: 'cross-border', label: `Cross-border handoff to ${COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase()}`, status: 'done', detail: 'Service Bus · cross-border-coordination queue' },
          { name: 'd365', label: `D365 case created in ${COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase()}`, status: 'done', detail: r.caseId ?? r.correlationId ?? '—' },
          { name: 'lineage', label: 'Lineage published (Purview)', status: 'done' },
          { name: 'review', label: 'Caseworker review (Astrid · Copilot for Service)', status: 'in-progress', detail: estimatedDecisionDate ? `ETA ${estimatedDecisionDate}` : undefined },
          { name: 'notification', label: 'Notification (Azure Communication Services)', status: 'pending' },
          { name: 'verified-id', label: 'Verified ID issuance (EUDI Wallet)', status: 'pending' },
        ],
      });
      window.requestAnimationFrame(() => document.getElementById('res-result')?.focus());
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : String(err) });
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
          <FormattedMessage
            id="apply.residency.lede"
            defaultMessage="One guided intake. We pre-fill from your eID and the {origin} population register, the Foundry Document Extractor reads your contract, and the Eligibility Pre-Assessor checks Nordic / EU rules — then we orchestrate the cross-border handoff. No personal data crosses the border in the clear, only signed eIDAS claims."
            values={{ origin: COUNTRY_LABEL[country] }}
          />
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

      <ConsentNotice keys={['crossBorder', 'notifications', 'aiAssistant']} />

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
        {/* STEP 1 — Your move ----------------------------------------------- */}
        {step === 0 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.move" defaultMessage="Your move" /></legend>
            <p className="apply-card__hint">
              Tell us where you're heading and when. We'll handle eligibility, paperwork and the handover to the destination authority.
            </p>
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
              <label className="field apply-grid__wide">
                <span>Destination address (if known)</span>
                <input value={form.destinationAddress} onChange={(e) => upd('destinationAddress', e.target.value)} placeholder="e.g. Sveavägen 24, 113 57 Stockholm" />
              </label>
            </div>
          </fieldset>
        )}

        {/* STEP 2 — Identity pre-filled (Once-Only Principle) --------------- */}
        {step === 1 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.identity" defaultMessage="Identity (pre-filled)" /></legend>
            <p className="apply-card__hint">
              Once-Only Principle in action: we re-used the data already verified by your national eID — no need to re-key it.
              Pre-filled from <strong>{identity.register}</strong> via <strong>{identity.eid}</strong> (broker: {identity.broker}).
            </p>
            <dl className="apply-review">
              <div><dt>Given name</dt><dd>{identity.given} <span className="apply-pill apply-pill--ok">✓ verified</span></dd></div>
              <div><dt>Family name</dt><dd>{identity.family} <span className="apply-pill apply-pill--ok">✓ verified</span></dd></div>
              <div><dt>National ID</dt><dd><code>{identity.cprMask}</code> <span className="apply-pill apply-pill--secret">masked · pseudonymised</span></dd></div>
              <div><dt>eID assurance</dt><dd><span className="apply-pill apply-pill--strong">{identity.assurance}</span></dd></div>
              <div><dt>Signed-in account</dt><dd>{acc?.username || '—'}</dd></div>
            </dl>
            <p className="apply-card__hint">
              These claims will be re-issued as a signed eIDAS envelope when the application is handed over to {COUNTRY_LABEL[form.destination] ?? 'the destination authority'} — your raw national ID never leaves the {COUNTRY_LABEL[country]} sovereign zone.
            </p>
          </fieldset>
        )}

        {/* STEP 3 — Documents + real Document Extractor + PDF preview ------- */}
        {step === 2 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.docs" defaultMessage="Documents" /></legend>
            <p className="apply-card__hint">
              Drop your employment contract — the <strong>Document Extractor</strong> agent (Foundry + AI Document Intelligence)
              reads employer, role, salary and start date. The file is stored in your country's lake
              ({country.toUpperCase()} → <code>udcsp{country}prodlake</code>) and never leaves the sovereign zone.
            </p>
            <div className="apply-upload">
              <label htmlFor="res-doc" className="button-secondary">
                {docBusy ? 'Reading document…' : '📎 Upload employment contract (PDF / image)'}
              </label>
              <input
                id="res-doc"
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
            <div className="apply-grid" style={{ marginTop: '.9rem' }}>
              <label className="field">
                <span>Employer (you can edit if extraction is off)</span>
                <input value={form.employerName} onChange={(e) => upd('employerName', e.target.value)} placeholder="e.g. Volvo Group AB" />
              </label>
              <label className="field">
                <span>Country of new employer</span>
                <select value={form.employerCountry} onChange={(e) => upd('employerCountry', e.target.value)}>
                  <option value="">Same as destination</option>
                  <option value="dk">Denmark</option>
                  <option value="se">Sweden</option>
                  <option value="no">Norway</option>
                </select>
              </label>
              <label className="field">
                <span>Passport or national ID reference</span>
                <input value={form.passportRef} onChange={(e) => upd('passportRef', e.target.value)} placeholder="123-456-789" />
              </label>
            </div>
          </fieldset>
        )}

        {/* STEP 4 — Eligibility criteria + LIVE verdict from the agent --- */}
        {step === 3 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.eligibility" defaultMessage="Eligibility criteria" /></legend>
            <p className="apply-card__hint">
              The <strong>Eligibility Pre-Assessor</strong> agent runs inside an <strong>Azure Confidential Computing TEE</strong>
              (encrypted memory, attested SEV-SNP). It returns a rule-by-rule pre-assessment based on your declared move,
              the verified employment claim and the Nordic / EU coordination rules. A caseworker reviews every cross-border
              decision (EU AI Act art. 14).
            </p>

            {/* Live verdict ------------------------------------------------ */}
            <div className="apply-card" style={{ background: 'var(--color-bg-alt)', marginTop: '.5rem' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
                <strong>Live verdict — udcsp-eligibility agent</strong>
                <button type="button" className="udcsp-btn udcsp-btn--ghost" onClick={callEligibility} disabled={eligibilityBusy}>
                  {eligibilityBusy ? 'Running…' : 'Re-run'}
                </button>
              </header>
              {eligibilityBusy && !eligibility && (
                <p style={{ marginTop: '.5rem' }}>Calling the agent in the TEE… this typically takes 2–4 s.</p>
              )}
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
                    }}>
                      {eligibility.recommendation}
                    </span>
                    {' '}· <strong>Confidence:</strong> {(eligibility.confidence * 100).toFixed(0)}%
                    {' '}· <strong>Human review:</strong> {eligibility.humanReviewRequired ? 'required' : 'optional'}
                  </p>
                  {eligibility.caseworkerSummary && (
                    <p style={{ margin: '.5rem 0 0', fontStyle: 'italic' }}>{eligibility.caseworkerSummary}</p>
                  )}
                  {eligibility.citizenNotice && (
                    <p style={{ margin: '.5rem 0 0', fontSize: '.85rem', color: 'var(--color-fg-soft)' }}>
                      ℹ️ {eligibility.citizenNotice}
                    </p>
                  )}
                  {eligibility.ruleResults && eligibility.ruleResults.length > 0 && (
                    <details style={{ marginTop: '.5rem' }}>
                      <summary><strong>Rule-by-rule evidence ({eligibility.ruleResults.length})</strong></summary>
                      <ul style={{ marginTop: '.4rem', fontSize: '.9rem' }}>
                        {eligibility.ruleResults.map((r) => (
                          <li key={r.rule}>
                            <span style={{ color: r.passed ? '#0f5132' : '#842029' }}>{r.passed ? '✓' : '✗'}</span>{' '}
                            <code>{r.rule}</code>
                            {r.details && <> — {r.details}</>}
                            {r.evidenceIds && r.evidenceIds.length > 0 && (
                              <span style={{ fontSize: '.8rem', color: 'var(--color-fg-soft)' }}> · evidence: {r.evidenceIds.join(', ')}</span>
                            )}
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
              {!eligibility && !eligibilityBusy && (
                <p style={{ marginTop: '.5rem', color: 'var(--color-fg-soft)' }}>
                  The agent will run automatically when you have a destination + move date. Add an employment contract in step 3 to refine the score.
                </p>
              )}
            </div>

            <details style={{ marginTop: '1rem' }}>
              <summary>Legal basis the agent applies</summary>
              <ul className="apply-criteria">
                {ELIGIBILITY_CRITERIA.map((c) => (
                  <li key={c.id} className="apply-criteria__item">
                    <span className="apply-criteria__legal">{c.legal}</span>
                    <span className="apply-criteria__what">{c.what}</span>
                  </li>
                ))}
              </ul>
            </details>
          </fieldset>
        )}

        {/* STEP 5 — Cross-border consent + claims-based mediation ----------- */}
        {step === 4 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.consent" defaultMessage="Cross-border consent" /></legend>
            <p className="apply-card__hint">
              Before we hand your case over to {COUNTRY_LABEL[form.destination] ?? 'the destination country'}, we need two explicit
              consents. Both are required by GDPR art. 6(1)(e) and EU regulation 883/2004 (social-security coordination).
            </p>
            <div className="apply-claims">
              <h3>What actually crosses the border</h3>
              <ul className="apply-claims__envelope">
                <li>✓ Your name, masked national ID and verified address</li>
                <li>✓ Verified employment claim (employer, role, salary band, start date)</li>
                <li>✓ Eligibility verdict + confidence + AI Act registry ID</li>
                <li>✗ <strong>Never</strong>: raw CPR, full ID number, biometric data, source documents</li>
              </ul>
              <p className="apply-claims__envelope-meta">
                The envelope is a <strong>signed JWT (eIDAS High)</strong>, sealed in the {COUNTRY_LABEL[country]} sovereign zone,
                logged in Microsoft Purview with sensitivity label <code>Restricted-Cross-Border</code>, and routed via
                Azure Service Bus queue <code>cross-border-coordination</code>.
              </p>
            </div>
            <label className="checkbox" style={{ marginTop: '.9rem' }}>
              <input
                type="checkbox"
                checked={form.consentCrossBorder}
                onChange={(e) => upd('consentCrossBorder', e.currentTarget.checked)}
              />
              <span>
                I allow UDCSP to share the verified claims above with the competent authority of <strong>{COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase()}</strong> in order to register my residency.
              </span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.consentClaimsMediation}
                onChange={(e) => upd('consentClaimsMediation', e.currentTarget.checked)}
              />
              <span>
                I understand that only signed claims cross the border — no personal data is transmitted in the clear — and I can revoke this consent at any time from <Link to="/consent">My consents</Link>.
              </span>
            </label>
          </fieldset>
        )}

        {/* STEP 6 — Review & submit ----------------------------------------- */}
        {step === 5 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.review" defaultMessage="Review & submit" /></legend>
            <dl className="apply-review">
              <div><dt>Filing from</dt><dd>{flag} {country.toUpperCase()} · {identity.given} {identity.family}</dd></div>
              <div><dt>Destination</dt><dd>{COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase() ?? '—'} {form.destinationAddress && `· ${form.destinationAddress}`}</dd></div>
              <div><dt>Move date</dt><dd>{form.moveDate || '—'}</dd></div>
              <div><dt>Dependents</dt><dd>{form.dependents}</dd></div>
              <div><dt>Employer</dt><dd>{form.employerName || extracted?.fields?.employer || '—'}{form.employerCountry && ` · ${form.employerCountry.toUpperCase()}`}</dd></div>
              <div><dt>Document attached</dt><dd>{docName ? `${docName} (${docSizeKb} KB) · stored in ${docStorageAccount ?? 'pending upload'}` : '—'}</dd></div>
              <div><dt>eID assurance</dt><dd>{identity.assurance} · via {identity.eid}</dd></div>
              <div><dt>Cross-border consent</dt><dd>{form.consentCrossBorder && form.consentClaimsMediation ? '✅ both granted' : '⚠ missing'}</dd></div>
            </dl>
            <p className="apply-card__hint">
              On submit: APIM forwards to the <code>application-intake</code> Logic App, which runs Classifier → Document Extractor → Eligibility Pre-Assessor (TEE) → seals the signed claims envelope → drops it on the <code>cross-border-coordination</code> Service Bus queue → the destination workflow creates a Dynamics 365 case with a 4-day SLA → caseworker review → ACS notification → Verified ID issuance to your EUDI Wallet.
            </p>
          </fieldset>
        )}

        <div className="apply-stepper__actions">
          <button type="button" className="button-secondary" onClick={back} disabled={step === 0 || busy}><FormattedMessage id="apply.cta.back" defaultMessage="← Back" /></button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="button-primary"
              onClick={next}
              disabled={
                (step === 0 && !step0Valid) ||
                (step === 4 && !(form.consentCrossBorder && form.consentClaimsMediation))
              }
            >
              <FormattedMessage id="apply.cta.continue" defaultMessage="Continue →" />
            </button>
          ) : (
            <button type="button" className="button-primary" onClick={submit} disabled={!canSubmit}>
              {busy ? <FormattedMessage id="apply.cta.submitting" defaultMessage="Submitting…" /> : <FormattedMessage id="apply.cta.submit" defaultMessage="Submit application" />}
            </button>
          )}
        </div>
      </div>

      {result && (
        <article
          id="res-result"
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
                <FormattedMessage id="apply.result.caseRef" defaultMessage="Case reference" /> <code>{result.caseId || result.correlationId || 'pending'}</code>.{' '}
                You will receive a written decision by <strong>{result.estimatedDecisionDate}</strong>.
              </p>

              <section className="apply-reasoning" aria-labelledby="res-reasoning-title">
                <h3 id="res-reasoning-title">
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
                  {result.reasoning || 'The Eligibility Pre-Assessor reviewed your declared move, the verified employment claim and the Nordic / EU coordination rules. A caseworker in the destination country will validate the recommendation before any registration is made.'}
                </p>
                <p className="apply-reasoning__rights">
                  This is an <em>AI-assisted recommendation</em>, not a decision. Under the EU AI Act you have the right
                  to a human review, an explanation, and to contest the outcome. Visit{' '}
                  <Link to="/cases">My cases</Link> to follow the case or send a message to your caseworker.
                </p>
              </section>

              <ol className="apply-timeline" aria-label="Cross-border handoff progress">
                <li className="apply-timeline__item apply-timeline__item--done">
                  <strong>Claims envelope sealed</strong>
                  <span>Signed JWT (eIDAS High) generated in {COUNTRY_LABEL[country]} sovereign zone · Purview label <code>Restricted-Cross-Border</code></span>
                </li>
                <li className="apply-timeline__item apply-timeline__item--done">
                  <strong>Cross-border handoff</strong>
                  <span>Service Bus queue <code>cross-border-coordination</code> · Logic App <code>cross-border-residency</code> triggered</span>
                </li>
                <li className="apply-timeline__item apply-timeline__item--current">
                  <strong>Case created in {COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase()}</strong>
                  <span>Dynamics 365 Customer Service queue · SLA target 4 days · caseworker assignment in progress</span>
                </li>
                <li className="apply-timeline__item">
                  <strong>Caseworker review</strong>
                  <span>Copilot for Service multilingual KB · approval triggers Translator agent (locale-appropriate summary)</span>
                </li>
                <li className="apply-timeline__item">
                  <strong>Notification</strong>
                  <span>Azure Communication Services push + email · expected within 4 days</span>
                </li>
                <li className="apply-timeline__item">
                  <strong>Verified ID issued</strong>
                  <span>Microsoft Entra Verified ID · NordicResidencyCredential into your EUDI Wallet · auto-onboarding to {COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase()} portal</span>
                </li>
              </ol>

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
