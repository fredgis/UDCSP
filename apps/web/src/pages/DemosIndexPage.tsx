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

export function DemosIndexPage() {
  return (
    <section aria-labelledby="demos-title">
      <h1 id="demos-title">Demonstration scenarios</h1>
      <p style={{ maxWidth: '52rem' }}>
        Ten end-to-end scenarios that exercise every row of the README evaluation matrix.
        Each demo is a self-contained walk-through — pick one and follow the deep-link to the relevant portal page or admin surface.
        See <a href="https://github.com/fredgis/UDCSP/blob/main/docs/biz/uses.md">docs/biz/uses.md</a> for the full script.
      </p>
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
