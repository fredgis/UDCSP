import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCase, removeCase, updateCase, type StoredCase } from '../utils/caseStore';

type StepStatus = 'done' | 'in-progress' | 'pending' | 'skipped';
type Step = { name: string; label: string; status: StepStatus; at?: string; detail?: string };

// Default workflow rendering when a case predates the workflowSteps schema:
// mirrors the 5 actions of the Logic App `udcsp-{country}-dev-application-intake`
// (Classifier → Eligibility → Document Extractor → Create_D365_case → Lineage)
// plus intake at the top and human review at the bottom.
function defaultSteps(c: StoredCase): Step[] {
  const isCanceled = /cancel/i.test(c.status);
  const finalReview: StepStatus = isCanceled ? 'skipped' : 'in-progress';
  return [
    { name: 'intake', label: 'Application received via APIM', status: 'done', at: c.updatedAt },
    { name: 'classifier', label: 'Foundry Classifier agent', status: 'done', detail: c.applicationType ?? '—' },
    { name: 'extractor', label: 'Document Extractor agent', status: c.documentBlobName ? 'done' : 'skipped', detail: c.documentBlobName ?? 'no document' },
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [c, setC] = useState<StoredCase | undefined>(() => (id ? getCase(id) : undefined));

  useEffect(() => {
    if (id) setC(getCase(id));
  }, [id]);

  const steps = useMemo(() => (c ? (c.workflowSteps && c.workflowSteps.length ? c.workflowSteps : defaultSteps(c)) : []), [c]);

  if (!c) {
    return (
      <article className="apply-page">
        <h1>Case not found</h1>
        <p>This case is not in your local cache. Try refreshing the list.</p>
        <p><Link to="/cases" className="button-secondary">← Back to my cases</Link></p>
      </article>
    );
  }

  const isCanceled = /cancel/i.test(c.status);

  return (
    <article className="apply-page case-detail">
      <p className="case-detail__back"><Link to="/cases">← Back to my cases</Link></p>
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
            className="button-secondary"
            disabled={isCanceled}
            onClick={() => {
              if (isCanceled) return;
              if (!confirm('Cancel this case? Caseworker is notified and the audit trail is preserved.')) return;
              updateCase(c.id, { status: 'Canceled by citizen' });
              setC(getCase(c.id));
            }}
          >
            Cancel case
          </button>
          <button
            type="button"
            className="button-danger"
            onClick={() => {
              if (!confirm('Delete this case from local cache? Server records remain (public-records law). Request server-side erasure via the Consent page.')) return;
              removeCase(c.id);
              navigate('/cases');
            }}
          >
            Remove from cache
          </button>
        </div>
      </header>

      <div className="case-detail__grid">
        <section aria-labelledby="wf-title" className="case-section case-section--wide">
          <h2 id="wf-title">Workflow timeline</h2>
          <p className="case-detail__hint">
            Live view of the country intake Logic App
            {' '}<code>udcsp-{c.country}-dev-application-intake</code>{' '}
            orchestrating Foundry agents, D365 case creation and Purview lineage publication.
          </p>
          <WorkflowDiagram steps={steps} />
        </section>

        {c.documentBlobUrl && (
          <section aria-labelledby="doc-title" className="case-section">
            <h2 id="doc-title">Attached document</h2>
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
            <h2 id="ex-title">Extracted fields</h2>
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
