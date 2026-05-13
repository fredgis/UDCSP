import { useEffect, useState } from 'react';

type Consent = {
  id: string;
  title: string;
  description: string;
  legalBasis: string;
  defaultEnabled: boolean;
  required?: boolean;
};

const CONSENTS: Consent[] = [
  {
    id: 'crossBorder',
    title: 'Cross-border eligibility checks',
    description:
      'Allow the platform to query the population, tax and social-security registers of the other Nordic countries (DK · SE · NO) when an application requires it. Each query is logged and shared with you in the audit trail.',
    legalBasis: 'GDPR art. 6(1)(e) — public-interest task · cross-border under EU regulation 883/2004',
    defaultEnabled: false,
  },
  {
    id: 'notifications',
    title: 'Status notifications by email and SMS',
    description:
      'Receive transactional updates whenever the status of one of your cases changes. We never use your contact details for marketing.',
    legalBasis: 'GDPR art. 6(1)(b) — performance of the service you requested',
    defaultEnabled: true,
  },
  {
    id: 'aiAssistant',
    title: 'AI-assisted help in the citizen assistant',
    description:
      'Let the citizen assistant retrieve information about your active cases when you chat with it. The assistant never makes a decision — a caseworker always reviews recommendations.',
    legalBasis: 'GDPR art. 6(1)(a) — your explicit consent · EU AI Act art. 13 transparency',
    defaultEnabled: true,
  },
  {
    id: 'dataExport',
    title: 'Data export to a third party',
    description:
      'Allow UDCSP to send a portable copy of your case file to a third-party service of your choice (e.g. a relocation agency, a legal advisor). One-shot consent — you confirm each export individually.',
    legalBasis: 'GDPR art. 6(1)(a) + art. 20 — right to data portability',
    defaultEnabled: false,
  },
  {
    id: 'analytics',
    title: 'Anonymous usage analytics',
    description:
      'Help us improve the portal by sharing anonymous interaction data (page visits, screen-reader usage, error rates). No personal identifier is sent.',
    legalBasis: 'GDPR art. 6(1)(a) — your consent',
    defaultEnabled: true,
  },
  {
    id: 'platformAudit',
    title: 'Audit and compliance logging',
    description:
      'Every action taken on your file (by you, a caseworker or an AI agent) is recorded in an immutable audit log for 7 years. This is required to satisfy public-sector accountability and the EU AI Act.',
    legalBasis: 'Public-sector transparency law · EU AI Act art. 12 record-keeping',
    defaultEnabled: true,
    required: true,
  },
];

const STORAGE_KEY = 'udcsp.consents.v1';

function loadStored(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch { /* ignore */ }
  const initial: Record<string, boolean> = {};
  for (const c of CONSENTS) initial[c.id] = c.defaultEnabled;
  return initial;
}

export function ConsentManagementPage() {
  const [state, setState] = useState<Record<string, boolean>>(loadStored());
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSaved(false); }, [state]);

  function toggle(id: string, v: boolean, required?: boolean) {
    if (required) return;
    setState((s) => ({ ...s, [id]: v }));
  }

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaved(true);
  }

  return (
    <section aria-labelledby="consent-title" className="consent-page">
      <header className="apply-page__head">
        <h1 id="consent-title">Consent &amp; privacy</h1>
        <p>
          You stay in charge of your data. Toggle each item to allow or revoke a permission. Revocations propagate to
          APIM and the orchestration layer within seconds — pending requests still in flight finish, but no new ones
          are issued.
        </p>
      </header>

      <form onSubmit={save} className="consent-form">
        <ul className="consent-list">
          {CONSENTS.map((c) => (
            <li key={c.id} className={`consent-card${c.required ? ' consent-card--required' : ''}`}>
              <div className="consent-card__main">
                <h2>{c.title}</h2>
                <p>{c.description}</p>
                <p className="consent-card__legal"><strong>Legal basis:</strong> {c.legalBasis}</p>
              </div>
              <label className="consent-toggle">
                <input
                  type="checkbox"
                  checked={state[c.id] ?? c.defaultEnabled}
                  disabled={c.required}
                  onChange={(e) => toggle(c.id, e.currentTarget.checked, c.required)}
                />
                <span className="consent-toggle__track" aria-hidden="true">
                  <span className="consent-toggle__thumb" />
                </span>
                <span className="consent-toggle__label">
                  {c.required ? 'Always on' : (state[c.id] ?? c.defaultEnabled) ? 'Allowed' : 'Revoked'}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="apply-submit">
          <button type="submit" className="button-primary">Save preferences</button>
          {saved && <span className="info-banner info-banner--ok" role="status">✅ Preferences saved.</span>}
        </div>
      </form>
    </section>
  );
}
