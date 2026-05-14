import { Link } from 'react-router-dom';

const services = [
  {
    to: '/apply/residency',
    title: 'Residency transfer',
    desc: 'One guided intake. We pre-fill the country-specific registration steps and route you to the right authority — borger.dk / CPR · Skatteverket · Skatteetaten.',
    bridge: 'Bridges to: cpr.dk · borger.dk · Skatteverket Folkbokföring · Skatteetaten Folkeregisteret · UDI · Altinn',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    to: '/apply/tax-certificate',
    title: 'Tax residency certificate',
    desc: 'Request a tax residency certificate for DK, SE or NO. We pick the right form (skat.dk 02.050 · Skatteverket Hemvistintyg · Altinn RF-1306) and pre-fill it.',
    bridge: 'Bridges to: skat.dk · Skatteverket e-service / SKV 2734 · Altinn RF-1306',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
      </svg>
    ),
  },
  {
    to: '/apply/child-benefit',
    title: 'Child & family benefit',
    desc: 'Check eligibility and apply for child or family benefits. Upload payslip, lease or birth certificate — we extract the data and route to the competent authority.',
    bridge: 'Bridges to: Udbetaling Danmark · Försäkringskassan · NAV barnetrygd',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
  {
    to: '/cases',
    title: 'My cases',
    desc: 'Track every application across countries. Real-time status, secure messaging, audit trail — across DK / SE / NO authorities.',
    bridge: 'Aggregated from: D365 · borger.dk · Mina sidor · Altinn',
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
    body: 'When you sign in as a Danish, Swedish or Norwegian resident, the portal talks only to that country\'s public-service systems. Nothing about you is copied or stored in another country.',
    icon: '🇪🇺',
  },
  {
    title: 'AI helps, a person decides',
    body: 'AI can pre-read your documents, suggest the right form and give a first opinion on whether you\'re eligible — but a real caseworker reviews every decision and signs it off. You always see, in plain language, what the AI suggested and why.',
    icon: '🤖',
  },
  {
    title: 'Made for everyone',
    body: 'The portal is available in twelve languages, including Polish, Arabic, Sámi, Ukrainian and Finnish. You can use it entirely with a keyboard, with a screen reader, in high-contrast mode or with a dyslexia-friendly font.',
    icon: '♿',
  },
  {
    title: 'You stay in charge',
    body: 'You decide what we may do with your data — share with another Nordic country, send you SMS reminders, forward a copy to a third party. You can change your mind at any time on the Consent page, and the change takes effect immediately.',
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
              <p className="service-card__bridge">🔗 {s.bridge}</p>
              <span className="service-card__cta">Get started</span>
            </Link>
          </li>
        ))}
      </ul>

      <aside className="bridge-callout" role="note" aria-label="How UDCSP works">
        <h3>UDCSP is a bridge — not a replacement</h3>
        <p>
          Each country still owns its own registers, eID and decisions. UDCSP collects your data once,
          checks the cross-border rules (Info Norden, Øresunddirekt, Grensetjänsten, EU Single Digital Gateway),
          pre-fills the right national form, and routes your application to the competent authority:
          <strong> borger.dk · CPR · MitID · Skatteverket · Försäkringskassan · BankID · Skatteetaten · NAV · UDI · Altinn · ID-porten</strong>.
        </p>
      </aside>

      <div className="section-heading">
        <div>
          <h2>How the platform works for you</h2>
          <p>Four simple promises behind every screen — your data stays at home, AI helps but never decides alone, the portal is usable by everyone, and you stay in charge of your information.</p>
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
