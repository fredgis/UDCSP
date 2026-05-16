import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { FormattedMessage, useIntl } from 'react-intl';
import { apimBaseUrlForCountry, apiScopeForCountry, getCountry } from '../auth/msalConfig';
import { listCases, listAllCases, removeCase, updateCase, upsertCase, type StoredCase } from '../utils/caseStore';
import { parseDescription, extractEligibility, humanTitle, applicationIcon, humanStatus } from '../utils/descriptionParser';
import { Flag } from '../components/Flag';

type Case = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  applicationType?: string;
  country?: string;
  confidence?: number;
  decision?: string;
  progress?: { done: number; total: number; current?: string };
};

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

function hydrateStoredCase(t: IntakeApplication, country: string, citizenUpn?: string): StoredCase {
  const id = t.id || t.activityid || t.applicationId || t.caseId || '';
  const body = parseDescription(t.description) ?? {};
  const applicationType = t.applicationType || (body.applicationType as string | undefined);
  const status = humanStatus(t.status || t.state, t.statecode);
  return {
    id,
    title: humanTitle(applicationType, t.title || t.subject),
    status,
    updatedAt: t.updatedAt || t.submittedAt || t.createdOn || t.createdon || '',
    country: (t.country || (body.country as string) || country || 'dk').toLowerCase(),
    citizenUpn: citizenUpn || (body.citizenUpn as string | undefined),
    applicationType,
    decision: (body as { recommendation?: string; decision?: string }).recommendation
      || (body as { decision?: string }).decision,
    confidence: typeof (body as { confidence?: number }).confidence === 'number'
      ? (body as { confidence?: number }).confidence
      : undefined,
    extractedFields: (body.extractedFields ?? undefined) as Record<string, unknown> | undefined,
    documentBlobUrl: body.documentBlobUrl as string | undefined,
    documentBlobName: (body.documentBlobName as string | undefined) || (body.attachedDocument as string | undefined),
    storageAccount: body.storageAccount as string | undefined,
    eligibility: extractEligibility(body),
  };
}

function toCase(c: StoredCase): Case {
  const steps = c.workflowSteps ?? [];
  const total = steps.length || 7;
  const done = steps.filter((s) => s.status === 'done').length;
  const current = steps.find((s) => s.status === 'in-progress')?.label ?? steps.find((s) => s.status === 'pending')?.label;
  return {
    id: c.id,
    title: c.title,
    status: c.status,
    updatedAt: c.updatedAt,
    applicationType: c.applicationType,
    country: c.country,
    confidence: c.confidence,
    decision: c.decision,
    progress: steps.length ? { done, total, current } : undefined,
  };
}

function normalize(items: IntakeApplication[]): Case[] {
  return items.map((t, i) => ({
    id: t.id || t.applicationId || t.caseId || t.activityid || `app-${i}`,
    title: humanTitle(t.applicationType, t.title || t.subject),
    status: humanStatus(t.status || t.state, t.statecode),
    updatedAt: t.updatedAt || t.submittedAt || t.createdOn || t.createdon || '',
    applicationType: t.applicationType,
    country: t.country,
  }));
}

// Find the rich local entry that corresponds to a remote item.
// The apply page stores under a correlationId (random GUID returned by the LA)
// while the GET-list returns the Dataverse activityid — those never collide.
// We match on (citizenUpn, applicationType, country) and proximity in time.
function findLocalMatch(
  remote: StoredCase,
  pool: StoredCase[],
  alreadyMatched: Set<string>,
): StoredCase | undefined {
  const remoteTs = new Date(remote.updatedAt).getTime();
  let best: { l: StoredCase; delta: number } | undefined;
  for (const l of pool) {
    if (alreadyMatched.has(l.id)) continue;
    if (l.id === remote.id) continue;
    if (l.citizenUpn && remote.citizenUpn && l.citizenUpn !== remote.citizenUpn) continue;
    if (l.country && remote.country && l.country !== remote.country) continue;
    if (l.applicationType && remote.applicationType && l.applicationType !== remote.applicationType) continue;
    const lt = new Date(l.updatedAt).getTime();
    const delta = Math.abs(lt - remoteTs);
    if (Number.isFinite(delta) && delta < 10 * 60_000 && (!best || delta < best.delta)) {
      best = { l, delta };
    }
  }
  return best?.l;
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
    const local: Case[] = listCases(country, upn).map(toCase);
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
      // Build remote StoredCase entries, merge each with a matching rich local
      // entry (apply page wrote one under correlationId — different id but same
      // citizenUpn/applicationType/timestamp) so the detail page recovers
      // workflowSteps, extractedFields, documentBlobUrl, eligibilityPreflight
      // even when the Dataverse description was truncated.
      const localPool = listAllCases();
      const consumed = new Set<string>();
      const merged: StoredCase[] = [];
      for (const it of items) {
        const remoteStored = hydrateStoredCase(it, country, upn);
        if (!remoteStored.id) continue;
        const localMatch = findLocalMatch(remoteStored, localPool, consumed);
        if (localMatch) {
          consumed.add(localMatch.id);
          // Prefer remote authoritative fields, keep local rich data when remote misses
          remoteStored.workflowSteps = remoteStored.workflowSteps && remoteStored.workflowSteps.length > 0
            ? remoteStored.workflowSteps
            : localMatch.workflowSteps;
          remoteStored.extractedFields = (remoteStored.extractedFields && Object.keys(remoteStored.extractedFields).length > 0)
            ? remoteStored.extractedFields
            : localMatch.extractedFields;
          remoteStored.documentBlobUrl = remoteStored.documentBlobUrl || localMatch.documentBlobUrl;
          remoteStored.documentBlobName = remoteStored.documentBlobName || localMatch.documentBlobName;
          remoteStored.storageAccount = remoteStored.storageAccount || localMatch.storageAccount;
          remoteStored.eligibility = remoteStored.eligibility ?? localMatch.eligibility;
          remoteStored.estimatedDecisionDate = remoteStored.estimatedDecisionDate ?? localMatch.estimatedDecisionDate;
          remoteStored.applicationType = remoteStored.applicationType || localMatch.applicationType;
          remoteStored.country = remoteStored.country || localMatch.country;
          remoteStored.citizenUpn = remoteStored.citizenUpn || localMatch.citizenUpn;
          // The legacy correlationId-keyed entry is no longer the canonical row.
          // Drop it so the detail page only resolves /cases/:activityid.
          removeCase(localMatch.id);
        }
        upsertCase(remoteStored);
        merged.push(remoteStored);
      }
      const remote = merged.map(toCase);
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
            const appLabel = humanTitle(c.applicationType, c.title);
            const appIcon = applicationIcon(c.applicationType);
            const hasCountry = !!c.country && ['dk', 'se', 'no'].includes((c.country || '').toLowerCase());
            const statusKind = isCanceled ? 'canceled'
              : /complet|approved|done/i.test(c.status) ? 'completed'
              : /review|await|pending/i.test(c.status) ? 'review'
              : /eligible|approved/i.test(c.status) ? 'eligible'
              : 'submitted';
            const decisionTone = c.decision === 'eligible' || /likely-eligible/.test(c.decision || '') ? 'eligible'
              : c.decision === 'not-eligible' || /likely-ineligible/.test(c.decision || '') ? 'ineligible'
              : /escalate|insufficient|requires-review|not-yet/.test(c.decision || '') ? 'review' : undefined;
            return (
              <li key={c.id} className={`case-row case-row--${statusKind}`}>
                <div className="case-row__accent" aria-hidden="true" />
                <div className="case-row__main">
                  <Link to={`/cases/${c.id}`} className="case-row__title">
                    <span className="case-row__icon" aria-hidden="true">{appIcon}</span>
                    <span className="case-row__title-text">{appLabel}</span>
                    {hasCountry && <span className="case-row__flag"><Flag countryCode={c.country!} ariaLabel={`${(c.country || '').toUpperCase()} flag`} /></span>}
                  </Link>
                  <div className="case-row__id">
                    <code title={c.id}>#{c.id.substring(0, 8)}</code>
                  </div>
                  <div className="case-row__meta">
                    <span className={`pill pill--status-${statusKind}`}>{c.status}</span>
                    {decisionTone && (
                      <span className={`pill pill--decision-${decisionTone}`}>{c.decision}</span>
                    )}
                    {typeof c.confidence === 'number' && (
                      <span className={`pill pill--confidence-${c.confidence >= 0.75 ? 'high' : c.confidence >= 0.45 ? 'mid' : 'low'}`}>
                        AI {(c.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    <time>{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : ''}</time>
                  </div>
                  {c.progress && (
                    <div className="case-row__progress" aria-label={`Step ${c.progress.done} of ${c.progress.total} completed`}>
                      <div className="case-row__progress-bar">
                        <div className={`case-row__progress-fill case-row__progress-fill--${statusKind}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="case-row__progress-label">
                        Step {c.progress.done}/{c.progress.total} completed
                        {c.progress.current && !isCanceled ? <> · next: <em>{c.progress.current}</em></> : null}
                      </span>
                    </div>
                  )}
                </div>
                <div className="case-row__actions">
                  <Link to={`/cases/${c.id}`} className="button-primary case-actions__btn">
                    <FormattedMessage id="cases.openLabel" defaultMessage="Open" />
                  </Link>
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

