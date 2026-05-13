import { Link } from 'react-router-dom';

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
    story: 'Polish UI on Swedish portal, NVDA-friendly, AI assistant in PL, eligibility flagged for human review.',
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
    category: 'insights', channels: 'Power BI Premium',
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
  // Clean three-tier functional architecture: channels → sovereign platform → country backends.
  // Two-column legend, generous spacing, soft drop shadows, no overlapping arrows.
  return (
    <figure className="principle-diagram" aria-labelledby="diagram-caption">
      <svg viewBox="0 0 1100 560" role="img" aria-labelledby="diagram-title" preserveAspectRatio="xMidYMid meet">
        <title id="diagram-title">UDCSP functional architecture — channels, platform, country backends</title>
        <defs>
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#1d4ed8" />
          </marker>
          <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#15803d" />
          </marker>
          <linearGradient id="lane-channels" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
          <linearGradient id="lane-platform" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#eff6ff" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id="lane-backend" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f0fdf4" />
            <stop offset="100%" stopColor="#dcfce7" />
          </linearGradient>
          <filter id="card-shadow" x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Lane backgrounds */}
        <rect x="20" y="20"  width="1060" height="140" rx="14" fill="url(#lane-channels)" stroke="#fbbf24" strokeWidth="1" opacity="0.6" />
        <rect x="20" y="200" width="1060" height="140" rx="14" fill="url(#lane-platform)" stroke="#93c5fd" strokeWidth="1" opacity="0.6" />
        <rect x="20" y="380" width="1060" height="160" rx="14" fill="url(#lane-backend)"  stroke="#86efac" strokeWidth="1" opacity="0.6" />

        {/* Lane titles */}
        <text x="40" y="48" fontSize="13" fontWeight="700" fill="#92400e" letterSpacing="0.08em">CHANNELS — how citizens reach UDCSP</text>
        <text x="40" y="228" fontSize="13" fontWeight="700" fill="#1e3a8a" letterSpacing="0.08em">SOVEREIGN PLATFORM LAYER — same in every country</text>
        <text x="40" y="408" fontSize="13" fontWeight="700" fill="#14532d" letterSpacing="0.08em">COUNTRY BACKEND — data and processing stay in-country</text>

        {/* Country selector pills */}
        <g transform="translate(880,30)">
          <text x="100" y="14" fontSize="11" fontWeight="600" fill="#64748b" textAnchor="end">Active per country</text>
          <g transform="translate(0,22)">
            <circle cx="20" cy="14" r="14" fill="#fff" stroke="#cbd5e1" /><text x="20" y="19" fontSize="14" textAnchor="middle">🇩🇰</text>
            <circle cx="60" cy="14" r="14" fill="#fff" stroke="#cbd5e1" /><text x="60" y="19" fontSize="14" textAnchor="middle">🇸🇪</text>
            <circle cx="100" cy="14" r="14" fill="#fff" stroke="#cbd5e1" /><text x="100" y="19" fontSize="14" textAnchor="middle">🇳🇴</text>
          </g>
        </g>

        {/* CHANNELS — 5 cards evenly spaced */}
        {[
          { x: 60,  icon: '💻', label: 'Web', sub: 'Static Web App' },
          { x: 250, icon: '📱', label: 'Mobile',   sub: 'PWA' },
          { x: 440, icon: '☎️', label: 'Voice',    sub: 'ACS Call Automation' },
          { x: 630, icon: '✉️', label: 'Email · SMS', sub: 'Logic Apps' },
          { x: 820, icon: '💬', label: 'Chat',     sub: 'Citizen Assistant' },
        ].map((c) => (
          <g key={c.label} transform={`translate(${c.x},70)`} filter="url(#card-shadow)">
            <rect width="160" height="74" rx="10" fill="#fffbeb" stroke="#d97706" strokeWidth="1.4" />
            <text x="14" y="34" fontSize="22">{c.icon}</text>
            <text x="46" y="34" fontSize="14" fontWeight="700" fill="#78350f">{c.label}</text>
            <text x="14" y="58" fontSize="11" fill="#92400e">{c.sub}</text>
          </g>
        ))}

        {/* PLATFORM — Identity + APIM + Foundry + Logic Apps */}
        {[
          { x: 60,  icon: '🪪', label: 'Entra External ID', sub: 'DK · SE · NO tenants' },
          { x: 290, icon: '🔐', label: 'APIM gateway',       sub: 'JWT · CORS · routing · audit' },
          { x: 540, icon: '🤖', label: 'Foundry agents',      sub: 'classifier · eligibility · extractor' },
          { x: 820, icon: '⚙️', label: 'Logic Apps',          sub: 'orchestration · MI to backends' },
        ].map((c) => (
          <g key={c.label} transform={`translate(${c.x},250)`} filter="url(#card-shadow)">
            <rect width={c.label === 'Foundry agents' ? 250 : 220} height="74" rx="10" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.4" />
            <text x="14" y="34" fontSize="22">{c.icon}</text>
            <text x="46" y="34" fontSize="14" fontWeight="700" fill="#1e3a8a">{c.label}</text>
            <text x="14" y="58" fontSize="11" fill="#1e40af">{c.sub}</text>
          </g>
        ))}

        {/* BACKENDS — D365, Dataverse/Lakehouse, Purview/Sentinel, Power BI */}
        {[
          { x: 60,  icon: '🛠️', label: 'D365 Customer Service', sub: 'cases · queues · Copilot' },
          { x: 320, icon: '🗄️', label: 'Dataverse · Lakehouse',  sub: 'cases · documents · evals' },
          { x: 580, icon: '🛡️', label: 'Purview · Sentinel',     sub: 'audit · DLP · incidents' },
          { x: 840, icon: '📊', label: 'Power BI',                sub: 'CIO outcomes · KPIs' },
        ].map((c) => (
          <g key={c.label} transform={`translate(${c.x},430)`} filter="url(#card-shadow)">
            <rect width="240" height="80" rx="10" fill="#ffffff" stroke="#15803d" strokeWidth="1.4" />
            <text x="14" y="36" fontSize="22">{c.icon}</text>
            <text x="46" y="36" fontSize="14" fontWeight="700" fill="#14532d">{c.label}</text>
            <text x="14" y="60" fontSize="11" fill="#166534">{c.sub}</text>
          </g>
        ))}

        {/* Channels → Identity (single converging arrow) */}
        {[140, 330, 520, 710, 900].map((x) => (
          <line key={x} x1={x} y1="144" x2="170" y2="249" stroke="#1d4ed8" strokeWidth="1.4" opacity="0.55" />
        ))}
        {/* Identity → APIM */}
        <line x1="280" y1="287" x2="290" y2="287" stroke="#1d4ed8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        {/* APIM → Foundry */}
        <line x1="510" y1="287" x2="540" y2="287" stroke="#1d4ed8" strokeWidth="2" markerEnd="url(#arrow-blue)" />
        {/* APIM → Logic Apps */}
        <path d="M 510 297 C 600 350 700 350 820 297" stroke="#1d4ed8" strokeWidth="2" fill="none" markerEnd="url(#arrow-blue)" />
        {/* Foundry → Logic Apps */}
        <line x1="790" y1="287" x2="820" y2="287" stroke="#1d4ed8" strokeWidth="2" markerEnd="url(#arrow-blue)" />

        {/* Logic Apps → backends */}
        <line x1="900" y1="324" x2="180" y2="429" stroke="#15803d" strokeWidth="1.4" opacity="0.55" markerEnd="url(#arrow-green)" />
        <line x1="920" y1="324" x2="440" y2="429" stroke="#15803d" strokeWidth="1.4" opacity="0.55" markerEnd="url(#arrow-green)" />
        <line x1="940" y1="324" x2="700" y2="429" stroke="#15803d" strokeWidth="1.4" opacity="0.55" markerEnd="url(#arrow-green)" />
        <line x1="960" y1="324" x2="960" y2="429" stroke="#15803d" strokeWidth="1.4" opacity="0.55" markerEnd="url(#arrow-green)" />
      </svg>
      <figcaption id="diagram-caption">
        Channels feed a single sovereign platform layer (identity, gateway, AI agents, orchestration) that talks to the country&rsquo;s own backend. Each country runs its own copy of every tier — there is no shared cross-border data store. The portal selects the right backend automatically based on the tenant the citizen signed in with, so data residency and EU AI Act traceability are enforced end-to-end.
      </figcaption>
    </figure>
  );
}

export function DemosIndexPage() {
  return (
    <section aria-labelledby="demos-title">
      <header className="demos-hero">
        <h1 id="demos-title">Demonstration scenarios</h1>
        <p>
          Ten end-to-end scenarios that exercise every row of the README evaluation matrix —
          citizen journeys, back-office work, governance, observability and DevOps.
          Pick one and follow the deep links to the relevant portal page or admin surface.
          The full narration lives in <a href="https://github.com/fredgis/UDCSP/blob/main/docs/biz/uses.md">docs/biz/uses.md</a>.
        </p>
      </header>

      <div className="section-heading">
        <div>
          <h2>How everything is wired</h2>
          <p>The functional architecture below shows the path every citizen request takes — through identity, the platform layer and into the country&rsquo;s own backend.</p>
        </div>
      </div>
      <PrincipleDiagram />

      <div className="section-heading" style={{ marginTop: 'var(--space-6)' }}>
        <div>
          <h2>The ten scenarios</h2>
          <p>Each demo is self-contained and can be played independently.</p>
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
