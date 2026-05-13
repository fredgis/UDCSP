import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';

type Case = { id: string; title: string; status: string; updatedAt: string };

export function MyCasesPage() {
  const isAuth = useIsAuthenticated();
  const { accounts } = useMsal();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuth) return;
    let cancelled = false;
    (async () => {
      try {
        const apim = (import.meta.env.VITE_APIM_BASE_URL as string) || '';
        if (!apim) { setCases([]); return; }
        const res = await fetch(`${apim}/cases?upn=${encodeURIComponent(accounts[0]?.username || '')}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Case[];
        if (!cancelled) setCases(data);
      } catch (e) {
        if (!cancelled) {
          setCases([]);
          setError('No live case backend reachable yet — your applications will show here once D365 + APIM are wired.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isAuth, accounts]);

  if (cases === null) return <section><h1>My cases</h1><p>Loading…</p></section>;

  return (
    <section aria-labelledby="cases-title">
      <h1 id="cases-title">My cases</h1>
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
