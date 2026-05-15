import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';

// Demo 2 surface — citizen-facing entry-point for the voice channel
// (National Tax-administration). Three Nordic toll-free numbers route to
// the same Foundry topic-router that powers chat + web. The page is
// deliberately corporate and sober: gov-grade typography, EU palette,
// recording / AI Act disclosures up front, no marketing fluff.

type Country = {
  code: 'no' | 'dk' | 'se';
  flag: string;
  name: string;
  authority: string;
  authoritySub: string;
  hours: string;
  phoneDisplay: string;
  phoneDial: string;
  language: string;
  fallback: string;
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
    fallback: 'English on request',
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
    fallback: 'English on request',
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
    fallback: 'English on request',
  },
];

export function TaxAdministrationPage() {
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
              defaultMessage="Call your national tax authority directly from one Nordic number per country. An AI voice assistant — supervised by a human caseworker — answers questions on tax refunds, deductions, residency tax status and certificates, in your national language, 24/7. Calls are toll-free, recorded for quality and compliance, and protected by the same GDPR + EU AI Act safeguards as the rest of the platform."
            />
          </p>
        </div>
      </header>

      <section className="tax-admin__countries" aria-labelledby="countries-title">
        <h2 id="countries-title">
          <FormattedMessage id="taxAdmin.countries.title" defaultMessage="Pick your country" />
        </h2>
        <p className="tax-admin__hint">
          <FormattedMessage
            id="taxAdmin.countries.lede"
            defaultMessage="Each line is operated in partnership with the national tax authority. Hover or focus a card to see the service overview, then tap the toll-free number to dial."
          />
        </p>
        <ul className="tax-admin__grid" role="list">
          {COUNTRIES.map((c) => (
            <li key={c.code} className={`tax-admin__country tax-admin__country--${c.code}`}>
              <div className="tax-admin__country-card">
                <div className="tax-admin__country-head">
                  <span className="tax-admin__country-flag" aria-hidden="true">{c.flag}</span>
                  <div>
                    <h3>{c.authority}</h3>
                    <p className="tax-admin__country-sub">{c.authoritySub}</p>
                  </div>
                </div>
                <dl className="tax-admin__country-meta">
                  <div><dt>Country</dt><dd>{c.name}</dd></div>
                  <div><dt>Language</dt><dd>{c.language}</dd></div>
                  <div><dt>Hours</dt><dd>{c.hours}</dd></div>
                  <div><dt>Fallback</dt><dd>{c.fallback}</dd></div>
                </dl>
                <a href={`tel:${c.phoneDial}`} className="tax-admin__phone-cta">
                  <span className="tax-admin__phone-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <span>
                    <span className="tax-admin__phone-label">Toll-free</span>
                    <span className="tax-admin__phone-number">{c.phoneDisplay}</span>
                  </span>
                </a>
              </div>
              <div className="tax-admin__country-overview" aria-hidden="true">
                <h4>What you can ask</h4>
                <ul>
                  <li>Status of a refund or tax return</li>
                  <li>Income, deductions, and personal allowance rules</li>
                  <li>Residency tax status (incl. cross-border)</li>
                  <li>How to request a tax certificate</li>
                  <li>Hand-off to a human caseworker on complex topics</li>
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="tax-admin__numbers" aria-labelledby="numbers-title">
        <h2 id="numbers-title">
          <FormattedMessage id="taxAdmin.numbers.title" defaultMessage="All numbers at a glance" />
        </h2>
        <ul className="tax-admin__numbers-list">
          {COUNTRIES.map((c) => (
            <li key={c.code}>
              <span className="tax-admin__num-flag" aria-hidden="true">{c.flag}</span>
              <span className="tax-admin__num-country">{c.name}</span>
              <span className="tax-admin__num-authority">{c.authority}</span>
              <a href={`tel:${c.phoneDial}`} className="tax-admin__num-dial">{c.phoneDisplay}</a>
            </li>
          ))}
        </ul>
        <p className="tax-admin__caveat">
          <FormattedMessage
            id="taxAdmin.numbers.caveat"
            defaultMessage="Numbers shown are reference numbers used by the demonstration platform. They are issued by the national telecom regulators (Nkom · ERST · PTS) and bound to per-country Azure Communication Services resources with sovereignty-pinned data residency."
          />
        </p>
      </section>

      <section className="tax-admin__compliance" aria-labelledby="compliance-title">
        <h2 id="compliance-title">
          <FormattedMessage id="taxAdmin.compliance.title" defaultMessage="How the voice agent is regulated" />
        </h2>
        <div className="tax-admin__compliance-grid">
          <div className="tax-admin__compliance-item">
            <span className="tax-admin__compliance-icon" aria-hidden="true">⚖️</span>
            <div>
              <h3>EU AI Act — limited-risk transparency</h3>
              <p>You will be told, at the beginning of the call, that you are speaking with an AI assistant. The assistant gives reasoned answers, never makes final decisions on benefits or refunds, and offers a hand-off to a human caseworker on any topic where confidence is low or the question requires legal interpretation.</p>
            </div>
          </div>
          <div className="tax-admin__compliance-item">
            <span className="tax-admin__compliance-icon" aria-hidden="true">🛡️</span>
            <div>
              <h3>GDPR &amp; ePrivacy — recording with consent</h3>
              <p>Calls are recorded for quality, audit and dispute resolution. A 12-language disclosure is played at pickup; press 0 to be transferred to a non-recorded human queue. Audio is stored in WORM, sovereignty-pinned storage for 90 days, then auto-purged. The pseudonymised transcript is retained 6 months hot and anonymised for the case retention period thereafter.</p>
            </div>
          </div>
          <div className="tax-admin__compliance-item">
            <span className="tax-admin__compliance-icon" aria-hidden="true">🇪🇺</span>
            <div>
              <h3>Sovereignty — call media stays in-country</h3>
              <p>Norwegian calls are answered by an ACS resource pinned to Norway East; Danish by North Europe; Swedish by Sweden Central. Transcripts and AI traces live in the corresponding national Fabric workspace. Cross-border data transfers happen only for the cross-border services where the citizen has explicitly consented (Info Norden, Øresunddirekt, Grensetjänsten cases).</p>
            </div>
          </div>
          <div className="tax-admin__compliance-item">
            <span className="tax-admin__compliance-icon" aria-hidden="true">♿</span>
            <div>
              <h3>WCAG 2.1 AA — accessible by design</h3>
              <p>The voice channel removes the digital-literacy and screen barrier for citizens who cannot or do not want to interact with a portal. Slow-speech mode, DTMF fallback ("press 1 for…", "press 0 for a human"), and a 12-language neural voice catalogue are available on every call.</p>
            </div>
          </div>
          <div className="tax-admin__compliance-item">
            <span className="tax-admin__compliance-icon" aria-hidden="true">🔍</span>
            <div>
              <h3>Auditability — one trace, every step</h3>
              <p>Every call leg, every AI invocation, every Content-Safety verdict, and every warm-transfer is correlated by a single <code>traceparent</code> in Application Insights and anchored in Azure Confidential Ledger for tamper-evident retention. DPOs can reconstruct the entire interaction six months later.</p>
            </div>
          </div>
          <div className="tax-admin__compliance-item">
            <span className="tax-admin__compliance-icon" aria-hidden="true">🤝</span>
            <div>
              <h3>Human in the loop — always one keystroke away</h3>
              <p>Say "I want to speak to a person", press 0 on the keypad at any time, or let the AI offer the hand-off when it detects a complex case. A human caseworker takes over with the conversation transcript and the AI's suggested next step already on their screen.</p>
            </div>
          </div>
        </div>
      </section>

      <p className="tax-admin__more">
        <FormattedMessage
          id="taxAdmin.more"
          defaultMessage="For the full architecture of this channel — call lifecycle, neural voices, recording-disclosure script, regulator procurement, sovereignty mapping and SLOs — see the voice channel handbook in the platform documentation."
        />
      </p>
    </article>
  );
}
