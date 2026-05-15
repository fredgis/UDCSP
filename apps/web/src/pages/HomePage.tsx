import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { PlatformDiagram } from '../components/PlatformDiagram';

const services = [
  {
    to: '/apply/residency',
    titleId: 'home.service.residency.title',
    descId: 'home.service.residency.desc',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    to: '/apply/tax-certificate',
    titleId: 'home.service.taxCert.title',
    descId: 'home.service.taxCert.desc',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
      </svg>
    ),
  },
  {
    to: '/apply/child-benefit',
    titleId: 'home.service.childBenefit.title',
    descId: 'home.service.childBenefit.desc',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
  {
    to: '/tax-administration',
    titleId: 'home.service.taxAdmin.title',
    descId: 'home.service.taxAdmin.desc',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
];

const principles = [
  { titleId: 'home.principle.dataAtHome.title', bodyId: 'home.principle.dataAtHome.body', icon: '🇪🇺' },
  { titleId: 'home.principle.aiHelps.title',    bodyId: 'home.principle.aiHelps.body',    icon: '🤖' },
  { titleId: 'home.principle.everyone.title',   bodyId: 'home.principle.everyone.body',   icon: '♿' },
  { titleId: 'home.principle.youDecide.title',  bodyId: 'home.principle.youDecide.body',  icon: '🔐' },
];

export function HomePage(_: { locale?: string }) {
  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero__inner">
          <span className="hero__eyebrow"><span className="hero__eyebrow-dot" /> <FormattedMessage id="home.hero.eyebrow" defaultMessage="Nordic public services · Live" /></span>
          <h1 id="hero-heading"><FormattedMessage id="home.hero.title" defaultMessage="Unified Digital Citizen Services" /></h1>
          <p className="lede">
            <FormattedMessage id="home.hero.lede" defaultMessage="One trusted entry point for residents of Denmark, Sweden and Norway. Apply once, follow your case in real time, get help in your language — with caseworkers always in the loop." />
          </p>
          <div className="hero__cta">
            <Link to="/apply/residency" className="button-primary"><FormattedMessage id="home.hero.cta.start" defaultMessage="Start an application" /></Link>
            <Link to="/cases" className="button-secondary"><FormattedMessage id="home.hero.cta.track" defaultMessage="Track my cases" /></Link>
          </div>
        </div>
      </section>

      <div className="trust-strip" role="list" aria-label="Platform guarantees">
        <div className="trust-item" role="listitem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          <span><strong><FormattedMessage id="home.trust.dataResidency" defaultMessage="EU data residency" /></strong> · <FormattedMessage id="home.trust.dataResidency.sub" defaultMessage="sovereign by design" /></span>
        </div>
        <div className="trust-item" role="listitem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
          <span><strong><FormattedMessage id="home.trust.languages" defaultMessage="12 languages" /></strong> · <FormattedMessage id="home.trust.languages.sub" defaultMessage="ICU MessageFormat, RTL ready" /></span>
        </div>
        <div className="trust-item" role="listitem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          <span><strong><FormattedMessage id="home.trust.wcag" defaultMessage="WCAG 2.1 AA" /></strong> · <FormattedMessage id="home.trust.wcag.sub" defaultMessage="screen-reader & keyboard verified" /></span>
        </div>
        <div className="trust-item" role="listitem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z" /><path d="M9 12l2 2 4-4" /></svg>
          <span><strong><FormattedMessage id="home.trust.aiAct" defaultMessage="EU AI Act" /></strong> · <FormattedMessage id="home.trust.aiAct.sub" defaultMessage="transparent, auditable, human override" /></span>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2><FormattedMessage id="home.services.heading" defaultMessage="What can we help you with today?" /></h2>
          <p><FormattedMessage id="home.services.lede" defaultMessage="Pick a service and we’ll guide you. Every form pre-fills what we already know." /></p>
        </div>
      </div>
      <ul className="service-grid">
        {services.map((s) => (
          <li key={s.to}>
            <Link to={s.to} className="service-card">
              <span className="service-card__icon" aria-hidden="true">{s.icon}</span>
              <h3><FormattedMessage id={s.titleId} /></h3>
              <p><FormattedMessage id={s.descId} /></p>
              <span className="service-card__cta"><FormattedMessage id="home.service.cta" defaultMessage="Get started" /></span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="bridge-callout" aria-labelledby="unified-platform-heading">
        <div className="bridge-callout__text">
          <h3 id="unified-platform-heading"><FormattedMessage id="home.bridge.heading" defaultMessage="A unified platform across the Nordic public sector" /></h3>
          <p>
            <FormattedMessage id="home.bridge.body" defaultMessage="UDCSP is a unified citizen platform that connects, in a single guided experience, the registers, eIDs and case systems of Denmark, Sweden and Norway. We don’t replace national authorities — we collect your data once, validate the cross-border rules (Info Norden, Øresunddirekt, Grensetjänsten, EU Single Digital Gateway), pre-fill the right form, and submit it to the competent authority for your country." />
          </p>
        </div>
        <PlatformDiagram
          groups={[
            { country: 'Denmark', flag: '🇩🇰', items: [
              { label: 'borger.dk', sub: 'Citizen portal' },
              { label: 'CPR', sub: 'Population register' },
              { label: 'MitID', sub: 'National eID' },
              { label: 'SKAT', sub: 'Tax authority' },
              { label: 'Udbetaling DK', sub: 'Family benefits' },
            ] },
            { country: 'Sweden', flag: '🇸🇪', items: [
              { label: 'Skatteverket', sub: 'Tax & population' },
              { label: 'Försäkringskassan', sub: 'Social insurance' },
              { label: 'BankID', sub: 'eID' },
              { label: 'Freja+', sub: 'eID' },
            ] },
            { country: 'Norway', flag: '🇳🇴', items: [
              { label: 'Skatteetaten', sub: 'Tax & registry' },
              { label: 'NAV', sub: 'Welfare & benefits' },
              { label: 'Altinn', sub: 'Forms portal' },
              { label: 'UDI', sub: 'Immigration' },
              { label: 'ID-porten', sub: 'eID gateway' },
            ] },
          ]}
        />
      </section>

      <div className="section-heading">
        <div>
          <h2><FormattedMessage id="home.principles.heading" defaultMessage="How the platform works for you" /></h2>
          <p><FormattedMessage id="home.principles.lede" defaultMessage="Four simple promises behind every screen — your data stays at home, AI helps but never decides alone, the portal is usable by everyone, and you stay in charge of your information." /></p>
        </div>
      </div>
      <ul className="principles-grid" role="list">
        {principles.map((p) => (
          <li key={p.titleId} className="principle-card">
            <span className="principle-card__icon" aria-hidden="true">{p.icon}</span>
            <h3><FormattedMessage id={p.titleId} /></h3>
            <p><FormattedMessage id={p.bodyId} /></p>
          </li>
        ))}
      </ul>
    </>
  );
}
