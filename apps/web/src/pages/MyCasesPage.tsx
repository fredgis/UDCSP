import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { FormattedMessage, useIntl } from 'react-intl';
import { apimBaseUrlForCountry, apiScopeForCountry, getCountry } from '../auth/msalConfig';
import { appendCase, listCases, removeCase, updateCase, type StoredCase } from '../utils/caseStore';

type Case = { id: string; title: string; status: string; updatedAt: string; progress?: { done: number; total: number; current?: string } };

type IntakeApplication = {
  id?: string;
  applicationId?: string;
  caseId?: string;
  activityid?: string;
  applicationType?: string;
  subject?: string;
  title?: string;
  description?: string;
  status?: string;
  state?: string;
  statecode?: number;
  country?: string;
  createdOn?: string;
  createdon?: string;
  submittedAt?: string;
  updatedAt?: string;
};

const STATE_LABEL: Record<number, string> = { 0: 'Open', 1: 'Completed', 2: 'Canceled' };

function parseDescription(desc?: string): Record<string, unknown> | null {
  if (!desc) return null;
  // APIM op-policy strips the `citizenUpn: … | text:` prefix already, but if a
  // pre-prefix version leaks through (older rows / direct DV writes), strip it
  // defensively here too.
  let body = desc.trim();
  const idx = body.indexOf('| text:');
  if (idx >= 0) body = body.substring(idx + '| text:'.length).trim();
  try {
    const parsed = JSON.parse(body);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function hydrateStoredCase(t: IntakeApplication, country: string, citizenUpn?: string): StoredCase {
  const id = t.id || t.activityid || t.applicationId || t.caseId || '';
  const body = parseDescription(t.description) ?? {};
  const elig = (body.eligibilityPreflight ?? {}) as { recommendation?: string; confidence?: number };
  const status =
    t.status ||
    t.state ||
    (typeof t.statecode === 'number' ? STATE_LABEL[t.statecode] ?? `state ${t.statecode}` : 'Submitted');
  return {
    id,
    title: t.title || t.subject || t.applicationType || 'Application',
    status,
    updatedAt: t.updatedAt || t.submittedAt || t.createdOn || t.createdon || '',
    country: (t.country || (body.country as string) || country || 'dk').toLowerCase(),
    citizenUpn: citizenUpn || (body.citizenUpn as string | undefined),
    applicationType: t.applicationType || (body.applicationType as string | undefined),
    decision: elig.recommendation,
    confidence: typeof elig.confidence === 'number' ? elig.confidence : undefined,
    extractedFields: (body.extractedFields ?? undefined) as Record<string, unknown> | undefined,
    documentBlobUrl: body.documentBlobUrl as string | undefined,
    documentBlobName: body.documentBlobName as string | undefined,
    storageAccount: body.storageAccount as string | undefined,
  };
}

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
      // Hydrate localStorage with the remote items so CaseDetailPage (which
      // reads from caseStore by activityid) can render the full workflow,
      // extracted fields, document attachment, etc. on cross-device loads.
      for (const it of items) {
        const sc = hydrateStoredCase(it, country, upn);
        if (sc.id) appendCase(sc);
      }
      // Once the back-end has returned anything, it's authoritative — drop locals
      // entirely to avoid duplicate rows (local id = correlationId, remote id = activityid;
      // they never match, so dedupe by id keeps both). Locals are only shown when the
      // back-end is unreachable (catch branch below).
      setCases(remote);
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
                    onClick={async () => {
                      if (!confirm(intl.formatMessage({ id: 'cases.deleteConfirm', defaultMessage: 'Permanently remove this case? This deletes the back-end record and cannot be undone.' }))) return;
                      const country = getCountry();
                      const apim = apimBaseUrlForCountry(country);
                      let bearer = '';
                      if (apim && accounts[0]) {
                        try {
                          const tok = await instance.acquireTokenSilent({
                            account: accounts[0],
                            scopes: [apiScopeForCountry(country)],
                          });
                          bearer = tok.accessToken;
                        } catch { /* fall through */ }
                      }
                      let serverOk = !apim;
                      if (apim) {
                        try {
                          const res = await fetch(`${apim}/citizen-applications/${encodeURIComponent(c.id)}`, {
                            method: 'DELETE',
                            headers: bearer ? { Authorization: `Bearer ${bearer}`, 'Cache-Control': 'no-cache' } : { 'Cache-Control': 'no-cache' },
                          });
                          if (res.status === 204 || res.status === 200 || res.status === 404) {
                            serverOk = true;
                          } else {
                            const txt = await res.text().catch(() => '');
                            alert(`Server refused to delete (HTTP ${res.status}). The case is NOT removed.\n\n${txt.substring(0, 300)}`);
                          }
                        } catch (e) {
                          alert('Server unreachable — case NOT removed. Try again later.');
                        }
                      }
                      if (serverOk) {
                        removeCase(c.id);
                        void load();
                      }
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

