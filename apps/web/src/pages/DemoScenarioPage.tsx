import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

/**
 * DemoScenarioPage — runtime entry point for the 10 acceptance scenarios
 * walked through in `docs/tech/recipe.md`. Each scenario maps to a unique
 * URL slug (`d1`..`d10`, plus the combined `d5-d6`) and to a server-side
 * gateway action under `/gateway/demo-scenarios/<slug>` which orchestrates
 * the underlying Logic App / Foundry agent / D365 entity for that scenario.
 *
 * The page intentionally stays minimal: it is the surface the Playwright
 * acceptance tests in `tests/e2e/tests/scenario-*.spec.ts` drive. Real
 * channel-specific UX (residency wizard, child-benefit wizard, etc.) lives
 * under `/apply/...` — this page is only the demo harness.
 */

type ScenarioStatus = 'idle' | 'running' | 'completed' | 'failed';

interface SubmissionResult {
  traceparent: string;
  status: 'accepted' | 'queued' | 'completed';
  scenarioId: string;
  receivedAt: string;
}

interface DemoMeta {
  slug: string;
  title: string;
  intent: string;
  description: string;
}

const SCENARIOS: Record<string, DemoMeta> = {
  d1: {
    slug: 'd1',
    title: 'D1 — Anna · Cross-border residency transfer (DK → SE)',
    intent: 'cross-border-residency-transfer',
    description: 'Federated External ID, eligibility pre-assessment in Swedish, caseworker review.',
  },
  d2: {
    slug: 'd2',
    title: 'D2 — Lars · Voice status query (Norwegian Bokmål)',
    intent: 'voice-tax-status',
    description: 'GPT-4o Realtime over ACS, function tool calls APIM topic-router, optional D365 warm transfer.',
  },
  d3: {
    slug: 'd3',
    title: 'D3 — Maria · Polish screen-reader child-benefit application',
    intent: 'a11y-child-benefit',
    description: 'WCAG 2.1 AA wizard, ARIA-live error summary, Polish locale preserved end-to-end.',
  },
  d4: {
    slug: 'd4',
    title: 'D4 — Erik · Mobile payslip OCR + eligibility pre-assess',
    intent: 'mobile-payslip',
    description: 'Doc Intelligence extraction, Foundry eligibility recommendation, AI Act registry ID returned.',
  },
  'd5-d6': {
    slug: 'd5-d6',
    title: 'D5/D6 — Astrid · Caseworker AI review with override',
    intent: 'caseworker-triage',
    description: 'D365 queue with AI summary, "Show AI reasoning" panel, shadow-mode metric on override.',
  },
  d7: {
    slug: 'd7',
    title: 'D7 — Hans · DPO Subject Access Request',
    intent: 'gdpr-sar',
    description: 'Logic App `gdpr-data-export`, Purview lineage edge, signed bundle URL.',
  },
  d8: {
    slug: 'd8',
    title: 'D8 — Ingrid · SOC impossible-travel containment',
    intent: 'soc-impossible-travel',
    description: 'Sentinel rule fires, automation playbook revokes session + PIM eligibility.',
  },
  d9: {
    slug: 'd9',
    title: 'D9 — Henrik · CIO executive cockpit',
    intent: 'cio-cockpit',
    description: 'Power BI Premium executive cockpit; KPI reconciliation against Fabric gold layer.',
  },
  d10: {
    slug: 'd10',
    title: 'D10 — Evaluator cross-cutting walkthrough',
    intent: 'evaluator-cross-cutting',
    description: 'Chains D1..D9 in the order an evaluator explores the platform; produces the HTML report.',
  },
};

export function DemoScenarioPage() {
  const { id } = useParams<{ id: string }>();
  const slug = (id ?? '').toLowerCase();
  const meta = SCENARIOS[slug];

  const [intent, setIntent] = useState(meta?.intent ?? '');
  const [status, setStatus] = useState<ScenarioStatus>('idle');
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIntent(meta?.intent ?? '');
    setStatus('idle');
    setResult(null);
    setError(null);
  }, [slug, meta]);

  if (!meta) {
    return (
      <section aria-labelledby="demo-not-found" className="demo-scenario">
        <h1 id="demo-not-found">Unknown demo scenario: {slug}</h1>
        <p>Valid slugs: {Object.keys(SCENARIOS).join(', ')}.</p>
      </section>
    );
  }

  async function start() {
    setStatus('running');
    setError(null);
    try {
      const submission = await apiFetch<SubmissionResult>(`/gateway/demo-scenarios/${meta.slug}`, {
        method: 'POST',
        body: JSON.stringify({ scenario: meta.slug.toUpperCase(), intent }),
      });
      setResult(submission);
      setStatus(submission.status === 'completed' ? 'completed' : 'running');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('failed');
    }
  }

  return (
    <section aria-labelledby="demo-scenario-title" className="demo-scenario">
      <h1 id="demo-scenario-title">UDCSP demo scenario · {meta.title}</h1>
      <p className="demo-description">{meta.description}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <label htmlFor="scenario-intent">Scenario intent</label>
        <input
          id="scenario-intent"
          data-testid="scenario-intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          required
        />
        <button type="submit" data-testid="start-scenario" disabled={status === 'running'}>
          {status === 'running' ? 'Running…' : 'Start scenario'}
        </button>
      </form>

      <div role="status" aria-live="polite" data-testid="scenario-status">
        Status: {status}
      </div>

      {result && (
        <dl data-testid="scenario-result">
          <dt>Traceparent</dt>
          <dd data-testid="scenario-traceparent">{result.traceparent}</dd>
          <dt>Scenario</dt>
          <dd>{result.scenarioId}</dd>
          <dt>Received at</dt>
          <dd>{result.receivedAt}</dd>
        </dl>
      )}

      {error && (
        <div role="alert" data-testid="scenario-error">
          {error}
        </div>
      )}
    </section>
  );
}
