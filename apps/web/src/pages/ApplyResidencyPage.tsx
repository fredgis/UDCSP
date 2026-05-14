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
const ORIGIN_REGISTER: Record<string, { eid: string; broker: string; register: string; city: string; address: string }> = {
  dk: { eid: 'MitID', broker: 'Criipto Verify', register: 'CPR (Det Centrale Personregister)', city: 'Copenhagen', address: 'Nørrebrogade 88, 2200 København N' },
  se: { eid: 'BankID', broker: 'Criipto Verify', register: 'Skatteverket Folkbokföring', city: 'Stockholm', address: 'Sveavägen 24, 113 57 Stockholm' },
  no: { eid: 'BankID Norge / ID-porten', broker: 'Criipto Verify', register: 'Skatteetaten Folkeregisteret', city: 'Oslo', address: 'Storgata 22, 0184 Oslo' },
};

type Extraction = { employer: string; role: string; salary: string; startDate: string; currency: string };
type Eligibility = { verdict: 'likely-eligible' | 'requires-review' | 'likely-ineligible'; confidence: number; reasons: string[]; rights: string[]; humanReviewFlag: boolean };

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
    intl.formatMessage({ id: 'apply.residency.step.eligibility', defaultMessage: 'Eligibility check' }),
    intl.formatMessage({ id: 'apply.residency.step.consent', defaultMessage: 'Cross-border consent' }),
    intl.formatMessage({ id: 'apply.residency.step.review', defaultMessage: 'Review & submit' }),
  ], [intl]);

  const [step, setStep] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Simulated agent state — mocks Foundry calls so the UX matches the narrative.
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [docName, setDocName] = useState<string>('');
  const [assessing, setAssessing] = useState(false);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  // Live form state.
  const [form, setForm] = useState({
    fromCountry: country,
    destination: '',
    moveDate: '',
    employerName: '',
    employerCountry: '',
    passportRef: '',
    dependents: 0,
    consentCrossBorder: false,
    consentClaimsMediation: false,
    destinationAddress: '',
  });
  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => upd('fromCountry', country), [country]);

  // Pre-filled identity claims (simulated OOP / claims-based pre-fill from origin register).
  const identity = useMemo(() => {
    const emailUser = (acc?.username || 'citizen').split('@')[0].split('.');
    const given = emailUser[0] ? emailUser[0][0].toUpperCase() + emailUser[0].slice(1) : 'Anna';
    const family = emailUser[1] ? emailUser[1][0].toUpperCase() + emailUser[1].slice(1) : 'Hansen';
    const cprMask = country === 'dk' ? '••••••-1234' : country === 'se' ? '19••••••-•234' : '••••••-12345';
    return {
      given,
      family,
      cprMask,
      address: origin.address,
      city: origin.city,
      assurance: 'eIDAS High',
      eid: origin.eid,
      broker: origin.broker,
      register: origin.register,
    };
  }, [acc?.username, country, origin]);

  function next() {
    // Per-step gating.
    if (step === 0 && (!form.destination || !form.moveDate)) return;
    if (step === 2 && !extraction) return;
    if (step === 3 && !eligibility) return;
    if (step === 4 && !(form.consentCrossBorder && form.consentClaimsMediation)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  // Mock the Document Extractor agent (Foundry + AI Document Intelligence).
  function handleFile(file: File | null) {
    if (!file) return;
    setDocName(file.name);
    setExtracting(true);
    setExtraction(null);
    window.setTimeout(() => {
      const inferredEmployer = form.employerName || (form.destination === 'se' ? 'Volvo Group AB' : form.destination === 'no' ? 'Equinor ASA' : 'Novo Nordisk A/S');
      const currency = form.destination === 'se' ? 'SEK' : form.destination === 'no' ? 'NOK' : 'DKK';
      const salaryAmount = form.destination === 'se' ? '52 000' : form.destination === 'no' ? '58 000' : '48 500';
      setExtraction({
        employer: inferredEmployer,
        role: 'Senior Software Engineer',
        salary: `${salaryAmount} ${currency} / month`,
        startDate: form.moveDate || '2026-08-01',
        currency,
      });
      if (!form.employerName) upd('employerName', inferredEmployer);
      if (!form.employerCountry) upd('employerCountry', form.destination);
      setExtracting(false);
    }, 1200);
  }

  // Mock the Eligibility Pre-Assessor agent (running in TEE per the narrative).
  function runEligibility() {
    setAssessing(true);
    setEligibility(null);
    window.setTimeout(() => {
      const hasEmployer = Boolean(extraction?.employer);
      const verdict: Eligibility['verdict'] = hasEmployer ? 'likely-eligible' : 'requires-review';
      const confidence = hasEmployer ? 0.91 : 0.62;
      setEligibility({
        verdict,
        confidence,
        reasons: hasEmployer
          ? [
              `Nordic Convention on Social Security applies (${COUNTRY_LABEL[country]} → ${COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase()}).`,
              `Verified employment contract with ${extraction?.employer} from ${extraction?.startDate}.`,
              `eID assurance level eIDAS High via ${origin.eid}.`,
            ]
          : ['No employment contract uploaded — entitlement under EU Regulation 883/2004 cannot be confirmed automatically.'],
        rights: [
          'Right to register residence (Nordic Council Convention 1969, art. 1).',
          'Right to social-security coordination (Reg. EC/883/2004, art. 11).',
          'Right to portability of acquired pension rights (Reg. EC/883/2004, art. 50).',
        ],
        humanReviewFlag: true, // EU AI Act high-risk: every cross-border decision goes to a caseworker.
      });
      setAssessing(false);
    }, 1400);
  }

  const step0Valid = Boolean(form.destination && form.moveDate);
  const canSubmit = step0Valid && extraction !== null && eligibility !== null && form.consentCrossBorder && form.consentClaimsMediation;

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
          extraction,
          eligibility,
          // Tells the back-end this needs the cross-border-coordination Service Bus path,
          // not the single-country application-intake one.
          crossBorder: true,
          claimsEnvelope: 'signed-jwt-eidas-high',
        }),
      });
      setResult(r);
      appendCase({
        id: r.caseId || r.correlationId || `res-${Date.now()}`,
        title: `Residency transfer to ${COUNTRY_LABEL[form.destination] ?? form.destination?.toUpperCase() ?? '—'}`,
        status: r.status || 'Submitted · cross-border handoff in progress',
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
          <FormattedMessage
            id="apply.residency.lede"
            defaultMessage="One guided intake. We pre-fill from your eID and the {origin} population register, run the Foundry Document Extractor and Eligibility Pre-Assessor, then orchestrate the cross-border handoff to the destination authority — no personal data crosses the border in the clear, only signed eIDAS claims."
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
              <div><dt>Current address</dt><dd>{identity.address} <span className="apply-pill apply-pill--ok">✓ from register</span></dd></div>
              <div><dt>eID assurance</dt><dd><span className="apply-pill apply-pill--strong">{identity.assurance}</span></dd></div>
            </dl>
            <p className="apply-card__hint">
              These claims will be re-issued as a signed eIDAS envelope when the application is handed over to {COUNTRY_LABEL[form.destination] ?? 'the destination authority'} — your raw national ID never leaves the {COUNTRY_LABEL[country]} sovereign zone.
            </p>
          </fieldset>
        )}

        {/* STEP 3 — Documents + Document Extractor agent -------------------- */}
        {step === 2 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.docs" defaultMessage="Documents" /></legend>
            <p className="apply-card__hint">
              Upload your employment contract for the destination country. Our <strong>Document Extractor</strong> (Foundry agent + AI Document Intelligence) will read the employer, role, salary and start date.
            </p>
            <label className="apply-upload">
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" onChange={(e) => handleFile(e.currentTarget.files?.[0] ?? null)} />
              <span className="apply-upload__cta">📎 {docName ? `Replace document (${docName})` : 'Upload employment contract'}</span>
              <span className="apply-upload__hint">PDF, PNG, JPG or DOCX · processed in EU region</span>
            </label>
            {extracting && (
              <p className="apply-agent apply-agent--busy" role="status" aria-live="polite">
                <span className="apply-agent__spin" aria-hidden="true" /> Document Extractor running on Foundry…
              </p>
            )}
            {extraction && (
              <div className="apply-agent apply-agent--ok" role="status">
                <h3>✓ Extracted by Document Extractor</h3>
                <dl className="apply-review">
                  <div><dt>Employer</dt><dd>{extraction.employer}</dd></div>
                  <div><dt>Role</dt><dd>{extraction.role}</dd></div>
                  <div><dt>Salary</dt><dd>{extraction.salary}</dd></div>
                  <div><dt>Start date</dt><dd>{extraction.startDate}</dd></div>
                </dl>
                <p className="apply-agent__meta">Trace ID: <code>00-{(Math.random() * 1e16).toString(16).slice(0, 16)}-{(Math.random() * 1e8).toString(16).slice(0, 8)}-01</code> · model gpt-4o · region Sweden Central</p>
              </div>
            )}
            <div className="apply-grid" style={{ marginTop: '.9rem' }}>
              <label className="field">
                <span>Passport or national ID reference</span>
                <input value={form.passportRef} onChange={(e) => upd('passportRef', e.target.value)} placeholder="123-456-789" />
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
            </div>
          </fieldset>
        )}

        {/* STEP 4 — Eligibility Pre-Assessor (TEE) -------------------------- */}
        {step === 3 && (
          <fieldset className="apply-card">
            <legend><FormattedMessage id="apply.residency.step.eligibility" defaultMessage="Eligibility check" /></legend>
            <p className="apply-card__hint">
              The <strong>Eligibility Pre-Assessor</strong> runs inside an <strong>Azure Confidential Computing TEE</strong> — your data is processed in encrypted memory and is never visible to the platform operator. EU AI Act high-risk: a human caseworker always reviews the final decision.
            </p>
            {!eligibility && !assessing && (
              <button type="button" className="button-primary" onClick={runEligibility}>Run pre-assessment</button>
            )}
            {assessing && (
              <p className="apply-agent apply-agent--busy" role="status" aria-live="polite">
                <span className="apply-agent__spin" aria-hidden="true" /> Eligibility Pre-Assessor running in TEE…
              </p>
            )}
            {eligibility && (
              <div className={`apply-agent apply-agent--${eligibility.verdict}`} role="status">
                <h3>
                  {eligibility.verdict === 'likely-eligible' && '✅ Likely eligible'}
                  {eligibility.verdict === 'requires-review' && '⚠ Requires caseworker review'}
                  {eligibility.verdict === 'likely-ineligible' && '✕ Likely ineligible'}
                  <span className="apply-agent__conf">· confidence {(eligibility.confidence * 100).toFixed(0)}%</span>
                </h3>
                <p><strong>Why:</strong></p>
                <ul>{eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                <p><strong>Your potential rights:</strong></p>
                <ul>{eligibility.rights.map((r, i) => <li key={i}>{r}</li>)}</ul>
                {eligibility.humanReviewFlag && (
                  <p className="apply-pill apply-pill--review">🧑‍⚖️ Mandatory human review · EU AI Act art. 14</p>
                )}
                <p className="apply-agent__meta">
                  Confidential Computing attestation: <code>SEV-SNP · az-eu-north · ✓ verified</code> ·
                  Trace: <code>00-{(Math.random() * 1e16).toString(16).slice(0, 16)}-{(Math.random() * 1e8).toString(16).slice(0, 8)}-01</code>
                </p>
              </div>
            )}
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
              <div><dt>Employer</dt><dd>{extraction?.employer || form.employerName || '—'} · {extraction?.salary || ''}</dd></div>
              <div><dt>eID assurance</dt><dd>{identity.assurance} · via {identity.eid}</dd></div>
              <div><dt>Eligibility</dt><dd>{eligibility?.verdict.replace('-', ' ')} ({((eligibility?.confidence ?? 0) * 100).toFixed(0)}%) · human review required</dd></div>
              <div><dt>Cross-border consent</dt><dd>{form.consentCrossBorder && form.consentClaimsMediation ? '✅ both granted' : '⚠ missing'}</dd></div>
            </dl>
            <p className="apply-card__hint">
              On submit: an Azure Logic App will seal the signed claims envelope, drop it on the
              <code>cross-border-coordination</code> Service Bus queue, the destination workflow will create a Dynamics 365 Customer Service case
              with a 4-day SLA, and a caseworker will receive it for review. You'll be notified by Azure Communication Services and — once approved —
              receive a Microsoft Entra Verified ID credential into your EUDI Wallet.
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
                (step === 2 && !extraction) ||
                (step === 3 && !eligibility) ||
                (step === 4 && !(form.consentCrossBorder && form.consentClaimsMediation))
              }
            >
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
              <strong>Caseworker review (Astrid)</strong>
              <span>Copilot for Service multilingual KB · approval triggers Translator agent (SV + EN summary)</span>
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
        </article>
      )}
    </section>
  );
}
