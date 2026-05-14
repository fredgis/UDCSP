import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { apimBaseUrlForCountry, apiScopeForCountry, getCountry } from '../auth/msalConfig';
import { getCase, listAllCases, removeCase, updateCase, upsertCase, type StoredCase } from '../utils/caseStore';
import { parseDescription, extractEligibility, humanTitle, applicationIcon, countryFlag, humanStatus } from '../utils/descriptionParser';

type StepStatus = 'done' | 'in-progress' | 'pending' | 'skipped';
type Step = { name: string; label: string; status: StepStatus; at?: string; detail?: string };

type RemoteCase = {
  id?: string;
  activityid?: string;
  caseId?: string;
  title?: string;
  subject?: string;
  description?: string;
  status?: string;
  statecode?: number;
  createdOn?: string;
  updatedAt?: string;
  country?: string;
  applicationType?: string;
};

function remoteToStored(t: RemoteCase, country: string, citizenUpn?: string): StoredCase {
  const id = t.id || t.activityid || t.caseId || '';
  const body = parseDescription(t.description) ?? {};
  const applicationType = t.applicationType || (body.applicationType as string | undefined);
  return {
    id,
    title: humanTitle(applicationType, t.title || t.subject),
    status: humanStatus(t.status, t.statecode),
    updatedAt: t.updatedAt || t.createdOn || '',
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

// Default workflow rendering when a case predates the workflowSteps schema:
// mirrors the 5 actions of the Logic App `udcsp-{country}-dev-application-intake`
// (Classifier → Eligibility → Document Extractor → Create_D365_case → Lineage)
// plus intake at the top and human review at the bottom.
function defaultSteps(c: StoredCase): Step[] {
  const isCanceled = /cancel/i.test(c.status);
  const finalReview: StepStatus = isCanceled ? 'skipped' : 'in-progress';
  const hasExtraction = !!(
    c.documentBlobName ||
    c.documentBlobUrl ||
    (c.extractedFields && Object.keys(c.extractedFields).length > 0)
  );
  const docFilename = c.documentBlobName
    ?? (c.documentBlobUrl ? decodeURIComponent(c.documentBlobUrl.split('/').pop() || '') : undefined);
  const extractorDetail = hasExtraction
    ? (docFilename
        ? (c.extractedFields && Object.keys(c.extractedFields).length > 0
            ? `${docFilename} · ${Object.keys(c.extractedFields).length} fields extracted`
            : docFilename)
        : (c.extractedFields ? `${Object.keys(c.extractedFields).length} fields extracted` : 'document processed'))
    : 'no document attached';
  const eligDetail = c.eligibility?.recommendation
    ? `${c.eligibility.recommendation}${typeof c.eligibility.confidence === 'number' ? ` · ${(c.eligibility.confidence*100).toFixed(0)}% confidence` : ''}`
    : (c.decision || (typeof c.confidence === 'number' ? `${(c.confidence*100).toFixed(0)}% confidence` : '—'));
  return [
    { name: 'intake', label: 'Application received via APIM', status: 'done', at: c.updatedAt },
    { name: 'classifier', label: 'Foundry Classifier agent', status: 'done', detail: humanTitle(c.applicationType, c.title) },
    { name: 'extractor', label: 'Document Extractor agent', status: hasExtraction ? 'done' : 'skipped', detail: extractorDetail },
    { name: 'eligibility', label: 'Eligibility Pre-Assessor', status: 'done', detail: eligDetail },
    { name: 'd365', label: 'D365 case created', status: 'done', detail: `task ${c.id.substring(0, 8)}…` },
    { name: 'lineage', label: 'Lineage published (Purview)', status: 'done' },
    { name: 'review', label: 'Caseworker review', status: finalReview, detail: c.estimatedDecisionDate ? `ETA ${c.estimatedDecisionDate}` : undefined },
  ];
}

const STATUS_COLORS: Record<StepStatus, { fill: string; stroke: string; label: string }> = {
  done: { fill: '#1f6f43', stroke: '#1f6f43', label: '✓ done' },
  'in-progress': { fill: '#b97200', stroke: '#b97200', label: '⟳ in progress' },
  pending: { fill: '#7a7a7a', stroke: '#7a7a7a', label: '· pending' },
  skipped: { fill: '#bdbdbd', stroke: '#bdbdbd', label: '— skipped' },
};

function WorkflowDiagram({ steps }: { steps: Step[] }) {
  const w = 760;
  const rowH = 76;
  const h = steps.length * rowH + 24;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Logic App workflow timeline" style={{ width: '100%', maxWidth: 760, height: 'auto' }}>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#1a3a5c" />
        </marker>
      </defs>
      {steps.map((s, i) => {
        const cy = 24 + i * rowH;
        const c = STATUS_COLORS[s.status];
        return (
          <g key={s.name}>
            {i > 0 && (
              <line
                x1={48} y1={cy - rowH + 24} x2={48} y2={cy - 16}
                stroke="#1a3a5c" strokeWidth="2" strokeDasharray={s.status === 'pending' ? '4 4' : undefined}
                markerEnd="url(#arr)"
              />
            )}
            <circle cx={48} cy={cy + 6} r={16} fill={c.fill} stroke={c.stroke} strokeWidth="2" />
            <text x={48} y={cy + 11} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">{i + 1}</text>
            <rect x={84} y={cy - 14} width={w - 100} height={48} rx={8} fill="#f4f7fb" stroke="#cbd6e2" />
            <text x={100} y={cy + 6} fontSize="14" fontWeight="600" fill="#1a3a5c">{s.label}</text>
            <text x={100} y={cy + 24} fontSize="12" fill="#46606d">
              {c.label}{s.detail ? ` · ${s.detail}` : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function fmt(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function CaseDetailPage() {
  const intl = useIntl();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuth = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [c, setC] = useState<StoredCase | undefined>(() => (id ? getCase(id) : undefined));
  const [hydrating, setHydrating] = useState(false);

  useEffect(() => {
    if (id) setC(getCase(id));
  }, [id]);

  // If localStorage doesn't have the case (cross-device, hard refresh on a deep
  // link, etc.), or the local entry is slim (missing workflowSteps), fetch the
  // list from APIM, merge with rich legacy local entries, and re-read.
  useEffect(() => {
    if (!id || !isAuth || hydrating) return;
    const hasRich = c && c.workflowSteps && c.workflowSteps.length > 0 && c.eligibility;
    if (hasRich) return;
    let cancelled = false;
    (async () => {
      setHydrating(true);
      try {
        const country = getCountry();
        const apim = apimBaseUrlForCountry(country);
        if (!apim || !accounts[0]) return;
        const tok = await instance.acquireTokenSilent({
          account: accounts[0],
          scopes: [apiScopeForCountry(country)],
        });
        const res = await fetch(`${apim}/citizen-applications/`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${tok.accessToken}` },
        });
        if (!res.ok) return;
        const payload = (await res.json()) as { value?: RemoteCase[] } | RemoteCase[];
        const items = Array.isArray(payload) ? payload : payload.value ?? [];
        const localPool = listAllCases();
        const consumed = new Set<string>();
        for (const it of items) {
          const remoteStored = remoteToStored(it, country, accounts[0]?.username);
          if (!remoteStored.id) continue;
          // Match with a rich legacy local entry on (upn, applicationType, ~time)
          const remoteTs = new Date(remoteStored.updatedAt).getTime();
          let best: { l: StoredCase; delta: number } | undefined;
          for (const l of localPool) {
            if (consumed.has(l.id) || l.id === remoteStored.id) continue;
            if (l.citizenUpn && remoteStored.citizenUpn && l.citizenUpn !== remoteStored.citizenUpn) continue;
            if (l.applicationType && remoteStored.applicationType && l.applicationType !== remoteStored.applicationType) continue;
            const lt = new Date(l.updatedAt).getTime();
            const delta = Math.abs(lt - remoteTs);
            if (Number.isFinite(delta) && delta < 10 * 60_000 && (!best || delta < best.delta)) {
              best = { l, delta };
            }
          }
          if (best) {
            consumed.add(best.l.id);
            remoteStored.workflowSteps = remoteStored.workflowSteps && remoteStored.workflowSteps.length > 0
              ? remoteStored.workflowSteps
              : best.l.workflowSteps;
            remoteStored.extractedFields = (remoteStored.extractedFields && Object.keys(remoteStored.extractedFields).length > 0)
              ? remoteStored.extractedFields
              : best.l.extractedFields;
            remoteStored.documentBlobUrl = remoteStored.documentBlobUrl || best.l.documentBlobUrl;
            remoteStored.documentBlobName = remoteStored.documentBlobName || best.l.documentBlobName;
            remoteStored.storageAccount = remoteStored.storageAccount || best.l.storageAccount;
            remoteStored.eligibility = remoteStored.eligibility ?? best.l.eligibility;
            remoteStored.estimatedDecisionDate = remoteStored.estimatedDecisionDate ?? best.l.estimatedDecisionDate;
            removeCase(best.l.id);
          }
          upsertCase(remoteStored);
        }
        if (!cancelled) setC(getCase(id));
      } catch {
        // fall through to 'not found' UI
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, c, isAuth, hydrating, accounts, instance]);

  const steps = useMemo(() => (c ? (c.workflowSteps && c.workflowSteps.length ? c.workflowSteps : defaultSteps(c)) : []), [c]);

  if (!c) {
    return (
      <article className="apply-page">
        <h1>
          {hydrating ? (
            <FormattedMessage id="caseDetail.loading" defaultMessage="Loading case…" />
          ) : (
            <FormattedMessage id="caseDetail.notFound" defaultMessage="Case not found" />
          )}
        </h1>
        <p><Link to="/cases" className="button-secondary"><FormattedMessage id="caseDetail.back" defaultMessage="← Back to My cases" /></Link></p>
      </article>
    );
  }

  const isCanceled = /cancel/i.test(c.status);
  const appLabel = humanTitle(c.applicationType, c.title);
  const appIcon = applicationIcon(c.applicationType);
  const flag = countryFlag(c.country);
  const statusKind = isCanceled ? 'canceled'
    : /complet|approved|done/i.test(c.status) ? 'completed'
    : /review|await|pending|progress/i.test(c.status) ? 'review'
    : 'submitted';
  const decisionTone = c.decision === 'eligible' || /likely-eligible/.test(c.decision || '') ? 'eligible'
    : c.decision === 'not-eligible' || /likely-ineligible/.test(c.decision || '') ? 'ineligible'
    : /escalate|insufficient|requires-review|not-yet/.test(c.decision || '') ? 'review' : undefined;
  const confidenceKind = typeof c.confidence === 'number'
    ? (c.confidence >= 0.75 ? 'high' : c.confidence >= 0.45 ? 'mid' : 'low')
    : undefined;
  const docFilename = c.documentBlobName
    ?? (c.documentBlobUrl ? decodeURIComponent(c.documentBlobUrl.split('/').pop() || '') : undefined);

  return (
    <article className={`case-detail case-detail--${statusKind}`}>
      <p className="case-detail__back"><Link to="/cases"><FormattedMessage id="caseDetail.back" defaultMessage="← Back to My cases" /></Link></p>

      <header className={`case-detail__hero case-detail__hero--${statusKind}`}>
        <div className="case-detail__hero-accent" aria-hidden="true" />
        <div className="case-detail__hero-main">
          <div className="case-detail__hero-title">
            <span className="case-detail__hero-icon" aria-hidden="true">{appIcon}</span>
            <div>
              <h1>{appLabel}</h1>
              <p className="case-detail__hero-sub">
                {flag && <span aria-label={c.country.toUpperCase()}>{flag}</span>}
                {' '}<strong>{c.country.toUpperCase()}</strong> · case <code>#{c.id.substring(0, 8)}</code>
                {c.updatedAt && <> · updated {new Date(c.updatedAt).toLocaleString()}</>}
              </p>
            </div>
          </div>
          <div className="case-detail__pills">
            <span className={`pill pill--status-${statusKind}`}>{c.status}</span>
            {decisionTone && (
              <span className={`pill pill--decision-${decisionTone}`}>Decision: {c.decision}</span>
            )}
            {confidenceKind && typeof c.confidence === 'number' && (
              <span className={`pill pill--confidence-${confidenceKind}`}>AI confidence {(c.confidence * 100).toFixed(0)}%</span>
            )}
            {c.estimatedDecisionDate && (
              <span className="pill pill--eta">ETA {c.estimatedDecisionDate}</span>
            )}
          </div>
        </div>
        <div className="case-detail__hero-actions">
          <button
            type="button"
            className="button-secondary case-actions__btn"
            disabled={isCanceled}
            onClick={() => {
              if (isCanceled) return;
              if (!confirm(intl.formatMessage({ id: 'cases.cancelConfirm', defaultMessage: 'Cancel this application? You can re-apply later.' }))) return;
              updateCase(c.id, { status: 'Canceled by citizen' });
              setC(getCase(c.id));
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
              navigate('/cases');
            }}
          >
            <FormattedMessage id="cases.deleteLabel" defaultMessage="Remove" />
          </button>
        </div>
      </header>

      <div className="case-detail__layout">
        <main className="case-detail__main">
          <section aria-labelledby="wf-title" className="case-section">
            <h2 id="wf-title"><FormattedMessage id="caseDetail.timeline" defaultMessage="Workflow timeline" /></h2>
            <p className="case-detail__hint">
              Live view of the country intake Logic App
              {' '}<code>udcsp-{c.country}-dev-application-intake</code>{' '}
              orchestrating Foundry agents, D365 case creation and Purview lineage publication.
            </p>
            <WorkflowDiagram steps={steps} />
          </section>

          {c.eligibility && (
            <section aria-labelledby="elig-title" className="case-section">
              <h2 id="elig-title"><FormattedMessage id="caseDetail.eligibility" defaultMessage="Eligibility pre-assessment" /></h2>
              <p className="case-detail__hint">
                Snapshot of the Foundry <code>udcsp-eligibility</code> agent verdict at the moment of submission.
                The Logic App re-runs the same agent server-side for the AI Act art. 14 audit registry.
              </p>
              <div className="case-detail__pills">
                {c.eligibility.recommendation && (
                  <span className={`pill pill--decision-${decisionTone ?? 'review'}`}>
                    Recommendation: <strong>{c.eligibility.recommendation}</strong>
                  </span>
                )}
                {typeof c.eligibility.confidence === 'number' && (
                  <span className={`pill pill--confidence-${c.eligibility.confidence >= 0.75 ? 'high' : c.eligibility.confidence >= 0.45 ? 'mid' : 'low'}`}>
                    Confidence {(c.eligibility.confidence * 100).toFixed(0)}%
                  </span>
                )}
                {c.eligibility.humanReviewRequired !== undefined && (
                  <span className={`pill ${c.eligibility.humanReviewRequired ? 'pill--review' : 'pill--auto'}`}>
                    {c.eligibility.humanReviewRequired ? '👤 Human review required' : '🤖 Auto-decidable'}
                  </span>
                )}
              </div>
              {c.eligibility.citizenNotice && (
                <p className="case-detail__notice"><strong>For you:</strong> {c.eligibility.citizenNotice}</p>
              )}
              {c.eligibility.caseworkerSummary && (
                <details className="case-detail__details" open>
                  <summary><strong>Caseworker summary</strong></summary>
                  <p>{c.eligibility.caseworkerSummary}</p>
                </details>
              )}
              {c.eligibility.missingEvidence && c.eligibility.missingEvidence.length > 0 && (
                <details className="case-detail__details" open>
                  <summary><strong>Missing evidence ({c.eligibility.missingEvidence.length})</strong></summary>
                  <ul>
                    {c.eligibility.missingEvidence.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </details>
              )}
              {c.eligibility.ruleResults && c.eligibility.ruleResults.length > 0 && (
                <details className="case-detail__details" open>
                  <summary><strong>Rule-by-rule evidence ({c.eligibility.ruleResults.length})</strong></summary>
                  <ul className="case-detail__rules">
                    {c.eligibility.ruleResults.map((r, i) => (
                      <li key={i}>
                        <span className={r.passed ? 'pill pill--done' : 'pill pill--fail'}>{r.passed ? '✓ pass' : '✗ fail'}</span>
                        {' '}<code>{r.rule}</code>
                        {r.details && <div className="case-detail__rule-details">{r.details}</div>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {c.eligibility.lineage && (c.eligibility.lineage.ruleVersion || c.eligibility.lineage.promptVersion) && (
                <p className="case-detail__hint">
                  Lineage:
                  {c.eligibility.lineage.ruleVersion && <> rule <code>{c.eligibility.lineage.ruleVersion}</code></>}
                  {c.eligibility.lineage.promptVersion && <> · prompt <code>{c.eligibility.lineage.promptVersion}</code></>}
                  {c.eligibility.lineage.datasetVersion && <> · dataset <code>{c.eligibility.lineage.datasetVersion}</code></>}
                </p>
              )}
            </section>
          )}
        </main>

        <aside className="case-detail__aside">
          {(c.documentBlobUrl || docFilename) && (
            <section aria-labelledby="doc-title" className="case-section">
              <h2 id="doc-title">
                <span aria-hidden="true">📄</span>{' '}
                <FormattedMessage id="caseDetail.attachedDoc" defaultMessage="Attached document" />
              </h2>
              <dl className="case-detail__dl">
                <dt>File</dt>
                <dd>{docFilename ?? '—'}</dd>
                <dt>Storage</dt>
                <dd><code>{c.storageAccount ?? `udcsp${c.country}prodlake`}</code></dd>
                <dt>Container</dt><dd><code>citizen-uploads</code></dd>
                <dt>Region</dt><dd>{c.country.toUpperCase()} (data residency)</dd>
              </dl>
              <p className="case-detail__hint">Caseworkers retrieve it via APIM with managed-identity Storage Blob Data Reader on the country lake.</p>
            </section>
          )}

          {c.extractedFields && Object.keys(c.extractedFields).length > 0 && (
            <section aria-labelledby="ex-title" className="case-section">
              <h2 id="ex-title">
                <span aria-hidden="true">🔎</span>{' '}
                <FormattedMessage id="caseDetail.extracted" defaultMessage="Extracted fields" />
                <span className="case-section__count">{Object.keys(c.extractedFields).length}</span>
              </h2>
              <table className="case-fields-table">
                <thead><tr><th>Field</th><th>Value</th></tr></thead>
                <tbody>
                  {Object.entries(c.extractedFields).map(([k, v]) => (
                    <tr key={k}><th scope="row">{k}</th><td>{fmt(v)}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
