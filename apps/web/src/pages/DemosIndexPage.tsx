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
  // Functional architecture diagram. Three swim lanes (citizen, platform, country).
  return (
    <figure className="principle-diagram" aria-labelledby="diagram-caption">
      <svg viewBox="0 0 960 360" role="img" aria-labelledby="diagram-title">
        <title id="diagram-title">UDCSP functional architecture</title>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#1e3a8a" />
          </marker>
          <linearGradient id="gradPlatform" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </linearGradient>
        </defs>

        {/* Swim lane labels */}
        <text x="20" y="35" fontSize="14" fontWeight="700" fill="#475569">Citizen</text>
        <text x="20" y="155" fontSize="14" fontWeight="700" fill="#475569">Platform (per country)</text>
        <text x="20" y="305" fontSize="14" fontWeight="700" fill="#475569">Country backend</text>

        {/* Citizen channels */}
        <g>
          <rect x="120" y="15" width="110" height="46" rx="8" fill="#fef3c7" stroke="#d97706" />
          <text x="175" y="44" fontSize="13" textAnchor="middle" fill="#78350f">Web (SWA)</text>

          <rect x="250" y="15" width="110" height="46" rx="8" fill="#fef3c7" stroke="#d97706" />
          <text x="305" y="44" fontSize="13" textAnchor="middle" fill="#78350f">Mobile (PWA)</text>

          <rect x="380" y="15" width="110" height="46" rx="8" fill="#fef3c7" stroke="#d97706" />
          <text x="435" y="44" fontSize="13" textAnchor="middle" fill="#78350f">Voice (ACS)</text>

          <rect x="510" y="15" width="110" height="46" rx="8" fill="#fef3c7" stroke="#d97706" />
          <text x="565" y="44" fontSize="13" textAnchor="middle" fill="#78350f">Email / SMS</text>

          <rect x="640" y="15" width="110" height="46" rx="8" fill="#fef3c7" stroke="#d97706" />
          <text x="695" y="44" fontSize="13" textAnchor="middle" fill="#78350f">Chat assistant</text>
        </g>

        {/* Identity gate */}
        <rect x="120" y="90" width="160" height="50" rx="8" fill="#dbeafe" stroke="#1d4ed8" />
        <text x="200" y="115" fontSize="13" fontWeight="600" textAnchor="middle" fill="#1e3a8a">Entra External ID</text>
        <text x="200" y="131" fontSize="11" textAnchor="middle" fill="#1e3a8a">DK · SE · NO tenants</text>

        {/* APIM */}
        <rect x="320" y="90" width="160" height="50" rx="8" fill="url(#gradPlatform)" stroke="#1d4ed8" />
        <text x="400" y="115" fontSize="13" fontWeight="600" textAnchor="middle" fill="#1e3a8a">APIM</text>
        <text x="400" y="131" fontSize="11" textAnchor="middle" fill="#1e3a8a">JWT · CORS · routing · audit</text>

        {/* Foundry */}
        <rect x="520" y="90" width="180" height="50" rx="8" fill="url(#gradPlatform)" stroke="#1d4ed8" />
        <text x="610" y="115" fontSize="13" fontWeight="600" textAnchor="middle" fill="#1e3a8a">Foundry agents</text>
        <text x="610" y="131" fontSize="11" textAnchor="middle" fill="#1e3a8a">classifier · eligibility · extractor</text>

        {/* Logic Apps */}
        <rect x="740" y="90" width="180" height="50" rx="8" fill="url(#gradPlatform)" stroke="#1d4ed8" />
        <text x="830" y="115" fontSize="13" fontWeight="600" textAnchor="middle" fill="#1e3a8a">Logic Apps</text>
        <text x="830" y="131" fontSize="11" textAnchor="middle" fill="#1e3a8a">orchestration · MI to backends</text>

        {/* Country backends */}
        <rect x="120" y="240" width="200" height="60" rx="8" fill="#dcfce7" stroke="#15803d" />
        <text x="220" y="265" fontSize="13" fontWeight="600" textAnchor="middle" fill="#14532d">D365 Customer Service</text>
        <text x="220" y="285" fontSize="11" textAnchor="middle" fill="#14532d">cases · queues · Copilot</text>

        <rect x="350" y="240" width="200" height="60" rx="8" fill="#dcfce7" stroke="#15803d" />
        <text x="450" y="265" fontSize="13" fontWeight="600" textAnchor="middle" fill="#14532d">Dataverse / Lakehouse</text>
        <text x="450" y="285" fontSize="11" textAnchor="middle" fill="#14532d">cases · documents · evals</text>

        <rect x="580" y="240" width="200" height="60" rx="8" fill="#dcfce7" stroke="#15803d" />
        <text x="680" y="265" fontSize="13" fontWeight="600" textAnchor="middle" fill="#14532d">Purview · Sentinel</text>
        <text x="680" y="285" fontSize="11" textAnchor="middle" fill="#14532d">audit · DLP · incident</text>

        <rect x="810" y="240" width="120" height="60" rx="8" fill="#dcfce7" stroke="#15803d" />
        <text x="870" y="265" fontSize="13" fontWeight="600" textAnchor="middle" fill="#14532d">Power BI</text>
        <text x="870" y="285" fontSize="11" textAnchor="middle" fill="#14532d">CIO outcomes</text>

        {/* Arrows from channels down to APIM */}
        <line x1="175" y1="62" x2="200" y2="89" stroke="#1e3a8a" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="305" y1="62" x2="380" y2="89" stroke="#1e3a8a" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="435" y1="62" x2="400" y2="89" stroke="#1e3a8a" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="565" y1="62" x2="420" y2="89" stroke="#1e3a8a" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="695" y1="62" x2="610" y2="89" stroke="#1e3a8a" strokeWidth="1.5" markerEnd="url(#arrow)" />

        {/* Identity → APIM */}
        <line x1="280" y1="115" x2="319" y2="115" stroke="#1e3a8a" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* APIM → Foundry */}
        <line x1="480" y1="115" x2="519" y2="115" stroke="#1e3a8a" strokeWidth="1.5" markerEnd="url(#arrow)" />
        {/* APIM → Logic Apps */}
        <line x1="480" y1="125" x2="739" y2="125" stroke="#1e3a8a" strokeWidth="1.5" markerEnd="url(#arrow)" />

        {/* Logic Apps to country backends */}
        <line x1="800" y1="142" x2="220" y2="239" stroke="#15803d" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="830" y1="142" x2="450" y2="239" stroke="#15803d" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="860" y1="142" x2="680" y2="239" stroke="#15803d" strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1="890" y1="142" x2="870" y2="239" stroke="#15803d" strokeWidth="1.5" markerEnd="url(#arrow)" />
      </svg>
      <figcaption id="diagram-caption">
        Each country runs its own copy of the platform stack — Entra External ID tenant, APIM gateway, Foundry agents, Logic Apps, D365, Dataverse and Purview. The portal selects the right backend automatically based on the tenant the citizen signed in with, so data stays inside the country&rsquo;s sovereignty boundary at every step.
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
