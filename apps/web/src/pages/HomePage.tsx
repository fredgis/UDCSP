import { Link } from 'react-router-dom';
import { ChatWidget } from '../components/ChatWidget';

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
    desc: 'Apply for income-based child benefit. Snap a payslip with your phone — no manual entry.',
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

export function HomePage({ locale = 'en' }: { locale?: string }) {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero__inner">
          <span className="hero__eyebrow"><span className="hero__eyebrow-dot" /> Nordic public services · Live</span>
          <h1 id="hero-heading">Unified Digital Citizen Services</h1>
          <p className="lede">
            One trusted entry point across Denmark, Sweden and Norway.
            Apply once, follow your case in real time, get help in your language — with humans always in the loop.
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
          <h2>What our citizens see today</h2>
          <p>Outcomes measured across the Nordic pilot programme.</p>
        </div>
      </div>
      <div className="stats" role="list">
        <div className="stat" role="listitem">
          <div className="stat__value">47 → 1</div>
          <div className="stat__label">Legacy portals replaced by one entry</div>
        </div>
        <div className="stat" role="listitem">
          <div className="stat__value">28 → 4 days</div>
          <div className="stat__label">Average residency-transfer turnaround</div>
        </div>
        <div className="stat" role="listitem">
          <div className="stat__value">94 / 100</div>
          <div className="stat__label">Citizen satisfaction (CSAT)</div>
        </div>
        <div className="stat" role="listitem">
          <div className="stat__value">12</div>
          <div className="stat__label">Languages, including Sámi & Polish</div>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>Run a demonstration scenario</h2>
          <p>10 end-to-end demos exercising every row of the README evaluation matrix — citizen journeys, back-office, governance, insights, DevOps.</p>
        </div>
        <Link to="/demos" className="button-secondary">See all 10 demos →</Link>
      </div>
      <ul className="persona-grid" role="list">
        <li className="persona-card persona-card--anna">
          <span className="persona-card__id">D1</span>
          <h3>Anna · DK → SE</h3>
          <p>The flagship: federated eID, omnichannel, multilingual, eligibility pre-assessment.</p>
          <Link to="/apply/residency">Try residency transfer →</Link>
        </li>
        <li className="persona-card persona-card--maria">
          <span className="persona-card__id">D3</span>
          <h3>Maria · PL on SE</h3>
          <p>Polish UI on Swedish portal, NVDA-friendly, AI assistant in PL, human-in-the-loop eligibility.</p>
          <Link to="/apply/child-benefit">Try housing/child benefit →</Link>
        </li>
        <li className="persona-card persona-card--erik">
          <span className="persona-card__id">D4</span>
          <h3>Erik · DK · mobile</h3>
          <p>Snap a payslip with your phone — Document Extractor autofills the income field.</p>
          <Link to="/apply/child-benefit">Try mobile flow →</Link>
        </li>
        <li className="persona-card persona-card--ingrid">
          <span className="persona-card__id">D8</span>
          <h3>Ingrid · SecOps</h3>
          <p>Prompt-injection contained: try sending malicious input to the assistant — Content Safety blocks it.</p>
          <a href="#chat-title">Try the chat ↓</a>
        </li>
      </ul>

      <div className="featured">
        <div className="featured-card">
          <h2>How it works</h2>
          <ul>
            <li><strong>Sign in</strong> with MitID, BankID or BankID Norge — federated through your country&rsquo;s eID.</li>
            <li><strong>Tell us once.</strong> We pre-fill names, addresses, dependents from authoritative registers.</li>
            <li><strong>Get help in your language</strong> from the assistant. A caseworker is always one tap away.</li>
            <li><strong>Track everything</strong> — every status change, every AI suggestion, every human decision is logged.</li>
          </ul>
        </div>
        <ChatWidget locale={locale} />
      </div>
    </>
  );
}

