import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

type Demo = {
  id: string;
  title: string;
  persona: string;
  category: 'citizen' | 'office' | 'governance' | 'insights' | 'devops';
  channels: string;
  story: string;
  links: { label: string; to: string }[];
};

const demos: Demo[] = [
  {
    id: 'D1', title: 'Anna moves from Copenhagen to Stockholm', persona: 'Anna · DK→SE · flagship',
    category: 'citizen', channels: 'Web · Mobile · Chat · SMS · Email · Caseworker',
    story: 'Federated eID, omnichannel, multilingual, eligibility pre-assessment — the full citizen journey.',
    links: [{ label: 'Start residency transfer', to: '/apply/residency' }, { label: 'Track case', to: '/cases' }],
  },
  {
    id: 'D2', title: 'Lars asks the voice assistant about his tax refund', persona: 'Lars · NB voice',
    category: 'citizen', channels: 'Voice · SMS · Caseworker',
    story: 'Norwegian phone call → ACS Call Automation → Foundry topic-router → TTS reply → SMS follow-up.',
    links: [{ label: 'Voice channel doc', to: '/demo/D2' }],
  },
  {
    id: 'D3', title: 'Maria submits a benefit application with a screen reader', persona: 'Maria · PL on SE',
    category: 'citizen', channels: 'Web · Chat · Caseworker',
    story: 'Polish UI on Danish portal, screen-reader friendly (Windows Narrator), AI assistant in PL, eligibility flagged for human review.',
    links: [{ label: 'Apply child benefit', to: '/apply/child-benefit' }, { label: 'Track case', to: '/cases' }],
  },
  {
    id: 'D4', title: 'Erik snaps a payslip from his phone', persona: 'Erik · DK mobile',
    category: 'citizen', channels: 'Mobile · Caseworker',
    story: 'Document Extractor reads payslip → autofill income field → eligibility pre-check.',
    links: [{ label: 'Apply child benefit', to: '/apply/child-benefit' }],
  },
  {
    id: 'D5', title: 'Astrid the caseworker triages a queue with Copilot for Service', persona: 'Astrid · caseworker',
    category: 'office', channels: 'Caseworker',
    story: 'D365 Customer Service queue, Copilot summaries, multilingual KB, suggested replies.',
    links: [{ label: 'Open D365 (caseworker app)', to: '/demo/D5' }],
  },
  {
    id: 'D6', title: 'Eligibility model proposes, caseworker disposes', persona: 'Astrid · human-in-the-loop',
    category: 'office', channels: 'Caseworker',
    story: 'AI says "ineligible 0.71" — Astrid overrides, override is logged in the AI Act registry.',
    links: [{ label: 'Caseworker app', to: '/demo/D6' }],
  },
  {
    id: 'D7', title: 'Hans the DPO audits a six-month-old AI decision', persona: 'Hans · DPO',
    category: 'governance', channels: 'Admin / Foundry traces',
    story: 'Replay the decision in Foundry tracing, view DPIA, AI Act registry entry on Confidential Ledger.',
    links: [{ label: 'Compliance overview', to: '/demo/D7' }],
  },
  {
    id: 'D8', title: 'A prompt-injection attempt is contained and investigated', persona: 'Malicious citizen → Ingrid',
    category: 'governance', channels: 'Chat',
    story: 'Citizen Assistant + Content Safety blocks "ignore previous instructions"; Sentinel raises an incident.',
    links: [{ label: 'Try the chat', to: '/' }, { label: 'Compliance overview', to: '/demo/D8' }],
  },
  {
    id: 'D9', title: 'CIO reviews per-country, per-language outcomes & 47-portal sunset', persona: 'CIO',
    category: 'insights', channels: 'Microsoft Fabric',
    story: 'Executive workspace, 28d→4d, +38% CSAT, 47→1 consolidation, per-language eval coverage.',
    links: [{ label: 'CIO outcomes', to: '/demo/D9' }],
  },
  {
    id: 'D10', title: 'DevOps stands up the entire platform from a clean tenant', persona: 'DevOps',
    category: 'devops', channels: 'Installer / Bicep / Power Platform',
    story: 'One PowerShell installer (~120 min) provisions 22 phases A1→D-app from a clean MCAPS subscription.',
    links: [{ label: 'Installer doc', to: '/demo/D10' }],
  },
];

const tag: Record<Demo['category'], { label: string; color: string }> = {
  citizen: { label: '🌐 Citizen', color: 'var(--color-primary)' },
  office: { label: '🛠️ Back-office', color: '#0f766e' },
  governance: { label: '🛡️ Governance', color: '#b91c1c' },
  insights: { label: '📊 Insights', color: '#a16207' },
  devops: { label: '💻 DevOps', color: '#7c3aed' },
};

function PrincipleDiagram() {
  // HTML/CSS-driven architecture diagram (no SVG).
  // Five tiers stacked vertically, connected by a thin spine. The AI Brain in
  // the middle is the visual anchor — gradient panel + glow + 6 agent chips.
  return (
    <figure className="arch-diagram" aria-labelledby="diagram-caption">
      <div className="arch-diagram__grid">

        {/* Tier 1 — Channels */}
        <section className="arch-tier arch-tier--channels" aria-label="Channels">
          <header className="arch-tier__head">
            <span className="arch-tier__num">1</span>
            <h3>How citizens reach UDCSP</h3>
          </header>
          <div className="arch-tier__row">
            {[
              { icon: '💻', label: 'Web' },
              { icon: '📱', label: 'Mobile' },
              { icon: '☎️', label: 'Voice' },
              { icon: '✉️', label: 'Email · SMS' },
              { icon: '💬', label: 'Chat' },
            ].map((c) => (
              <div key={c.label} className="arch-chip">
                <span className="arch-chip__icon" aria-hidden="true">{c.icon}</span>
                <span className="arch-chip__label">{c.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tier 2 — Front door */}
        <section className="arch-tier arch-tier--frontdoor" aria-label="Front door">
          <header className="arch-tier__head">
            <span className="arch-tier__num">2</span>
            <h3>Identity &amp; sovereign gateway</h3>
          </header>
          <div className="arch-tier__row arch-tier__row--two">
            <div className="arch-card arch-card--blue">
              <span className="arch-card__icon" aria-hidden="true">🪪</span>
              <div>
                <strong>Entra External ID</strong>
                <span>3 CIAM tenants · MitID · BankID · OAuth 2.1</span>
              </div>
            </div>
            <div className="arch-card arch-card--blue">
              <span className="arch-card__icon" aria-hidden="true">🔐</span>
              <div>
                <strong>APIM Premium</strong>
                <span>JWT · CORS · per-op policies · audit</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tier 3 — AI BRAIN (centrepiece) */}
        <section className="arch-tier arch-tier--brain" aria-label="AI Brain">
          <header className="arch-tier__head arch-tier__head--brain">
            <span className="arch-tier__num arch-tier__num--brain">3</span>
            <h3>🧠 AI Brain — Microsoft Foundry</h3>
            <span className="arch-tier__tag">6 agents · audit-traced</span>
          </header>
          <div className="arch-tier__grid arch-tier__grid--brain">
            {[
              { icon: '🧭', label: 'Topic Router',           sub: 'classify intent → channel agent' },
              { icon: '🗂️', label: 'Classifier',              sub: 'taxonomy · 12 languages' },
              { icon: '⚖️', label: 'Eligibility Pre-Assessor', sub: 'decision · confidence · reasoning' },
              { icon: '📄', label: 'Document Extractor',      sub: 'OCR + structured fields' },
              { icon: '🌐', label: 'Translator',              sub: 'PL/UA/AR ↔ DA/SV/NB' },
              { icon: '🤝', label: 'Citizen / Caseworker AI', sub: 'grounded RAG · plain language' },
            ].map((a) => (
              <article key={a.label} className="arch-agent">
                <span className="arch-agent__icon" aria-hidden="true">{a.icon}</span>
                <h4>{a.label}</h4>
                <p>{a.sub}</p>
              </article>
            ))}
          </div>
          <p className="arch-brain__footer">
            Every invocation is traced (App Insights), persisted (Dataverse + Microsoft Fabric) and signed with the AI Act registry id (Annex IV).
          </p>
        </section>

        {/* Tier 4 — Orchestration */}
        <section className="arch-tier arch-tier--orch" aria-label="Orchestration">
          <header className="arch-tier__head">
            <span className="arch-tier__num">4</span>
            <h3>Logic Apps orchestration</h3>
          </header>
          <div className="arch-tier__row arch-tier__row--three">
            {[
              { icon: '🧩', label: 'application-intake' },
              { icon: '🚦', label: 'caseworker-decision-publish' },
              { icon: '🛂', label: 'cross-border-residency' },
            ].map((o) => (
              <div key={o.label} className="arch-card arch-card--magenta">
                <span className="arch-card__icon" aria-hidden="true">{o.icon}</span>
                <strong>{o.label}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* Tier 5 — Country backend */}
        <section className="arch-tier arch-tier--backend" aria-label="Country backend">
          <header className="arch-tier__head">
            <span className="arch-tier__num">5</span>
            <h3>Country backend — data stays in country</h3>
          </header>
          <div className="arch-tier__row arch-tier__row--four">
            {[
              { icon: '🛠️', label: 'D365 / Dataverse',    sub: 'cases · contacts' },
              { icon: '🧬', label: 'Microsoft Fabric',    sub: 'analytics · BI · AI data' },
              { icon: '🛡️', label: 'Purview · Sentinel',  sub: 'lineage · DLP · SIEM' },
              { icon: '🗃️', label: 'Storage (per country)', sub: 'docs · CMK · sovereign' },
            ].map((b) => (
              <div key={b.label} className="arch-card arch-card--green">
                <span className="arch-card__icon" aria-hidden="true">{b.icon}</span>
                <div>
                  <strong>{b.label}</strong>
                  <span>{b.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
      <figcaption id="diagram-caption">
        Five tiers stacked top-to-bottom: citizens reach UDCSP through five channels, the front door (Entra External ID + APIM Premium) authenticates and authorises every request, the <strong>AI Brain</strong> — six specialised Microsoft Foundry agents — classifies, extracts, translates and pre-assesses, Logic Apps orchestrate the multi-step workflows, and only the citizen&rsquo;s own country backend persists the case. Each country runs its own copy of every tier; nothing crosses the residency boundary unless the citizen explicitly opted in.
      </figcaption>
    </figure>
  );
}

export function DemosIndexPage() {
  return (
    <section aria-labelledby="demos-title">
      <header className="demos-hero">
        <h1 id="demos-title"><FormattedMessage id="demos.title" defaultMessage="Demonstration scenarios" /></h1>
        <p>
          <FormattedMessage id="demos.lede" defaultMessage="Ten end-to-end scenarios — citizen journeys, back-office work, governance, observability and DevOps. Pick one and follow the deep links." />
        </p>
      </header>

      <div className="section-heading">
        <div>
          <h2><FormattedMessage id="demos.architecture.heading" defaultMessage="How everything is wired" /></h2>
          <p>The functional architecture below shows the path every citizen request takes — through identity, the platform layer and into the country&rsquo;s own backend.</p>
        </div>
      </div>
      <PrincipleDiagram />

      <div className="section-heading" style={{ marginTop: 'var(--space-6)' }}>
        <div>
          <h2><FormattedMessage id="demos.scenarios.heading" defaultMessage="The ten scenarios" /></h2>
          <p><FormattedMessage id="demos.scenarios.lede" defaultMessage="Each demo is self-contained and can be played independently." /></p>
        </div>
      </div>
      <ul className="demo-grid" role="list">
        {demos.map((d) => {
          const t = tag[d.category];
          return (
            <li key={d.id} className="demo-card">
              <header className="demo-card__head">
                <span className="demo-card__id" style={{ background: t.color }}>{d.id}</span>
                <span className="demo-card__tag">{t.label}</span>
              </header>
              <h2 className="demo-card__title">{d.title}</h2>
              <p className="demo-card__persona">{d.persona}</p>
              <p className="demo-card__story">{d.story}</p>
              <p className="demo-card__channels"><strong>Channels:</strong> {d.channels}</p>
              <div className="demo-card__links">
                {d.links.map((l) => (
                  <Link key={l.to + l.label} to={l.to}>{l.label} →</Link>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
