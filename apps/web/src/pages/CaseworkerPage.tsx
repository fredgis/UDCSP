import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { listAllCases, updateCase, type StoredCase } from '../utils/caseStore';

// Caseworker workspace — the demo's stand-in for the D365 Customer
// Service / Power Apps caseworker app described in
// apps/d365/solutions/UDCSP_Core/customizations/apps/caseworker-app.xml.
//
// Why an in-app page rather than a real Microsoft Power App:
//  - we don't have a D365 Customer Service licence in the demo tenants
//  - the caseworker scenario is the same across DK / SE / NO so a single
//    page with a country filter mirrors the model-driven app's site map
//  - reads exactly the same payload that gets POSTed to the
//    application-intake Logic App, so the demo proves the contract
//    end-to-end without needing the Dataverse Web API to be live.
//
// In production the Power App takes over and reads udcsp_application
// rows from the country Dataverse environment via the security-role
// scoped views in caseworker-views.xml.

type Filter = {
  country: 'all' | 'dk' | 'se' | 'no';
  type: 'all' | 'residency-transfer' | 'child-benefit' | 'tax-certificate';
  status: 'open' | 'all';
};

const COUNTRY_FLAG: Record<string, string> = { dk: '🇩🇰', se: '🇸🇪', no: '🇳🇴' };

function isOpen(c: StoredCase): boolean {
  const s = (c.status || '').toLowerCase();
  return !/approved|rejected|cancel/.test(s);
}

function decisionBadge(c: StoredCase) {
  const d = c.decision || '';
  const conf = typeof c.confidence === 'number' ? Math.round(c.confidence * 100) : null;
  if (/likely-eligible|eligible/i.test(d))
    return { label: `✅ Likely eligible${conf !== null ? ` · ${conf}%` : ''}`, color: '#0f5132', bg: '#d1e7dd' };
  if (/ineligible/i.test(d))
    return { label: `❌ Likely ineligible${conf !== null ? ` · ${conf}%` : ''}`, color: '#842029', bg: '#f8d7da' };
  if (/requires-review|review/i.test(d))
    return { label: `🟡 Requires review${conf !== null ? ` · ${conf}%` : ''}`, color: '#664d03', bg: '#fff3cd' };
  return { label: '· no AI verdict', color: '#41464b', bg: '#e2e3e5' };
}

function CaseDetail({ c, onAction }: { c: StoredCase; onAction: (outcome: string, notes: string) => void }) {
  const [notes, setNotes] = useState('');
  const verdict = decisionBadge(c);
  const extracted = (c.extractedFields || {}) as Record<string, unknown>;
  const docUrl = c.documentBlobUrl;
  return (
    <article className="udcsp-panel" style={{ marginTop: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>{c.title}</h2>
          <p style={{ margin: '.25rem 0 .5rem', color: 'var(--color-fg-soft)' }}>
            {COUNTRY_FLAG[c.country] || '🌐'} {c.country.toUpperCase()} · {c.applicationType || 'application'} · #{c.id.slice(0, 8)}
          </p>
          <span style={{ display: 'inline-block', padding: '.2rem .6rem', borderRadius: '999px', background: verdict.bg, color: verdict.color, fontWeight: 600, fontSize: '.85rem' }}>
            {verdict.label}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '.85rem', color: 'var(--color-fg-soft)' }}>Status</p>
          <p style={{ margin: 0, fontWeight: 600 }}>{c.status}</p>
          {c.estimatedDecisionDate && (
            <p style={{ margin: '.4rem 0 0', fontSize: '.85rem', color: 'var(--color-fg-soft)' }}>SLA: {c.estimatedDecisionDate}</p>
          )}
        </div>
      </header>

      <section style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div>
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Citizen</h3>
          <p style={{ margin: 0, fontSize: '.9rem' }}>{c.citizenUpn || '—'}</p>
        </div>
        <div>
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Extracted fields</h3>
          {Object.keys(extracted).length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-fg-soft)', fontSize: '.9rem' }}>No fields extracted from documents.</p>
          ) : (
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '.75rem', rowGap: '.25rem', fontSize: '.85rem' }}>
              {Object.entries(extracted).slice(0, 8).map(([k, v]) => (
                <>
                  <dt key={`k-${k}`} style={{ color: 'var(--color-fg-soft)' }}>{k}</dt>
                  <dd key={`v-${k}`} style={{ margin: 0 }}>{String(v)}</dd>
                </>
              ))}
            </dl>
          )}
        </div>
        <div>
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Document</h3>
          {c.documentBlobName ? (
            <p style={{ margin: 0, fontSize: '.9rem' }}>
              📎 {c.documentBlobName}
              {docUrl && (
                <>
                  {' '}·{' '}
                  <a href={docUrl} target="_blank" rel="noopener noreferrer">open</a>
                </>
              )}
            </p>
          ) : (
            <p style={{ margin: 0, color: 'var(--color-fg-soft)', fontSize: '.9rem' }}>No document attached.</p>
          )}
          {c.storageAccount && <p style={{ margin: '.25rem 0 0', fontSize: '.75rem', color: 'var(--color-fg-soft)' }}>{c.storageAccount}</p>}
        </div>
      </section>

      {c.workflowSteps && c.workflowSteps.length > 0 && (
        <section style={{ marginTop: '1rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Workflow</h3>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '.9rem' }}>
            {c.workflowSteps.map((s) => (
              <li key={s.name} style={{ marginBottom: '.2rem' }}>
                <strong>{s.label}</strong>
                {s.detail ? ` — ${s.detail}` : ''} <em style={{ color: 'var(--color-fg-soft)' }}>({s.status})</em>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Caseworker decision (EU AI Act art. 14 — human oversight)</h3>
        <p style={{ marginTop: 0, fontSize: '.85rem', color: 'var(--color-fg-soft)' }}>
          Approving overrides any AI verdict. The decision is written to <code>udcsp_caseworker_decision</code> in Dataverse and notifies the citizen via Azure Communication Services.
        </p>
        <textarea
          aria-label="Notes to citizen / rationale"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes to citizen / rationale"
          rows={3}
          style={{ width: '100%', padding: '.5rem', border: '1px solid var(--color-border)', borderRadius: '.4rem' }}
        />
        <div style={{ marginTop: '.6rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => onAction('approved', notes)} className="udcsp-btn udcsp-btn--primary">Approve</button>
          <button type="button" onClick={() => onAction('more-info-required', notes)} className="udcsp-btn">Request more info</button>
          <button type="button" onClick={() => onAction('rejected', notes)} className="udcsp-btn">Reject</button>
          <Link to={`/cases/${c.id}`} className="udcsp-btn udcsp-btn--ghost">Open citizen view</Link>
        </div>
      </section>
    </article>
  );
}

export function CaseworkerPage() {
  const intl = useIntl();
  const [cases, setCases] = useState<StoredCase[]>([]);
  const [filter, setFilter] = useState<Filter>({ country: 'all', type: 'all', status: 'open' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setCases(listAllCases());
  }, []);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (filter.country !== 'all' && c.country !== filter.country) return false;
      if (filter.type !== 'all' && c.applicationType !== filter.type) return false;
      if (filter.status === 'open' && !isOpen(c)) return false;
      return true;
    });
  }, [cases, filter]);

  const selected = filtered.find((c) => c.id === selectedId) || filtered[0];

  function handleAction(outcome: string, notes: string) {
    if (!selected) return;
    const newStatus =
      outcome === 'approved' ? 'Approved' : outcome === 'rejected' ? 'Rejected' : 'Awaiting citizen';
    updateCase(selected.id, { status: newStatus, decision: outcome });
    // Append a workflow step for traceability
    const next = [...(selected.workflowSteps || [])];
    next.push({ name: 'caseworker-decision', label: 'Caseworker decision', status: 'done', at: new Date().toISOString(), detail: `${outcome}${notes ? ` — ${notes.slice(0, 80)}` : ''}` });
    updateCase(selected.id, { workflowSteps: next });
    setCases(listAllCases());
  }

  return (
    <div className="udcsp-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '.25rem' }}>
            <FormattedMessage id="caseworker.title" defaultMessage="Caseworker workspace" />
          </h1>
          <p style={{ margin: 0, color: 'var(--color-fg-soft)', maxWidth: '60ch' }}>
            <FormattedMessage
              id="caseworker.subtitle"
              defaultMessage="Cross-country queue for the UDCSP platform — handles residency transfers, child & family benefit and tax certificates. Replaces D365 Customer Service in environments without a CE licence; in production this is a model-driven Power App backed by the udcsp_application Dataverse table."
            />
          </p>
        </div>
        <div style={{ fontSize: '.8rem', color: 'var(--color-fg-soft)', textAlign: 'right' }}>
          <p style={{ margin: 0 }}>{filtered.length} case{filtered.length === 1 ? '' : 's'} match the filters</p>
          <p style={{ margin: 0 }}>{cases.length} total in this browser</p>
        </div>
      </header>

      <section aria-label="Filters" style={{ marginTop: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: '.85rem' }}>
          Country&nbsp;
          <select value={filter.country} onChange={(e) => setFilter({ ...filter, country: e.target.value as Filter['country'] })}>
            <option value="all">All</option>
            <option value="dk">🇩🇰 Denmark</option>
            <option value="se">🇸🇪 Sweden</option>
            <option value="no">🇳🇴 Norway</option>
          </select>
        </label>
        <label style={{ fontSize: '.85rem' }}>
          Type&nbsp;
          <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value as Filter['type'] })}>
            <option value="all">All</option>
            <option value="residency-transfer">Residency transfer</option>
            <option value="child-benefit">Child &amp; family benefit</option>
            <option value="tax-certificate">Tax certificate</option>
          </select>
        </label>
        <label style={{ fontSize: '.85rem' }}>
          Status&nbsp;
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value as Filter['status'] })}>
            <option value="open">Open only</option>
            <option value="all">All</option>
          </select>
        </label>
        <button type="button" className="udcsp-btn udcsp-btn--ghost" onClick={() => setCases(listAllCases())}>
          {intl.formatMessage({ id: 'caseworker.refresh', defaultMessage: 'Refresh' })}
        </button>
      </section>

      {filtered.length === 0 ? (
        <p style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--color-bg-alt)', borderRadius: '.5rem', textAlign: 'center' }}>
          <FormattedMessage
            id="caseworker.empty"
            defaultMessage="No cases match the filters. Submit one from /apply/residency or /apply/child-benefit, then come back here."
          />
        </p>
      ) : (
        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '1.25rem' }}>
          <aside aria-label="Case list" style={{ borderRight: '1px solid var(--color-border)', paddingRight: '.75rem', maxHeight: '70vh', overflowY: 'auto' }}>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filtered.map((c) => {
                const v = decisionBadge(c);
                const active = selected?.id === c.id;
                return (
                  <li key={c.id} style={{ marginBottom: '.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '.6rem .7rem', borderRadius: '.4rem',
                        background: active ? 'var(--color-bg-alt)' : 'transparent',
                        border: active ? '1px solid var(--color-accent)' : '1px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{c.title}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--color-fg-soft)', marginTop: '.15rem' }}>
                        {COUNTRY_FLAG[c.country] || '🌐'} {c.applicationType || 'app'} · {new Date(c.updatedAt).toLocaleDateString()}
                      </div>
                      <div style={{ marginTop: '.3rem', fontSize: '.7rem', color: v.color }}>{v.label}</div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>
          <div>
            {selected ? <CaseDetail c={selected} onAction={handleAction} /> : <p>Select a case.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
