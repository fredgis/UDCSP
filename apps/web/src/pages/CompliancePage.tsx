import { Link } from 'react-router-dom';
import { PlatformDiagram } from '../components/PlatformDiagram';

type Pillar = {
  ref: string;
  title: string;
  what: string;
  how: string;
  citizen: string;
};

const pillars: Pillar[] = [
  {
    ref: 'Reg. EU 2016/679',
    title: 'GDPR — General Data Protection Regulation',
    what: 'Every personal data point we hold has a documented legal basis, a finite retention period, and a tested removal path.',
    how: 'Lawful basis Art. 6(1)(e) "task carried out in the public interest". Data minimisation by design. Right-to-erasure cascade tested across five storage zones in ≤ 30 days. Microsoft Purview maintains the Record of Processing Activities (RoPA).',
    citizen: 'You may request access, correction, export or deletion of your data at any time, in your own language.',
  },
  {
    ref: 'Reg. EU 2024/1689',
    title: 'EU AI Act',
    what: 'You are always informed when an AI system is involved, and a qualified human takes the final decision on any matter that affects you.',
    how: 'Each agent is registered in the Foundry AI Act Registry with a conformity dossier. The Eligibility Pre-Assessor is classified High-Risk (Annex III): it proposes, a caseworker disposes. Operational logs are retained ≥ 6 months (Art. 26(6)).',
    citizen: 'You may request the reasoning behind any AI-assisted recommendation and ask a human to review it.',
  },
  {
    ref: 'Operating model',
    title: 'Bridge to national authorities',
    what: 'UDCSP is the unified digital front door. The competent national authority remains the controller and decision-maker for the substantive case.',
    how: 'When you submit, only the data the authority requires is transmitted. The decision, certificate or residency record is issued by CPR, Skatteverket, NAV, SKAT, Försäkringskassan, Udbetaling Danmark, Altinn, UDI or ID-porten — never by UDCSP.',
    citizen: 'Appeals and access to your official file are addressed to the authority that issued the decision; UDCSP indicates which one and how to reach it.',
  },
  {
    ref: 'Reg. EU 910/2014',
    title: 'eIDAS — Electronic Identification',
    what: 'You authenticate with your own national eID. UDCSP recognises EU/EEA electronic identities through the eIDAS interoperability bridge.',
    how: 'Supported eIDs: MitID (DK), BankID and Freja+ (SE), MinID and ID-porten (NO). Credentials never reach UDCSP — only a signed assertion at the assurance level required for the action. EU Digital Identity Wallet (eIDAS 2.0) is on the roadmap.',
    citizen: 'No additional credential to manage. The eID you already trust nationally is the eID accepted by UDCSP.',
  },
  {
    ref: 'Dir. 2002/58/EC',
    title: 'ePrivacy — Electronic Communications',
    what: 'Voice, SMS, email and chat interactions are treated as confidential electronic communications.',
    how: 'A standing notice is delivered at the start of each interaction. Voice recordings are purged at 90 days. The platform operates on a public-interest legal basis (Art. 6(1)(e)), not on consent — which would be inappropriate for a regalian service.',
    citizen: 'No marketing repurposing of any interaction. No silent recording. Each channel discloses its retention rule upfront.',
  },
  {
    ref: 'Dir. EU 2022/2555',
    title: 'NIS2 — Network and Information Security',
    what: 'Public administration is an "essential entity". A tested security programme and a 24-hour incident-notification chain to the national CSIRT are mandatory.',
    how: 'ISO 27001-aligned risk management. Microsoft Defender for Cloud, Microsoft Sentinel as SIEM, customer-managed keys per country, managed identities, Azure Policy as code. Supply-chain assurance via Microsoft attestations.',
    citizen: 'In the event of a serious incident, the responsible national authority is notified within 24 hours.',
  },
  {
    ref: 'Dir. EU 2016/2102 · WCAG 2.1 AA',
    title: 'Web Accessibility',
    what: 'Every channel — web, mobile, chat, voice IVR, SMS, email, caseworker — is built and tested to WCAG 2.1 Level AA.',
    how: 'Keyboard operability, screen-reader semantics, captioned voice flows, alt text, focus management, scalable typography, contrast compliance. A dated accessibility statement per country with a feedback channel in 12 languages.',
    citizen: 'Report a barrier through the Accessibility tab; we are bound to acknowledge and provide a remediation path.',
  },
  {
    ref: 'DK · SE · NO',
    title: 'National administrative law',
    what: 'Each country applies its own administrative-law obligations — Forvaltningsloven (DK / NO) and Förvaltningslagen (SE) — on top of the EU baseline.',
    how: 'Per-country tenant, per-country data residency, per-country Microsoft Purview retention policies that extend (never shorten) the EU baseline. National Data Protection Authority is the citizen\'s point of contact.',
    citizen: 'Your data is held within your country. The supervisory authority for any complaint is the DPA of your country of residence.',
  },
];

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

export function CompliancePage() {
  return (
    <section aria-labelledby="compliance-title" className="compliance-page">
      <div className="compliance-shell">

        <header className="compliance-hero">
          <div className="compliance-hero__eyebrow">Regulatory framework</div>
          <h1 id="compliance-title">Compliance &amp; regulatory posture</h1>
          <p className="compliance-hero__lead">
            UDCSP operates as a public-administration platform across Denmark, Sweden and Norway and is
            subject to eight overlapping regulatory regimes. This page sets out, in plain language, the
            obligations the platform meets, the controls it applies, and the rights it guarantees to
            citizens.
          </p>
          <dl className="compliance-hero__meta">
            <div><dt>Document type</dt><dd>Compliance summary (executive)</dd></div>
            <div><dt>Authoritative source</dt><dd><code>docs/biz/datacompliance.md</code></dd></div>
            <div><dt>Scope</dt><dd>DK · SE · NO · 12 languages · 7 channels</dd></div>
          </dl>
        </header>

        <figure className="compliance-diagram" role="group" aria-labelledby="diagram-title">
          <figcaption id="diagram-title" className="compliance-diagram__caption">
            <span className="compliance-num">FIG. 01</span> Compliance posture — how the eight regimes flow into platform controls and citizen outcomes
          </figcaption>
          <div className="compliance-diagram__board">
            <div className="compliance-layer compliance-layer--regs" aria-label="Layer 1 — regulations">
              <div className="compliance-layer__head">
                <span className="compliance-layer__num">L1</span>
                <span className="compliance-layer__title">Regulatory framework</span>
              </div>
              <div className="compliance-layer__chips">
                <span className="cd-chip cd-chip--regs" title="GDPR">GDPR</span>
                <span className="cd-chip cd-chip--regs" title="EU AI Act">AI Act</span>
                <span className="cd-chip cd-chip--regs" title="ePrivacy">ePrivacy</span>
                <span className="cd-chip cd-chip--regs" title="eIDAS">eIDAS</span>
                <span className="cd-chip cd-chip--regs" title="NIS2">NIS2</span>
                <span className="cd-chip cd-chip--regs" title="Web Accessibility">WCAG 2.1 AA</span>
                <span className="cd-chip cd-chip--regs" title="National administrative law">National law</span>
                <span className="cd-chip cd-chip--regs" title="ISO 27001 / SOC 2">ISO · SOC 2</span>
              </div>
            </div>
            <div className="compliance-arrow" aria-hidden="true">↓</div>
            <div className="compliance-layer compliance-layer--ctrl" aria-label="Layer 2 — platform controls">
              <div className="compliance-layer__head">
                <span className="compliance-layer__num">L2</span>
                <span className="compliance-layer__title">Platform controls (in code)</span>
              </div>
              <div className="compliance-layer__chips">
                <span className="cd-chip cd-chip--ctrl">CMK per country</span>
                <span className="cd-chip cd-chip--ctrl">Retention &amp; immutability</span>
                <span className="cd-chip cd-chip--ctrl">RBAC + ABAC</span>
                <span className="cd-chip cd-chip--ctrl">Foundry traces</span>
                <span className="cd-chip cd-chip--ctrl">AI Act registry</span>
                <span className="cd-chip cd-chip--ctrl">Human override</span>
                <span className="cd-chip cd-chip--ctrl">Erasure cascade</span>
                <span className="cd-chip cd-chip--ctrl">Channel notices</span>
              </div>
            </div>
            <div className="compliance-arrow" aria-hidden="true">↓</div>
            <div className="compliance-layer compliance-layer--gov" aria-label="Layer 3 — governance and evidence">
              <div className="compliance-layer__head">
                <span className="compliance-layer__num">L3</span>
                <span className="compliance-layer__title">Governance &amp; evidence</span>
              </div>
              <div className="compliance-layer__chips">
                <span className="cd-chip cd-chip--gov">Microsoft Purview</span>
                <span className="cd-chip cd-chip--gov">Microsoft Sentinel</span>
                <span className="cd-chip cd-chip--gov">DPO console</span>
                <span className="cd-chip cd-chip--gov">Conformity dossiers</span>
                <span className="cd-chip cd-chip--gov">RoPA · DPIA</span>
                <span className="cd-chip cd-chip--gov">Audit timeline</span>
              </div>
            </div>
            <div className="compliance-arrow" aria-hidden="true">↓</div>
            <div className="compliance-layer compliance-layer--out" aria-label="Layer 4 — citizen-facing outcomes">
              <div className="compliance-layer__head">
                <span className="compliance-layer__num">L4</span>
                <span className="compliance-layer__title">Citizen-facing outcomes</span>
              </div>
              <div className="compliance-layer__chips">
                <span className="cd-chip cd-chip--out">Access in 30 d</span>
                <span className="cd-chip cd-chip--out">Erasure ≤ 30 d</span>
                <span className="cd-chip cd-chip--out">Human review</span>
                <span className="cd-chip cd-chip--out">12 languages</span>
                <span className="cd-chip cd-chip--out">WCAG AA channels</span>
                <span className="cd-chip cd-chip--out">National DPA contact</span>
              </div>
            </div>
            <div className="compliance-bridge" aria-label="Bridge to national authorities">
              <span className="compliance-bridge__lbl">Bridge — separate controllers</span>
              <div className="compliance-bridge__nodes">
                <span className="cd-node cd-node--dk">🇩🇰 DK · CPR · MitID · SKAT · Udbetaling DK</span>
                <span className="cd-node cd-node--se">🇸🇪 SE · Skatteverket · Försäkringskassan · BankID</span>
                <span className="cd-node cd-node--no">🇳🇴 NO · NAV · Skatteetaten · Altinn · ID-porten</span>
              </div>
            </div>
          </div>
        </figure>

        <section className="compliance-block" aria-labelledby="frame-title">
          <h2 id="frame-title"><span className="compliance-num">01</span> Regulatory framework</h2>
          <p className="compliance-lede">
            The eight regimes overlap on every interaction — a single voice call is GDPR, ePrivacy, AI
            Act, NIS2, eIDAS and Accessibility at once. Compliance by design is one of the platform&rsquo;s
            ten architecture principles, not a project deliverable.
          </p>
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
        </section>

        <section className="compliance-block" aria-labelledby="rights-title">
          <h2 id="rights-title"><span className="compliance-num">02</span> Citizen rights and operational service levels</h2>
          <p className="compliance-lede">
            The seven core data-subject rights of the GDPR are delivered through automated workflows
            rather than paper procedures. Each right has a measurable service level.
          </p>
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
        </section>

        <section className="compliance-block" aria-labelledby="bridge-title">
          <h2 id="bridge-title"><span className="compliance-num">03</span> Controllership boundary</h2>
          <p className="compliance-lede">
            UDCSP is the unified front door — it captures, validates and routes the citizen&rsquo;s request.
            The substantive decision, the official record and the certificate are produced by the
            competent national authority. The diagram below shows this routing topology.
          </p>
          <PlatformDiagram
            title="Routing to national authorities"
            intro="UDCSP prepares the file once; the competent authority issues the decision and the official record."
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

        <section className="compliance-block" aria-labelledby="evidence-title">
          <h2 id="evidence-title"><span className="compliance-num">04</span> Evidence pack available to a regulator</h2>
          <p className="compliance-lede">
            Should a Data Protection Authority, the AI Office or a national supervisory body request
            evidence, the following dossier is generated on demand from the platform&rsquo;s control plane.
          </p>
          <ul className="compliance-evidence">
            {auditPack.map((a) => (
              <li key={a.title}>
                <strong>{a.title}</strong>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="compliance-block compliance-block--neutral" aria-labelledby="exposure-title">
          <h2 id="exposure-title"><span className="compliance-num">05</span> Exposure for non-compliance</h2>
          <p className="compliance-lede">
            Statutory maxima are recorded for completeness; UDCSP treats them as the consequence of
            failure, not the threshold of acceptability.
          </p>
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
        </section>

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
