import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { PlatformDiagram } from '../components/PlatformDiagram';

type Pillar = {
  ref: string;
  short: string;
  title: string;
  what: string;
  how: string;
  citizen: string;
  axis: 'data' | 'ai' | 'identity' | 'security' | 'channels' | 'national';
};

const pillars: Pillar[] = [
  {
    ref: 'Reg. EU 2016/679',
    short: 'GDPR',
    title: 'GDPR — General Data Protection Regulation',
    what: 'Every personal data point we hold has a documented legal basis, a finite retention period, and a tested removal path.',
    how: 'Lawful basis Art. 6(1)(e) "task carried out in the public interest". Data minimisation by design. Right-to-erasure cascade tested across five storage zones in ≤ 30 days. Microsoft Purview maintains the Record of Processing Activities (RoPA).',
    citizen: 'You may request access, correction, export or deletion of your data at any time, in your own language.',
    axis: 'data',
  },
  {
    ref: 'Reg. EU 2024/1689',
    short: 'AI Act',
    title: 'EU AI Act',
    what: 'You are always informed when an AI system is involved, and a qualified human takes the final decision on any matter that affects you.',
    how: 'Each agent is registered in the Foundry AI Act Registry with a conformity dossier. The Eligibility Pre-Assessor is classified High-Risk (Annex III): it proposes, a caseworker disposes. Operational logs are retained ≥ 6 months (Art. 26(6)).',
    citizen: 'You may request the reasoning behind any AI-assisted recommendation and ask a human to review it.',
    axis: 'ai',
  },
  {
    ref: 'Operating model',
    short: 'Bridge',
    title: 'Bridge to national authorities',
    what: 'UDCSP is the unified digital front door. The competent national authority remains the controller and decision-maker for the substantive case.',
    how: 'When you submit, only the data the authority requires is transmitted. The decision, certificate or residency record is issued by CPR, Skatteverket, NAV, SKAT, Försäkringskassan, Udbetaling Danmark, Altinn, UDI or ID-porten — never by UDCSP.',
    citizen: 'Appeals and access to your official file are addressed to the authority that issued the decision; UDCSP indicates which one and how to reach it.',
    axis: 'national',
  },
  {
    ref: 'Reg. EU 910/2014',
    short: 'eIDAS',
    title: 'eIDAS — Electronic Identification',
    what: 'You authenticate with your own national eID. UDCSP recognises EU/EEA electronic identities through the eIDAS interoperability bridge.',
    how: 'Supported eIDs: MitID (DK), BankID and Freja+ (SE), MinID and ID-porten (NO). Credentials never reach UDCSP — only a signed assertion at the assurance level required for the action. EU Digital Identity Wallet (eIDAS 2.0) is on the roadmap.',
    citizen: 'No additional credential to manage. The eID you already trust nationally is the eID accepted by UDCSP.',
    axis: 'identity',
  },
  {
    ref: 'Dir. 2002/58/EC',
    short: 'ePrivacy',
    title: 'ePrivacy — Electronic Communications',
    what: 'Voice, SMS, email and chat interactions are treated as confidential electronic communications.',
    how: 'A standing notice is delivered at the start of each interaction. Voice recordings are purged at 90 days. The platform operates on a public-interest legal basis (Art. 6(1)(e)), not on consent — which would be inappropriate for a regalian service.',
    citizen: 'No marketing repurposing of any interaction. No silent recording. Each channel discloses its retention rule upfront.',
    axis: 'channels',
  },
  {
    ref: 'Dir. EU 2022/2555',
    short: 'NIS2',
    title: 'NIS2 — Network and Information Security',
    what: 'Public administration is an "essential entity". A tested security programme and a 24-hour incident-notification chain to the national CSIRT are mandatory.',
    how: 'ISO 27001-aligned risk management. Microsoft Defender for Cloud, Microsoft Sentinel as SIEM, customer-managed keys per country, managed identities, Azure Policy as code. Supply-chain assurance via Microsoft attestations.',
    citizen: 'In the event of a serious incident, the responsible national authority is notified within 24 hours.',
    axis: 'security',
  },
  {
    ref: 'Dir. EU 2016/2102 · WCAG 2.1 AA',
    short: 'WCAG',
    title: 'Web Accessibility',
    what: 'Every channel — web, mobile, chat, voice IVR, SMS, email, caseworker — is built and tested to WCAG 2.1 Level AA.',
    how: 'Keyboard operability, screen-reader semantics, captioned voice flows, alt text, focus management, scalable typography, contrast compliance. A dated accessibility statement per country with a feedback channel in 12 languages.',
    citizen: 'Report a barrier through the Accessibility tab; we are bound to acknowledge and provide a remediation path.',
    axis: 'channels',
  },
  {
    ref: 'DK · SE · NO',
    short: 'National',
    title: 'National administrative law',
    what: 'Each country applies its own administrative-law obligations — Forvaltningsloven (DK / NO) and Förvaltningslagen (SE) — on top of the EU baseline.',
    how: 'Per-country tenant, per-country data residency, per-country Microsoft Purview retention policies that extend (never shorten) the EU baseline. National Data Protection Authority is the citizen\'s point of contact.',
    citizen: 'Your data is held within your country. The supervisory authority for any complaint is the DPA of your country of residence.',
    axis: 'national',
  },
];

const AXIS_LABEL: Record<Pillar['axis'], { label: string; color: string }> = {
  data: { label: 'Data', color: '#1565c0' },
  ai: { label: 'AI', color: '#7b1fa2' },
  identity: { label: 'Identity', color: '#0277bd' },
  security: { label: 'Security', color: '#c62828' },
  channels: { label: 'Channels', color: '#2e7d32' },
  national: { label: 'National', color: '#e65100' },
};

const rights = [
  { article: 'Art. 15', title: 'Right of access', text: 'Within 30 days, free of charge, in the language of your choice.' },
  { article: 'Art. 16', title: 'Right to rectification', text: 'Inaccurate data is corrected and the change is propagated to every system holding a copy.' },
  { article: 'Art. 17', title: 'Right to erasure', text: 'Cascading delete across the five storage zones in ≤ 30 days, subject to mandatory national retention.' },
  { article: 'Art. 18', title: 'Right to restriction', text: 'Processing is suspended pending the outcome of a dispute.' },
  { article: 'Art. 20', title: 'Right to portability', text: 'Machine-readable export in JSON or CSV.' },
  { article: 'Art. 21', title: 'Right to object', text: 'Certain processing activities may be refused; a caseworker reviews each request.' },
  { article: 'Art. 22', title: 'No solely automated decision', text: 'No decision producing legal effects is taken without qualified human review.' },
];

const auditPack = [
  { title: 'AI Act conformity dossier', text: 'One document per agent — purpose of use, training-data summary, evaluation report, post-market monitoring plan.' },
  { title: 'Record of Processing (RoPA)', text: 'Generated and maintained by Microsoft Purview; never out of date.' },
  { title: 'Data Protection Impact Assessment (DPIA)', text: 'Held alongside each agent\'s prompt and evaluation suite.' },
  { title: 'Sentinel audit timeline', text: 'Tamper-evident log of every consequential event, signed in Azure Confidential Ledger.' },
  { title: 'Accessibility statement', text: 'Dated, per country, with a working feedback channel.' },
];

// At-a-glance posture overview — one chip per regulation, grouped by axis.
function ComplianceOverview() {
  return (
    <figure className="compliance-overview" aria-labelledby="overview-caption">
      <figcaption id="overview-caption" className="compliance-overview__caption">
        Compliance posture at a glance — 8 regulatory regimes mapped onto 6 architecture axes.
      </figcaption>
      <div className="compliance-overview__chart" role="img" aria-label="8 regulations grouped under Data, AI, Identity, Security, Channels and National axes; all marked covered.">
        {(['data', 'ai', 'identity', 'security', 'channels', 'national'] as const).map((axis) => {
          const items = pillars.filter((p) => p.axis === axis);
          const meta = AXIS_LABEL[axis];
          return (
            <div key={axis} className="compliance-axis" style={{ ['--axis-color' as any]: meta.color }}>
              <div className="compliance-axis__head">
                <span className="compliance-axis__dot" aria-hidden="true" />
                <span className="compliance-axis__label">{meta.label}</span>
                <span className="compliance-axis__count">{items.length}</span>
              </div>
              <ul className="compliance-axis__items">
                {items.map((p) => (
                  <li key={p.title} className="compliance-axis__pill" title={`${p.ref} · ${p.title}`}>
                    <span className="compliance-axis__pill-name">{p.short}</span>
                    <span className="compliance-axis__pill-check" aria-hidden="true">✓</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="compliance-overview__legend">
        Each pill represents one regulation UDCSP must satisfy. The ✓ confirms that the corresponding
        implementation (policy, control or audit artefact) is in place. Expand the sections below for
        the obligation, the platform response, and the citizen-facing effect of each.
      </p>
    </figure>
  );
}

export function CompliancePage() {
  return (
    <section aria-labelledby="compliance-title" className="compliance-page">
      <div className="compliance-shell">

        <header className="compliance-hero">
          <div className="compliance-hero__eyebrow"><FormattedMessage id="compliance.eyebrow" defaultMessage="Regulatory framework" /></div>
          <h1 id="compliance-title"><FormattedMessage id="compliance.title" defaultMessage="Compliance & regulatory posture" /></h1>
          <p className="compliance-hero__lead">
            <FormattedMessage id="compliance.hero.lede1" defaultMessage="UDCSP runs on the same European cloud, governance and data-protection rules as any modern public agency. The frameworks below are the ones a regulator would expect to see." />
          </p>
          <dl className="compliance-hero__meta">
            <div><dt>Document type</dt><dd>Compliance summary (executive)</dd></div>
            <div><dt>Authoritative source</dt><dd><code>docs/biz/datacompliance.md</code></dd></div>
            <div><dt>Scope</dt><dd>DK · SE · NO · 12 languages · 7 channels</dd></div>
          </dl>
        </header>

        <ComplianceOverview />

        <details className="compliance-section">
          <summary>
            <span className="compliance-section__num">01</span>
            <span className="compliance-section__head">
              <h2><FormattedMessage id="compliance.section.framework" defaultMessage="Regulatory framework" /></h2>
              <p>
                Eight regimes overlap on every interaction — one voice call is at once GDPR, ePrivacy,
                AI Act, NIS2, eIDAS and Accessibility. Expand to see how UDCSP responds to each.
              </p>
            </span>
            <span className="compliance-section__chevron" aria-hidden="true">▾</span>
          </summary>
          <ol className="compliance-pillars">
            {pillars.map((p, idx) => (
              <li key={p.title} className="compliance-pillar">
                <header>
                  <span className="compliance-pillar__index">{String(idx + 1).padStart(2, '0')}</span>
                  <div>
                    <span className="compliance-pillar__ref">{p.ref}</span>
                    <h3>{p.title}</h3>
                  </div>
                </header>
                <dl>
                  <dt>Obligation</dt>
                  <dd>{p.what}</dd>
                  <dt>UDCSP response</dt>
                  <dd>{p.how}</dd>
                  <dt>Citizen-facing effect</dt>
                  <dd>{p.citizen}</dd>
                </dl>
              </li>
            ))}
          </ol>
        </details>

        <details className="compliance-section">
          <summary>
            <span className="compliance-section__num">02</span>
            <span className="compliance-section__head">
              <h2><FormattedMessage id="compliance.section.rights" defaultMessage="Citizen rights and operational service levels" /></h2>
              <p>
                The seven core data-subject rights of the GDPR are delivered through automated workflows,
                each with a measurable service level. Expand for the table.
              </p>
            </span>
            <span className="compliance-section__chevron" aria-hidden="true">▾</span>
          </summary>
          <table className="compliance-table" aria-label="Citizen rights and service levels">
            <thead>
              <tr><th scope="col">Article</th><th scope="col">Right</th><th scope="col">Operational commitment</th></tr>
            </thead>
            <tbody>
              {rights.map((r) => (
                <tr key={r.article}>
                  <td><code>{r.article}</code></td>
                  <td>{r.title}</td>
                  <td>{r.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>

        <details className="compliance-section">
          <summary>
            <span className="compliance-section__num">03</span>
            <span className="compliance-section__head">
              <h2><FormattedMessage id="compliance.section.controllership" defaultMessage="Controllership boundary" /></h2>
              <p>
                UDCSP is the unified front door; the competent national authority remains controller and
                decision-maker. Expand for the routing topology to CPR, Skatteverket, NAV, Altinn, etc.
              </p>
            </span>
            <span className="compliance-section__chevron" aria-hidden="true">▾</span>
          </summary>
          <p className="compliance-lede">
            UDCSP captures, validates and routes the citizen&rsquo;s request. The substantive decision, the
            official record and the certificate are produced by the competent national authority. The
            diagram below shows this routing topology.
          </p>
          <PlatformDiagram
            title="Routing to national authorities"
            intro="UDCSP prepares the file once; the competent authority issues the decision and the official record."
            groups={[
              { country: 'Denmark', code: 'dk', items: [
                { label: 'CPR', sub: 'civil registry' },
                { label: 'borger.dk', sub: 'citizen portal' },
                { label: 'MitID', sub: 'eID' },
                { label: 'SKAT', sub: 'tax' },
                { label: 'Udbetaling DK', sub: 'benefits' },
              ]},
              { country: 'Sweden', code: 'se', items: [
                { label: 'Skatteverket', sub: 'tax · personnummer' },
                { label: 'Försäkringskassan', sub: 'social insurance' },
                { label: 'BankID', sub: 'eID' },
              ]},
              { country: 'Norway', code: 'no', items: [
                { label: 'Skatteetaten', sub: 'tax' },
                { label: 'NAV', sub: 'welfare' },
                { label: 'Altinn', sub: 'public forms' },
                { label: 'UDI', sub: 'immigration' },
                { label: 'ID-porten', sub: 'eID' },
              ]},
            ]}
          />
        </details>

        <details className="compliance-section">
          <summary>
            <span className="compliance-section__num">04</span>
            <span className="compliance-section__head">
              <h2><FormattedMessage id="compliance.section.evidence" defaultMessage="Evidence pack available to a regulator" /></h2>
              <p>
                Five artefacts generated on demand from the control plane, ready for a Data Protection
                Authority, the AI Office or a national supervisory body.
              </p>
            </span>
            <span className="compliance-section__chevron" aria-hidden="true">▾</span>
          </summary>
          <ul className="compliance-evidence">
            {auditPack.map((a) => (
              <li key={a.title}>
                <strong>{a.title}</strong>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </details>

        <details className="compliance-section compliance-section--neutral">
          <summary>
            <span className="compliance-section__num">05</span>
            <span className="compliance-section__head">
              <h2><FormattedMessage id="compliance.section.exposure" defaultMessage="Exposure for non-compliance" /></h2>
              <p>
                Statutory maxima recorded for completeness — treated as consequences of failure, not as
                thresholds of acceptability.
              </p>
            </span>
            <span className="compliance-section__chevron" aria-hidden="true">▾</span>
          </summary>
          <table className="compliance-table" aria-label="Statutory maxima">
            <thead>
              <tr><th scope="col">Regulation</th><th scope="col">Maximum administrative fine</th></tr>
            </thead>
            <tbody>
              <tr><td>GDPR</td><td>€20 M or 4% of global annual turnover</td></tr>
              <tr><td>EU AI Act — prohibited practices</td><td>€35 M or 7% of global annual turnover</td></tr>
              <tr><td>EU AI Act — high-risk obligations</td><td>€15 M or 3% of global annual turnover</td></tr>
              <tr><td>NIS2</td><td>€10 M or 2% of global annual turnover</td></tr>
            </tbody>
          </table>
          <p className="compliance-fine-note">
            Beyond fines: erosion of citizen trust and possible operating restrictions imposed by the
            supervisory authority.
          </p>
        </details>

        <footer className="compliance-foot">
          <p>
            For data-subject requests, consent management or accessibility feedback, use the
            <Link to="/consent"> Consent &amp; privacy</Link> tab and the
            <Link to="/accessibility"> Accessibility</Link> tab. For complaints, contact the Data
            Protection Authority of your country of residence.
          </p>
          <p className="compliance-foot__source">
            Authoritative source: <code>docs/biz/datacompliance.md</code>. Technical implementation:
            <code> docs/tech/data.md</code>, <code>docs/tech/architecture.md</code>.
          </p>
        </footer>

      </div>
    </section>
  );
}
