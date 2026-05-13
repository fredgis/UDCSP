import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { apimBaseUrlForCountry, apiScopeForCountry, getCountry } from '../auth/msalConfig';
import { listCases } from '../utils/caseStore';

type Case = { id: string; title: string; status: string; updatedAt: string };

type IntakeApplication = {
  id?: string;
  applicationId?: string;
  caseId?: string;
  activityid?: string;
  applicationType?: string;
  subject?: string;
  title?: string;
  status?: string;
  state?: string;
  statecode?: number;
  createdOn?: string;
  createdon?: string;
  submittedAt?: string;
  updatedAt?: string;
};

const STATE_LABEL: Record<number, string> = { 0: 'Open', 1: 'Completed', 2: 'Canceled' };

function normalize(items: IntakeApplication[]): Case[] {
  return items.map((t, i) => ({
    id: t.id || t.applicationId || t.caseId || t.activityid || `app-${i}`,
    title: t.title || t.subject || t.applicationType || 'Application',
    status:
      t.status ||
      t.state ||
      (typeof t.statecode === 'number' ? STATE_LABEL[t.statecode] ?? `state ${t.statecode}` : 'Submitted'),
    updatedAt: t.updatedAt || t.submittedAt || t.createdOn || t.createdon || '',
  }));
}

export function MyCasesPage() {
  const isAuth = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isAuth) return;
    setLoading(true);
    setError(null);
    const country = getCountry();
    const upn = accounts[0]?.username;
    const local: Case[] = listCases(country, upn).map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      updatedAt: c.updatedAt,
    }));
    try {
      const apim = apimBaseUrlForCountry(country);
      if (!apim) {
        setCases(local);
        return;
      }
      let bearer = '';
      if (accounts[0]) {
        try {
          const tok = await instance.acquireTokenSilent({
            account: accounts[0],
            scopes: [apiScopeForCountry(country)],
          });
          bearer = tok.accessToken;
        } catch {
          // continue without bearer; APIM will likely 401 and we surface a banner
        }
      }
      const res = await fetch(`${apim}/citizen-applications/`, {
        method: 'GET',
        headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as { value?: IntakeApplication[] } | IntakeApplication[];
      const items = Array.isArray(payload) ? payload : payload.value ?? [];
      const remote = normalize(items);
      // dedupe by id, prefer remote (more authoritative)
      const seen = new Set<string>();
      const merged: Case[] = [];
      for (const r of [...remote, ...local]) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        merged.push(r);
      }
      setCases(merged);
    } catch (e) {
      // server unreachable or no GET listing yet — show local cache
      setCases(local);
      if (local.length === 0) {
        setError(
          e instanceof Error && e.message.startsWith('HTTP ')
            ? `Backend returned ${e.message}. Submit an application to populate this list.`
            : 'No applications yet. Submit one via /apply.',
        );
      } else {
        setError(
          'Showing your locally cached submissions. The intake API received your application — the listing endpoint isn\'t exposed yet, so we\'re reading from local cache until it ships.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [accounts, instance, isAuth]);

  useEffect(() => {
    void load();
  }, [load]);

  if (cases === null) return <section><h1>My cases</h1><p>Loading…</p></section>;

  return (
    <section aria-labelledby="cases-title">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 id="cases-title" style={{ marginBottom: 0 }}>My cases</h1>
        <button
          type="button"
          className="button-secondary"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh case list"
        >
          {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
        </button>
      </div>
      <p style={{ color: 'var(--color-fg-soft)' }}>
        Every application you submit appears here with its real-time status, secure messages from your caseworker, and the audit trail of AI suggestions vs human decisions.
      </p>
      {error && <p role="status" className="info-banner">{error}</p>}
      {cases.length === 0 ? (
        <div className="empty-state">
          <h2>No applications yet</h2>
          <p>Start a new application — it will appear here as soon as a case number is issued.</p>
          <p>
            <Link to="/apply/residency" className="button-primary">Start residency transfer</Link>{' '}
            <Link to="/apply/child-benefit" className="button-secondary">Apply for child benefit</Link>
          </p>
        </div>
      ) : (
        <ul className="case-list">
          {cases.map((c) => (
            <li key={c.id}>
              <Link to={`/cases/${c.id}`}><strong>{c.id}</strong> · {c.title}</Link>
              <span className={`pill pill--${c.status.toLowerCase().replace(/\s+/g, '-')}`}>{c.status}</span>
              <time>{c.updatedAt}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

