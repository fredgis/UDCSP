import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { apimBaseUrlForCountry, apiScopeForCountry, getCountry } from '../auth/msalConfig';
import { appendCase, getCase, removeCase, updateCase, type StoredCase } from '../utils/caseStore';

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

const STATE_LABEL_DETAIL: Record<number, string> = { 0: 'Open', 1: 'Completed', 2: 'Canceled' };

function parseDescription(desc?: string): Record<string, unknown> | null {
  if (!desc) return null;
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

function remoteToStored(t: RemoteCase, country: string, citizenUpn?: string): StoredCase {
  const id = t.id || t.activityid || t.caseId || '';
  const body = parseDescription(t.description) ?? {};
  const elig = (body.eligibilityPreflight ?? {}) as {
    recommendation?: string;
    confidence?: number;
    ruleResults?: Array<{ rule: string; passed: boolean; evidenceIds?: string[]; details?: string }>;
    missingEvidence?: string[];
    humanReviewRequired?: boolean;
    citizenNotice?: string;
    caseworkerSummary?: string;
    lineage?: { ruleVersion?: string; promptVersion?: string; datasetVersion?: string };
  };
  return {
    id,
    title: t.title || t.subject || t.applicationType || 'Application',
    status:
      t.status ||
      (typeof t.statecode === 'number' ? STATE_LABEL_DETAIL[t.statecode] ?? `state ${t.statecode}` : 'Submitted'),
    updatedAt: t.updatedAt || t.createdOn || '',
    country: (t.country || (body.country as string) || country || 'dk').toLowerCase(),
    citizenUpn: citizenUpn || (body.citizenUpn as string | undefined),
    applicationType: t.applicationType || (body.applicationType as string | undefined),
    decision: elig.recommendation,
    confidence: typeof elig.confidence === 'number' ? elig.confidence : undefined,
    extractedFields: (body.extractedFields ?? undefined) as Record<string, unknown> | undefined,
    documentBlobUrl: body.documentBlobUrl as string | undefined,
    documentBlobName: body.documentBlobName as string | undefined,
    storageAccount: body.storageAccount as string | undefined,
    eligibility: elig.recommendation || typeof elig.confidence === 'number' || (elig.ruleResults?.length ?? 0) > 0 ? {
      recommendation: elig.recommendation,
      confidence: typeof elig.confidence === 'number' ? elig.confidence : undefined,
      ruleResults: elig.ruleResults,
      missingEvidence: elig.missingEvidence,
      humanReviewRequired: elig.humanReviewRequired,
      citizenNotice: elig.citizenNotice,
      caseworkerSummary: elig.caseworkerSummary,
      lineage: elig.lineage,
    } : undefined,
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
  const extractorDetail = c.documentBlobName
    ?? (c.documentBlobUrl ? c.documentBlobUrl.split('/').pop() : undefined)
    ?? (c.extractedFields && Object.keys(c.extractedFields).length > 0
        ? `${Object.keys(c.extractedFields).length} fields extracted`
        : 'no document');
  return [
    { name: 'intake', label: 'Application received via APIM', status: 'done', at: c.updatedAt },
    { name: 'classifier', label: 'Foundry Classifier agent', status: 'done', detail: c.applicationType ?? '—' },
    { name: 'extractor', label: 'Document Extractor agent', status: hasExtraction ? 'done' : 'skipped', detail: extractorDetail },
    { name: 'eligibility', label: 'Eligibility Pre-Assessor', status: 'done', detail: typeof c.confidence === 'number' ? `confidence ${(c.confidence*100).toFixed(0)}%` : (c.decision ?? '—') },
    { name: 'd365', label: 'D365 case created', status: 'done', detail: c.id },
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
  // link, etc.), fetch the list from APIM, hydrate caseStore and re-read.
  useEffect(() => {
    if (!id || c || !isAuth || hydrating) return;
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
        for (const it of items) {
          const stored = remoteToStored(it, country, accounts[0]?.username);
          if (stored.id) appendCase(stored);
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

  return (
    <article className="apply-page case-detail">
      <p className="case-detail__back"><Link to="/cases"><FormattedMessage id="caseDetail.back" defaultMessage="← Back to My cases" /></Link></p>
      <header className="case-detail__head">
        <div>
          <h1>{c.title}</h1>
          <p className="case-detail__sub">
            Case <code>{c.id}</code> · country <strong>{c.country.toUpperCase()}</strong>
            {c.updatedAt && <> · updated {new Date(c.updatedAt).toLocaleString()}</>}
          </p>
          <div className="case-detail__pills">
            <span className={`pill pill--${c.status.toLowerCase().replace(/\s+/g, '-')}`}>{c.status}</span>
            {typeof c.confidence === 'number' && (
              <span className="pill pill--confidence">AI confidence {(c.confidence * 100).toFixed(0)}%</span>
            )}
            {c.estimatedDecisionDate && (
              <span className="pill pill--eta">ETA {c.estimatedDecisionDate}</span>
            )}
          </div>
        </div>
        <div className="case-detail__actions">
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

      <div className="case-detail__grid">
        <section aria-labelledby="wf-title" className="case-section case-section--wide">
          <h2 id="wf-title"><FormattedMessage id="caseDetail.timeline" defaultMessage="Workflow timeline" /></h2>
          <p className="case-detail__hint">
            Live view of the country intake Logic App
            {' '}<code>udcsp-{c.country}-dev-application-intake</code>{' '}
            orchestrating Foundry agents, D365 case creation and Purview lineage publication.
          </p>
          <WorkflowDiagram steps={steps} />
        </section>

        {c.eligibility && (
          <section aria-labelledby="elig-title" className="case-section case-section--wide">
            <h2 id="elig-title"><FormattedMessage id="caseDetail.eligibility" defaultMessage="Eligibility pre-assessment" /></h2>
            <p className="case-detail__hint">
              Snapshot of the Foundry <code>udcsp-eligibility</code> agent verdict at the moment of submission.
              The Logic App re-runs the same agent server-side for the AI Act art. 14 audit registry.
            </p>
            <div className="case-detail__pills">
              {c.eligibility.recommendation && (
                <span className={`pill pill--${c.eligibility.recommendation}`}>
                  Recommendation: {c.eligibility.recommendation}
                </span>
              )}
              {typeof c.eligibility.confidence === 'number' && (
                <span className="pill pill--confidence">Confidence {(c.eligibility.confidence * 100).toFixed(0)}%</span>
              )}
              {c.eligibility.humanReviewRequired !== undefined && (
                <span className={`pill ${c.eligibility.humanReviewRequired ? 'pill--review' : 'pill--auto'}`}>
                  {c.eligibility.humanReviewRequired ? 'Human review required' : 'Auto-decidable'}
                </span>
              )}
            </div>
            {c.eligibility.citizenNotice && (
              <p className="case-detail__notice"><strong>For you:</strong> {c.eligibility.citizenNotice}</p>
            )}
            {c.eligibility.caseworkerSummary && (
              <details className="case-detail__details">
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
              <details className="case-detail__details">
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

        {c.documentBlobUrl && (
          <section aria-labelledby="doc-title" className="case-section">
            <h2 id="doc-title"><FormattedMessage id="caseDetail.attachedDoc" defaultMessage="Attached document" /></h2>
            <dl className="case-detail__dl">
              <dt>File</dt><dd>{c.documentBlobName ?? '—'}</dd>
              <dt>Storage account</dt><dd><code>{c.storageAccount ?? `udcsp${c.country}prodlake`}</code></dd>
              <dt>Container</dt><dd><code>citizen-uploads</code></dd>
              <dt>Region</dt><dd>{c.country.toUpperCase()} (data residency)</dd>
            </dl>
            <p className="case-detail__hint">Caseworkers retrieve it via APIM with managed-identity Storage Blob Data Reader on the country lake.</p>
          </section>
        )}

        {c.extractedFields && Object.keys(c.extractedFields).length > 0 && (
          <section aria-labelledby="ex-title" className="case-section">
            <h2 id="ex-title"><FormattedMessage id="caseDetail.extracted" defaultMessage="Extracted fields" /></h2>
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
      </div>
    </article>
  );
}
