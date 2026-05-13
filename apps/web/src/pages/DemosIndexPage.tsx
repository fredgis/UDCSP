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
  // Five-tier functional architecture with the Foundry AI Brain as the centrepiece:
  // channels → identity + gateway (front door) → AI BRAIN (6 agents) ↔ Logic Apps spine → country backends.
  return (
    <figure className="principle-diagram" aria-labelledby="diagram-caption">
      <svg viewBox="0 0 1200 760" role="img" aria-labelledby="diagram-title" preserveAspectRatio="xMidYMid meet">
        <title id="diagram-title">UDCSP functional architecture — channels, front door, AI brain, orchestration, country backends</title>
        <defs>
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#1d4ed8" />
          </marker>
          <marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#6d28d9" />
          </marker>
          <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#15803d" />
          </marker>
          <linearGradient id="lane-channels" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fef9c3" /><stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
          <linearGradient id="lane-frontdoor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#eff6ff" /><stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
          <radialGradient id="brain-bg" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#ede9fe" /><stop offset="100%" stopColor="#c4b5fd" />
          </radialGradient>
          <linearGradient id="lane-orch" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fdf4ff" /><stop offset="100%" stopColor="#fae8ff" />
          </linearGradient>
          <linearGradient id="lane-backend" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f0fdf4" /><stop offset="100%" stopColor="#dcfce7" />
          </linearGradient>
          <filter id="card-shadow" x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.12" />
          </filter>
          <filter id="brain-glow" x="-5%" y="-15%" width="110%" height="130%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Lane backgrounds */}
        <rect x="20" y="20"  width="1160" height="120" rx="14" fill="url(#lane-channels)" stroke="#fbbf24" strokeWidth="1" opacity="0.7" />
        <rect x="20" y="160" width="1160" height="100" rx="14" fill="url(#lane-frontdoor)" stroke="#93c5fd" strokeWidth="1" opacity="0.7" />
        <rect x="20" y="280" width="1160" height="220" rx="18" fill="url(#brain-bg)"      stroke="#7c3aed" strokeWidth="2" opacity="0.95" filter="url(#brain-glow)" />
        <rect x="20" y="520" width="1160" height="80"  rx="14" fill="url(#lane-orch)"     stroke="#d946ef" strokeWidth="1" opacity="0.7" />
        <rect x="20" y="620" width="1160" height="120" rx="14" fill="url(#lane-backend)"  stroke="#86efac" strokeWidth="1" opacity="0.7" />

        {/* Lane titles */}
        <text x="40" y="46"  fontSize="13" fontWeight="700" fill="#92400e" letterSpacing="0.08em">CHANNELS — how citizens reach UDCSP</text>
        <text x="40" y="186" fontSize="13" fontWeight="700" fill="#1e3a8a" letterSpacing="0.08em">FRONT DOOR — identity &amp; sovereign gateway</text>
        <text x="40" y="306" fontSize="14" fontWeight="800" fill="#5b21b6" letterSpacing="0.10em">🧠 AI BRAIN — Microsoft Foundry agents (six specialised models, audit-traced)</text>
        <text x="40" y="546" fontSize="13" fontWeight="700" fill="#86198f" letterSpacing="0.08em">ORCHESTRATION — Logic Apps + Service Bus</text>
        <text x="40" y="646" fontSize="13" fontWeight="700" fill="#14532d" letterSpacing="0.08em">COUNTRY BACKEND — data and processing stay in-country</text>

        {/* Country selector pills (top right) */}
        <g transform="translate(960,28)">
          <text x="200" y="14" fontSize="11" fontWeight="600" fill="#64748b" textAnchor="end">Active per country (DK · SE · NO)</text>
          <g transform="translate(110,20)">
            <circle cx="20" cy="14" r="14" fill="#fff" stroke="#cbd5e1" /><text x="20" y="19" fontSize="14" textAnchor="middle">🇩🇰</text>
            <circle cx="60" cy="14" r="14" fill="#fff" stroke="#cbd5e1" /><text x="60" y="19" fontSize="14" textAnchor="middle">🇸🇪</text>
            <circle cx="100" cy="14" r="14" fill="#fff" stroke="#cbd5e1" /><text x="100" y="19" fontSize="14" textAnchor="middle">🇳🇴</text>
          </g>
        </g>

        {/* CHANNELS — 5 cards evenly spaced */}
        {[
          { x: 60,   icon: '💻', label: 'Web',         sub: 'Static Web App · React' },
          { x: 280,  icon: '📱', label: 'Mobile',      sub: 'PWA · iOS · Android' },
          { x: 500,  icon: '☎️', label: 'Voice',       sub: 'ACS Call Automation' },
          { x: 720,  icon: '✉️', label: 'Email · SMS', sub: 'Logic Apps · ACS' },
          { x: 940,  icon: '💬', label: 'Chat',        sub: 'Citizen Assistant' },
        ].map((c) => (
          <g key={c.label} transform={`translate(${c.x},66)`} filter="url(#card-shadow)">
            <rect width="200" height="64" rx="10" fill="#fffbeb" stroke="#d97706" strokeWidth="1.4" />
            <text x="14" y="32" fontSize="20">{c.icon}</text>
            <text x="44" y="30" fontSize="13" fontWeight="700" fill="#78350f">{c.label}</text>
            <text x="44" y="50" fontSize="11" fill="#92400e">{c.sub}</text>
          </g>
        ))}

        {/* FRONT DOOR — Entra External ID + APIM */}
        <g transform="translate(120,194)" filter="url(#card-shadow)">
          <rect width="380" height="56" rx="10" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.6" />
          <text x="14" y="28" fontSize="20">🪪</text>
          <text x="44" y="26" fontSize="13" fontWeight="700" fill="#1e3a8a">Entra External ID — three CIAM tenants</text>
          <text x="44" y="44" fontSize="11" fill="#1e40af">PL eID, MitID, BankID, OAuth 2.1 / PKCE, MFA</text>
        </g>
        <g transform="translate(700,194)" filter="url(#card-shadow)">
          <rect width="380" height="56" rx="10" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.6" />
          <text x="14" y="28" fontSize="20">🔐</text>
          <text x="44" y="26" fontSize="13" fontWeight="700" fill="#1e3a8a">APIM gateway — Premium, sovereign region</text>
          <text x="44" y="44" fontSize="11" fill="#1e40af">JWT validation · CORS · per-op policies · audit</text>
        </g>

        {/* AI BRAIN — central panel, 6 agent chips */}
        {[
          { x:  60, y: 340, icon: '🧭', label: 'Topic Router',          sub: 'classify intent → channel agent' },
          { x: 410, y: 340, icon: '🗂️', label: 'Classifier',             sub: 'taxonomy · 12 languages' },
          { x: 760, y: 340, icon: '⚖️', label: 'Eligibility Pre-Assessor', sub: 'decision · confidence · reasoning' },
          { x:  60, y: 420, icon: '📄', label: 'Document Extractor',     sub: 'OCR + structured fields' },
          { x: 410, y: 420, icon: '🌐', label: 'Translator',             sub: 'PL/UA/AR/SAMI ↔ DA/SV/NB' },
          { x: 760, y: 420, icon: '🤝', label: 'Citizen / Caseworker Assistant', sub: 'grounded RAG · plain language' },
        ].map((a) => (
          <g key={a.label} transform={`translate(${a.x},${a.y})`} filter="url(#card-shadow)">
            <rect width="380" height="64" rx="12" fill="#ffffff" stroke="#7c3aed" strokeWidth="1.6" />
            <text x="14" y="34" fontSize="22">{a.icon}</text>
            <text x="46" y="30" fontSize="13" fontWeight="700" fill="#5b21b6">{a.label}</text>
            <text x="46" y="50" fontSize="11" fill="#6d28d9">{a.sub}</text>
          </g>
        ))}
        {/* Brain footer line */}
        <text x="40" y="492" fontSize="10.5" fill="#5b21b6">Every agent invocation is traced (App Insights), persisted (Dataverse + Lakehouse) and signed with the AI Act registry id (Annex IV).</text>

        {/* ORCHESTRATION row */}
        {[
          { x:  60, icon: '🧩', label: 'application-intake',        sub: 'classifier → eligibility → extractor → translator' },
          { x: 440, icon: '🚦', label: 'caseworker-decision-publish', sub: 'fan-out updates · citizen notify' },
          { x: 820, icon: '🛂', label: 'cross-border-residency',    sub: 'opt-in registry calls · 883/2004' },
        ].map((o) => (
          <g key={o.label} transform={`translate(${o.x},554)`} filter="url(#card-shadow)">
            <rect width="360" height="50" rx="10" fill="#ffffff" stroke="#a21caf" strokeWidth="1.4" />
            <text x="14" y="30" fontSize="18">{o.icon}</text>
            <text x="44" y="26" fontSize="12.5" fontWeight="700" fill="#86198f">{o.label}</text>
            <text x="44" y="42" fontSize="10.5" fill="#a21caf">{o.sub}</text>
          </g>
        ))}

        {/* BACKENDS — 5 cards, country-replicated */}
        {[
          { x:  40, icon: '🛠️', label: 'D365 / Dataverse',     sub: 'cases · contacts · audit' },
          { x: 270, icon: '🗄️', label: 'Storage Lakehouse',    sub: 'documents · embeddings' },
          { x: 500, icon: '🛡️', label: 'Purview · Sentinel',   sub: 'lineage · DLP · SIEM' },
          { x: 730, icon: '📊', label: 'Power BI Premium',     sub: 'CIO outcomes · per-language CSAT' },
          { x: 960, icon: '🔑', label: 'Confidential Ledger',  sub: 'human override · evidence' },
        ].map((c) => (
          <g key={c.label} transform={`translate(${c.x},666)`} filter="url(#card-shadow)">
            <rect width="200" height="60" rx="10" fill="#ffffff" stroke="#15803d" strokeWidth="1.4" />
            <text x="12" y="32" fontSize="20">{c.icon}</text>
            <text x="42" y="28" fontSize="12.5" fontWeight="700" fill="#14532d">{c.label}</text>
            <text x="42" y="46" fontSize="10.5" fill="#166534">{c.sub}</text>
          </g>
        ))}

        {/* Channels → Front door (5 lines converging on identity) */}
        {[160, 380, 600, 820, 1040].map((x) => (
          <line key={x} x1={x} y1="130" x2="310" y2="194" stroke="#1d4ed8" strokeWidth="1.2" opacity="0.45" />
        ))}
        {/* Identity → APIM */}
        <line x1="500" y1="222" x2="700" y2="222" stroke="#1d4ed8" strokeWidth="2.2" markerEnd="url(#arrow-blue)" />
        {/* APIM → AI Brain (down) */}
        <line x1="890" y1="250" x2="600" y2="296" stroke="#6d28d9" strokeWidth="2.4" markerEnd="url(#arrow-purple)" />
        {/* AI Brain ↔ Orchestration (bidirectional through center) */}
        <path d="M 600 488 V 552" stroke="#a21caf" strokeWidth="2.2" fill="none" markerEnd="url(#arrow-purple)" />
        <path d="M 620 552 V 488" stroke="#a21caf" strokeWidth="2.2" fill="none" markerEnd="url(#arrow-purple)" strokeDasharray="4 3" />
        {/* Orchestration → Backends (3 cones) */}
        {[140, 620, 1000].map((x) => (
          <line key={x} x1={x} y1="604" x2={x} y2="666" stroke="#15803d" strokeWidth="1.6" opacity="0.7" markerEnd="url(#arrow-green)" />
        ))}
      </svg>
      <figcaption id="diagram-caption">
        Citizens reach UDCSP through five channels (web, mobile, voice, email/SMS, chat). The front door (Entra External ID + APIM) authenticates and authorises every request, then hands it to the <strong>AI Brain</strong> — six specialised Microsoft Foundry agents that classify, extract, translate, pre-assess and assist. Logic Apps orchestrate the multi-step workflows (intake, caseworker decision, cross-border checks) and write only into the citizen&rsquo;s own country backend. Each country runs its own copy of every tier; nothing crosses the residency boundary unless the citizen explicitly opted in.
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
