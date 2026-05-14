import { Link } from 'react-router-dom';
import { PlatformDiagram } from '../components/PlatformDiagram';

type Pillar = {
  emoji: string;
  title: string;
  what: string;
  how: string;
  citizenWords: string;
};

const pillars: Pillar[] = [
  {
    emoji: '🛡️',
    title: 'GDPR — Your personal data',
    what: 'Every piece of data you give us has a legal reason to exist, a clear retention period, and a way out if you ask for it.',
    how: 'We collect the minimum needed for the service you asked for. We never sell or trade it. We store it inside your own country (Denmark, Sweden or Norway). We delete it on request within 30 days, and we cascade that deletion across every system we use.',
    citizenWords: 'Ask any time: "What do you have on me? Delete it. Send it to me." We answer in your language, in days — not months.',
  },
  {
    emoji: '🤖',
    title: 'EU AI Act — When AI is involved',
    what: 'You are always told when you are talking to AI, and a human always has the last word on a decision that affects you.',
    how: 'Each AI assistant on the platform is registered, evaluated and traceable. The eligibility assistant — the one that estimates whether you qualify for a benefit — is classified high-risk: it only proposes, a caseworker decides. Every recommendation is kept for at least 6 months so you can ask why.',
    citizenWords: 'You can always ask: "Did an AI look at my case? What did it say? I want a human to review."',
  },
  {
    emoji: '🤝',
    title: 'Bridge to national authorities',
    what: 'UDCSP does not replace CPR, Skatteverket, NAV, SKAT, Försäkringskassan or Udbetaling Danmark. It is the unified front door that prepares your file and routes it to the right authority.',
    how: 'When you submit, we send the minimum data the authority needs and we mirror back the official status. The decision, the certificate, the residency record always come from the competent national authority — never from UDCSP.',
    citizenWords: 'For appeals or to access your file, you go to the authority that decided — UDCSP shows you who and how.',
  },
  {
    emoji: '🔐',
    title: 'eIDAS — Your digital identity',
    what: 'You sign in with your own national eID — MitID, BankID, Freja+, ID-porten, MinID — and the platform recognises eIDs from other EU/EEA countries through the eIDAS bridge.',
    how: 'We never see or store your eID password. We receive a signed assertion that you are who you say you are, with the assurance level required for the action. The future EU Digital Identity Wallet (eIDAS 2.0) is on the roadmap.',
    citizenWords: 'No new password to remember. The eID you already trust is the eID we use.',
  },
  {
    emoji: '☎️',
    title: 'ePrivacy — Voice, SMS, email, chat',
    what: 'Every call, message and chat is treated as a confidential electronic communication.',
    how: 'You hear or see a notice at the start of every interaction. Voice recordings are deleted at 90 days. We use marketing-style consent banners only for genuinely optional cookies; the platform itself runs on a public-interest legal basis, not on a click-through that would be brittle for a public service.',
    citizenWords: 'No surprise marketing. No silent recording. You always know who is listening and for how long.',
  },
  {
    emoji: '🛡️',
    title: 'NIS2 — Cybersecurity',
    what: 'Public administration is an "essential entity" under NIS2: we must run a tested security programme and tell the national CSIRT within 24 hours of a serious incident.',
    how: 'The platform is built on Azure (ISO 27001 + SOC 2 Type II certified by Microsoft). On top of that we add Microsoft Defender for Cloud, Microsoft Sentinel as the SIEM, customer-managed keys per country, managed identities everywhere, and Azure Policy as code so a misconfigured resource is rejected at deploy time.',
    citizenWords: 'If something goes wrong, the right people are paged in minutes, not days — and the country authority is told within 24 hours.',
  },
  {
    emoji: '♿',
    title: 'Accessibility — WCAG 2.1 AA',
    what: 'Every channel — web, mobile, chat, voice IVR, SMS, email — is built and tested to WCAG 2.1 AA standards.',
    how: 'High-contrast mode, font scaling, keyboard navigation, screen-reader semantics, captions on voice flows, alt text on every image, focus rings on every interactive element. A published accessibility statement per country with a feedback channel in 12 languages.',
    citizenWords: 'If something blocks you, tell us — we owe you a reply and a fix path. The "Accessibility" tab is the front door.',
  },
  {
    emoji: '🌍',
    title: 'National law — DK · SE · NO',
    what: 'Every country has its own administrative law (Forvaltningsloven, Förvaltningslagen, Forvaltningsloven) on top of the EU baseline. We extend retention floors where national rules require it.',
    how: 'Each country has its own tenant, its own data residency, its own retention policies, its own DPA contact. Per-country Purview policies extend — never shorten — the EU baseline.',
    citizenWords: 'Your data stays in your country. The DPA you complain to is the DPA of your country.',
  },
];

const rights = [
  { emoji: '👁️', title: 'See what we hold (Art. 15)', text: 'Within 30 days, free of charge, in the language you choose.' },
  { emoji: '✏️', title: 'Correct it (Art. 16)', text: 'Wrong data? We fix it and notify every system that had a copy.' },
  { emoji: '🗑️', title: 'Erase it (Art. 17)', text: 'Cascading delete across the 5 storage zones in ≤ 30 days. Some authority records are kept under national law — we tell you which and why.' },
  { emoji: '⏸️', title: 'Restrict processing (Art. 18)', text: 'Pause everything while a dispute is investigated.' },
  { emoji: '📦', title: 'Take it with you (Art. 20)', text: 'Machine-readable export in JSON or CSV.' },
  { emoji: '🚫', title: 'Object (Art. 21)', text: 'Refuse certain types of processing — a caseworker reviews.' },
  { emoji: '🤖', title: 'Not be profiled (Art. 22)', text: 'No automated decision affects you without a human review.' },
];

const auditPack = [
  { emoji: '📜', title: 'AI Act conformity dossier', text: 'One PDF per AI assistant — purpose, training-data summary, evaluation report, post-market monitoring.' },
  { emoji: '📋', title: 'Record of Processing (RoPA)', text: 'Auto-generated from Microsoft Purview — never out of date.' },
  { emoji: '🔍', title: 'DPIA per AI assistant', text: 'Data Protection Impact Assessment kept alongside the prompt and the eval suite.' },
  { emoji: '🕓', title: 'Sentinel audit timeline', text: 'Tamper-evident log of every consequential event, signed in Azure Confidential Ledger.' },
  { emoji: '♿', title: 'Accessibility statement (per country)', text: 'Updated and dated, with a working feedback channel.' },
];

export function CompliancePage() {
  return (
    <section aria-labelledby="compliance-title">
      <div className="page-shell">
        <header className="page-shell__head">
          <h1 id="compliance-title">⚖️ Compliance — how UDCSP keeps your trust</h1>
          <p>
            UDCSP runs in public administration, so it must respect <strong>eight overlapping regulations</strong> on
            every single citizen interaction. This page explains, in plain language, what each rule means for you and
            what we do about it. The technical detail lives in <Link to="/cases">your cases</Link> traces and in our
            public documentation on <a href="https://github.com/fredgis/UDCSP" rel="noreferrer">GitHub</a>.
          </p>
        </header>

        <section className="compliance-pillars" aria-label="The eight compliance pillars">
          {pillars.map((p) => (
            <article key={p.title} className="compliance-card">
              <header>
                <span className="compliance-card__emoji" aria-hidden="true">{p.emoji}</span>
                <h2>{p.title}</h2>
              </header>
              <p className="compliance-card__what">{p.what}</p>
              <p className="compliance-card__how"><strong>How we do it.</strong> {p.how}</p>
              <p className="compliance-card__citizen">💬 {p.citizenWords}</p>
            </article>
          ))}
        </section>

        <section className="compliance-section" aria-label="Your rights">
          <h2>Your rights as a citizen</h2>
          <p>You have seven core rights under GDPR. We deliver them through automated workflows — not through a paper form.</p>
          <ul className="compliance-rights">
            {rights.map((r) => (
              <li key={r.title}>
                <span className="compliance-rights__emoji" aria-hidden="true">{r.emoji}</span>
                <strong>{r.title}</strong>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="compliance-section" aria-label="The platform that delivers compliance">
          <h2>The platform that delivers all this</h2>
          <p>
            The platform diagram below shows the same architecture that serves your applications — the controls listed
            in the cards above are built into every layer (identity, AI brain, orchestration, storage), not bolted on
            at the end.
          </p>
          <PlatformDiagram
            title="The bridge to national authorities"
            intro="UDCSP is the unified front door — your application is prepared once, then routed to the competent national authority that owns the decision and the official record."
            groups={[
              { country: 'Denmark', flag: '🇩🇰', items: [
                { label: 'CPR', sub: 'civil registry' },
                { label: 'borger.dk', sub: 'citizen portal' },
                { label: 'MitID', sub: 'eID' },
                { label: 'SKAT', sub: 'tax' },
                { label: 'Udbetaling DK', sub: 'benefits' },
              ]},
              { country: 'Sweden', flag: '🇸🇪', items: [
                { label: 'Skatteverket', sub: 'tax · personnummer' },
                { label: 'Försäkringskassan', sub: 'social insurance' },
                { label: 'BankID', sub: 'eID' },
              ]},
              { country: 'Norway', flag: '🇳🇴', items: [
                { label: 'Skatteetaten', sub: 'tax' },
                { label: 'NAV', sub: 'welfare' },
                { label: 'Altinn', sub: 'public forms' },
                { label: 'UDI', sub: 'immigration' },
                { label: 'ID-porten', sub: 'eID' },
              ]},
            ]}
          />
        </section>

        <section className="compliance-section" aria-label="Audit pack">
          <h2>What a regulator can ask for — and we hand over</h2>
          <p>If a Data Protection Authority knocks on the door, we have a pre-built evidence pack ready to share.</p>
          <ul className="compliance-audit">
            {auditPack.map((a) => (
              <li key={a.title}>
                <span className="compliance-audit__emoji" aria-hidden="true">{a.emoji}</span>
                <div>
                  <strong>{a.title}</strong>
                  <span>{a.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="compliance-section compliance-section--worst" aria-label="Worst case">
          <h2>What if we fail?</h2>
          <p>
            We treat fines as the consequence of failure, not the threshold of acceptability. For context: GDPR fines
            can reach €20 M or 4 % of global turnover. The EU AI Act adds €35 M / 7 % for prohibited-AI breaches and
            €15 M / 3 % for high-risk obligations. NIS2 reaches €10 M / 2 %. Beyond fines: lost citizen trust and
            regulatory operating restrictions. <strong>Compliance by design</strong> is one of our ten architecture
            principles — not a project deliverable.
          </p>
        </section>

        <footer className="compliance-footer">
          <p>
            Questions about your data, your rights, or a complaint? Use the <Link to="/consent">Consent &amp; privacy</Link> tab,
            the <Link to="/accessibility">Accessibility</Link> feedback channel, or contact your country&rsquo;s Data Protection Authority directly.
          </p>
        </footer>
      </div>
    </section>
  );
}
