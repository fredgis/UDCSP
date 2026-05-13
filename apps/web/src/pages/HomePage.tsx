import { Link } from 'react-router-dom';

const services = [
  {
    to: '/apply/residency',
    title: 'Residency transfer',
    desc: 'Move between Denmark, Sweden and Norway with a single application — pre-filled from your eID.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    to: '/apply/tax-certificate',
    title: 'Tax certificate',
    desc: 'Request and download an official tax residency certificate. Signed and verifiable in minutes.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
      </svg>
    ),
  },
  {
    to: '/apply/child-benefit',
    title: 'Child benefit',
    desc: 'Apply for income-based child benefit. Upload a payslip or lease — the assistant extracts the data for you to confirm.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
  {
    to: '/cases',
    title: 'My cases',
    desc: 'Track every application across countries. Real-time status, secure messaging, audit trail.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 14h6M8 17h4" />
      </svg>
    ),
  },
];

const principles = [
  {
    title: 'Your data stays in your country',
    body: 'Each Nordic country runs its own Entra External ID tenant, its own APIM front door, its own Logic Apps and its own Dataverse environment. The portal selects the right backend automatically based on the country you signed in with — there is no shared cross-border data store.',
    icon: '🇪🇺',
  },
  {
    title: 'AI assists, humans decide',
    body: 'Eligibility pre-assessment, document extraction and topic routing run on Foundry agents. Every AI suggestion carries a confidence score and a plain-language explanation, and a caseworker reviews any decision the model is unsure about. The full prompt → response chain is logged for audit (EU AI Act, Annex IV).',
    icon: '🤖',
  },
  {
    title: 'Built for everyone',
    body: 'Twelve UI languages including Polish, Arabic, Sámi, Ukrainian and Finnish. Every screen is keyboard-navigable and screen-reader-tested against WCAG 2.1 AA. A high-contrast theme and a dyslexic font are one click away.',
    icon: '♿',
  },
  {
    title: 'You stay in control of your data',
    body: 'Cross-border agency checks, SMS reminders and data export to a third party only happen if you opted in. You can review and revoke every consent from the Consent page; revocations propagate to APIM and Logic Apps within seconds.',
    icon: '🔐',
  },
];

export function HomePage(_: { locale?: string }) {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero__inner">
          <span className="hero__eyebrow"><span className="hero__eyebrow-dot" /> Nordic public services · Live</span>
          <h1 id="hero-heading">Unified Digital Citizen Services</h1>
          <p className="lede">
            One trusted entry point for residents of Denmark, Sweden and Norway.
            Apply once, follow your case in real time, get help in your language —
            with caseworkers always in the loop.
          </p>
          <div className="hero__cta">
            <Link to="/apply/residency" className="button-primary">Start an application</Link>
            <Link to="/cases" className="button-secondary">Track my cases</Link>
          </div>
        </div>
      </section>

      <div className="trust-strip" role="list" aria-label="Platform guarantees">
        <div className="trust-item" role="listitem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <span><strong>EU data residency</strong> · sovereign by design</span>
        </div>
        <div className="trust-item" role="listitem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
          <span><strong>12 languages</strong> · ICU MessageFormat, RTL ready</span>
        </div>
        <div className="trust-item" role="listitem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          <span><strong>WCAG 2.1 AA</strong> · screen-reader & keyboard verified</span>
        </div>
        <div className="trust-item" role="listitem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z" /><path d="M9 12l2 2 4-4" /></svg>
          <span><strong>EU AI Act</strong> · transparent, auditable, human override</span>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>What can we help you with today?</h2>
          <p>Pick a service and we&rsquo;ll guide you. Every form pre-fills what we already know.</p>
        </div>
      </div>
      <ul className="service-grid">
        {services.map((s) => (
          <li key={s.to}>
            <Link to={s.to} className="service-card">
              <span className="service-card__icon" aria-hidden="true">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="service-card__cta">Get started</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="section-heading">
        <div>
          <h2>How the platform works for you</h2>
          <p>Four guarantees behind every screen — sovereign infrastructure, accountable AI, accessibility for every resident, and consent that you stay in charge of.</p>
        </div>
      </div>
      <ul className="principles-grid" role="list">
        {principles.map((p) => (
          <li key={p.title} className="principle-card">
            <span className="principle-card__icon" aria-hidden="true">{p.icon}</span>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
