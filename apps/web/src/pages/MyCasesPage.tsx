import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { FormattedMessage, useIntl } from 'react-intl';
import { apimBaseUrlForCountry, apiScopeForCountry, getCountry } from '../auth/msalConfig';
import { listCases, removeCase, updateCase } from '../utils/caseStore';

type Case = { id: string; title: string; status: string; updatedAt: string; progress?: { done: number; total: number; current?: string } };

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
  const intl = useIntl();
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
    const local: Case[] = listCases(country, upn).map((c) => {
      const steps = c.workflowSteps ?? [];
      const total = steps.length || 7;
      const done = steps.filter((s) => s.status === 'done').length;
      const current = steps.find((s) => s.status === 'in-progress')?.label ?? steps.find((s) => s.status === 'pending')?.label;
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        updatedAt: c.updatedAt,
        progress: steps.length ? { done, total, current } : undefined,
      };
    });
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
      // server unreachable or no GET listing yet — show local cache silently
      setCases(local);
      if (local.length === 0) {
        setError(
          e instanceof Error && e.message.startsWith('HTTP ')
            ? `Backend returned ${e.message}. Submit an application to populate this list.`
            : 'No applications yet. Submit one via /apply.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [accounts, instance, isAuth]);

  useEffect(() => {
    void load();
  }, [load]);

  if (cases === null) return <section><h1><FormattedMessage id="cases.title" defaultMessage="My cases" /></h1><p>…</p></section>;

  return (
    <section aria-labelledby="cases-title">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 id="cases-title" style={{ marginBottom: 0 }}><FormattedMessage id="cases.title" defaultMessage="My cases" /></h1>
        <button
          type="button"
          className="button-secondary"
          onClick={() => void load()}
          disabled={loading}
          aria-label={intl.formatMessage({ id: 'cases.refresh', defaultMessage: '⟳ Refresh' })}
        >
          {loading ? <FormattedMessage id="cases.refreshing" defaultMessage="⟳ Refreshing…" /> : <FormattedMessage id="cases.refresh" defaultMessage="⟳ Refresh" />}
        </button>
      </div>
      <p style={{ color: 'var(--color-fg-soft)' }}>
        Every application you submit appears here with its real-time status, secure messages from your caseworker, and the audit trail of AI suggestions vs human decisions.
      </p>
      {error && <p role="status" className="info-banner">{error}</p>}
      {cases.length === 0 ? (
        <div className="empty-state">
          <h2><FormattedMessage id="cases.empty" defaultMessage="You don’t have any cases yet. Start an application from the homepage." /></h2>
          <p>
            <Link to="/apply/residency" className="button-primary"><FormattedMessage id="apply.residency.title" defaultMessage="Residency transfer" /></Link>{' '}
            <Link to="/apply/child-benefit" className="button-secondary"><FormattedMessage id="apply.childBenefit.title" defaultMessage="Child & family benefit" /></Link>
          </p>
        </div>
      ) : (
        <ul className="case-list">
          {cases.map((c) => {
            const isCanceled = /cancel/i.test(c.status);
            const pct = c.progress ? Math.round((c.progress.done / c.progress.total) * 100) : null;
            return (
              <li key={c.id} className="case-row">
                <div className="case-row__main">
                  <Link to={`/cases/${c.id}`} className="case-row__title">
                    <strong>{c.id}</strong> · {c.title}
                  </Link>
                  <div className="case-row__meta">
                    <span className={`pill pill--${c.status.toLowerCase().replace(/\s+/g, '-')}`}>{c.status}</span>
                    <time>{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : ''}</time>
                  </div>
                  {c.progress && (
                    <div className="case-row__progress" aria-label={`Step ${c.progress.done} of ${c.progress.total} completed`}>
                      <div className="case-row__progress-bar"><div className="case-row__progress-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="case-row__progress-label">
                        Step {c.progress.done}/{c.progress.total} completed
                        {c.progress.current && !isCanceled ? <> · next: <em>{c.progress.current}</em></> : null}
                      </span>
                    </div>
                  )}
                </div>
                <div className="case-row__actions">
                  <button
                    type="button"
                    className="button-secondary case-actions__btn"
                    disabled={isCanceled}
                    onClick={() => {
                      if (isCanceled) return;
                      if (!confirm(intl.formatMessage({ id: 'cases.cancelConfirm', defaultMessage: 'Cancel this application? You can re-apply later.' }))) return;
                      updateCase(c.id, { status: 'Canceled by citizen' });
                      void load();
                    }}
                  >
                    <FormattedMessage id="cases.cancelLabel" defaultMessage="Cancel" />
                  </button>
                  <button
                    type="button"
                    className="button-danger case-actions__btn"
                    onClick={() => {
                      if (!confirm(intl.formatMessage({ id: 'cases.deleteConfirm', defaultMessage: 'Remove this case from local cache only? It stays in the back-end record.' }))) return;
                      removeCase(c.id);
                      void load();
                    }}
                  >
                    <FormattedMessage id="cases.deleteLabel" defaultMessage="Remove" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

