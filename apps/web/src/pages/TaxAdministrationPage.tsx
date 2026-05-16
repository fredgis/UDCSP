import { useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { NordicMap } from '../components/NordicMap';
import { Flag } from '../components/Flag';

// Demo 2 surface — citizen-facing entry-point for the voice channel
// (National Tax-administration). Three Nordic toll-free numbers route to
// the same Foundry topic-router that powers chat + web.

type CountryCode = 'no' | 'dk' | 'se';

type Country = {
  code: CountryCode;
  flag: string;
  name: string;
  authority: string;
  authoritySub: string;
  hours: string;
  phoneDisplay: string;
  phoneDial: string;
  language: string;
  topics: string[];
};

const COUNTRIES: Country[] = [
  {
    code: 'no',
    flag: '🇳🇴',
    name: 'Norway',
    authority: 'Skatteetaten',
    authoritySub: 'Norwegian Tax Administration',
    hours: 'Mon–Fri · 08:00 – 18:00 CET',
    phoneDisplay: '+47 800 12 345',
    phoneDial: '+4780012345',
    language: 'Norsk bokmål',
    topics: ['Refund status', 'Deductions & allowances', 'Cross-border tax residency', 'Tax certificates', 'Hand-off to a human'],
  },
  {
    code: 'dk',
    flag: '🇩🇰',
    name: 'Denmark',
    authority: 'Skattestyrelsen',
    authoritySub: 'Danish Tax Agency',
    hours: 'Man–Fre · 08:00 – 18:00 CET',
    phoneDisplay: '+45 80 12 34 56',
    phoneDial: '+4580123456',
    language: 'Dansk',
    topics: ['Forskudsopgørelse / refund', 'Fradrag & ligning', 'Tax residency status', 'Skatteattest', 'Hand-off to a human'],
  },
  {
    code: 'se',
    flag: '🇸🇪',
    name: 'Sweden',
    authority: 'Skatteverket',
    authoritySub: 'Swedish Tax Agency',
    hours: 'Mån–Fre · 08:00 – 18:00 CET',
    phoneDisplay: '+46 20 123 45 67',
    phoneDial: '+46201234567',
    language: 'Svenska',
    topics: ['Skatteåterbäring', 'Avdrag & jobbskatteavdrag', 'Hemvist & cross-border', 'Hemvistintyg', 'Hand-off to a human'],
  },
];

export function TaxAdministrationPage() {
  const { accounts } = useMsal();
  const acct = accounts[0];
  // Demo override: when the signed-in citizen is Anna, swap the Norwegian
  // toll-free for the actual live ACS-procured FR toll-free number, so the
  // demo audience can dial through the working end-to-end pipeline instead
  // of the placeholder +47 800 12 345. Hardcoded on purpose — this rule is
  // demo-only and does not belong in production config.
  const isAnna = useMemo(() => {
    const name = (acct?.name ?? '').toLowerCase();
    const upn = (acct?.username ?? '').toLowerCase();
    return name.includes('anna') || upn.includes('anna');
  }, [acct]);
  const COUNTRIES_RUNTIME = useMemo<Country[]>(() => {
    if (!isAnna) return COUNTRIES;
    return COUNTRIES.map((c) =>
      c.code === 'no'
        ? { ...c, phoneDisplay: '+33 801 150 799', phoneDial: '+33801150799' }
        : c,
    );
  }, [isAnna]);

  const [selected, setSelected] = useState<CountryCode>('no');
  const active = COUNTRIES_RUNTIME.find((c) => c.code === selected)!;

  return (
    <article className="tax-admin" aria-labelledby="tax-admin-title">
      <p className="tax-admin__back">
        <Link to="/"><FormattedMessage id="taxAdmin.back" defaultMessage="← Back to home" /></Link>
      </p>

      <header className="tax-admin__hero">
        <div className="tax-admin__hero-accent" aria-hidden="true" />
        <div className="tax-admin__hero-main">
          <span className="tax-admin__eyebrow">
            <span className="tax-admin__eyebrow-dot" aria-hidden="true" />
            <FormattedMessage id="taxAdmin.eyebrow" defaultMessage="Voice channel · Nordic public sector" />
          </span>
          <h1 id="tax-admin-title">
            <FormattedMessage id="taxAdmin.title" defaultMessage="National Tax-administration" />
          </h1>
          <p className="tax-admin__lede">
            <FormattedMessage
              id="taxAdmin.lede"
              defaultMessage="Call your national tax authority directly. An AI voice assistant — supervised by a human caseworker — answers questions on tax refunds, deductions and residency tax in your national language. Calls are toll-free, recorded for quality, and protected by GDPR + EU AI Act safeguards."
            />
          </p>
        </div>
      </header>

      <section className="tax-admin__interactive" aria-labelledby="map-title">
        <div className="tax-admin__interactive-map">
          <h2 id="map-title" className="tax-admin__visually-hidden">
            <FormattedMessage id="taxAdmin.map.title" defaultMessage="Nordic countries map" />
          </h2>
          <NordicMap selected={selected} onSelect={setSelected} />
          <p className="tax-admin__map-hint">
            <FormattedMessage
              id="taxAdmin.map.hint"
              defaultMessage="Hover, focus or tap a country to see its tax-administration overview."
            />
          </p>
        </div>

        <div className="tax-admin__interactive-info" aria-live="polite">
          <div className={`tax-admin__country-card tax-admin__country-card--${active.code}`}>
            <div className="tax-admin__country-head">
              <span className="tax-admin__country-flag" aria-hidden="true"><Flag countryCode={active.code} /></span>
              <div>
                <h3>{active.authority}</h3>
                <p className="tax-admin__country-sub">{active.authoritySub} · {active.name}</p>
              </div>
            </div>
            <dl className="tax-admin__country-meta">
              <div><dt>Language</dt><dd>{active.language}</dd></div>
              <div><dt>Hours</dt><dd>{active.hours}</dd></div>
              <div><dt>Fallback</dt><dd>English on request</dd></div>
            </dl>
            <h4 className="tax-admin__country-topics-title">What you can ask</h4>
            <ul className="tax-admin__country-topics">
              {active.topics.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <a href={`tel:${active.phoneDial}`} className="tax-admin__phone-cta">
              <span className="tax-admin__phone-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <span>
                <span className="tax-admin__phone-label">Toll-free</span>
                <span className="tax-admin__phone-number">{active.phoneDisplay}</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="tax-admin__numbers" aria-labelledby="numbers-title">
        <h2 id="numbers-title">
          <FormattedMessage id="taxAdmin.numbers.title" defaultMessage="All numbers at a glance" />
        </h2>
        <ul className="tax-admin__numbers-list">
          {COUNTRIES_RUNTIME.map((c) => (
            <li key={c.code}>
              <span className="tax-admin__num-flag" aria-hidden="true"><Flag countryCode={c.code} /></span>
              <span className="tax-admin__num-country">{c.name}</span>
              <span className="tax-admin__num-authority">{c.authority}</span>
              <a href={`tel:${c.phoneDial}`} className="tax-admin__num-dial">{c.phoneDisplay}</a>
            </li>
          ))}
        </ul>
        <p className="tax-admin__caveat">
          <FormattedMessage
            id="taxAdmin.numbers.caveat"
            defaultMessage="Reference numbers used by the demonstration platform. Real numbers are issued by Nkom (NO), ERST (DK) and PTS (SE) and bound to per-country Azure Communication Services resources with sovereignty-pinned data residency."
          />
        </p>
      </section>

      <section className="tax-admin__compliance" aria-labelledby="compliance-title">
        <h2 id="compliance-title">
          <FormattedMessage id="taxAdmin.compliance.title" defaultMessage="Trust & safety" />
        </h2>
        <div className="tax-admin__compliance-grid">
          <div className="tax-admin__compliance-item">
            <span className="tax-admin__compliance-icon" aria-hidden="true">⚖️</span>
            <div>
              <h3>EU AI Act</h3>
              <p>You'll be told you're speaking with an AI. It explains rules but never decides on refunds or benefits — a human caseworker is one keystroke away.</p>
            </div>
          </div>
          <div className="tax-admin__compliance-item">
            <span className="tax-admin__compliance-icon" aria-hidden="true">🛡️</span>
            <div>
              <h3>GDPR &amp; recording</h3>
              <p>Calls are recorded for quality with a 12-language disclosure; press 0 for a non-recorded human queue. Audio is auto-purged after 90 days.</p>
            </div>
          </div>
          <div className="tax-admin__compliance-item">
            <span className="tax-admin__compliance-icon" aria-hidden="true">🇪🇺</span>
            <div>
              <h3>Sovereignty</h3>
              <p>Call media stays in-country (Norway East · North Europe · Sweden Central). Transcripts live in the national Fabric workspace, never cross the border.</p>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}

