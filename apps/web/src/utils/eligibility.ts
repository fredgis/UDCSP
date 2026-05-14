// Calls the Foundry Eligibility Pre-Assessor agent through APIM.
// Runs synchronously from the citizen UI in the Apply step "Eligibility
// criteria" so the citizen sees the rule-by-rule verdict (and the score
// derived from their employment contract / income / household data)
// BEFORE consenting and submitting. The same payload is then carried in
// the /citizen-applications/ POST so the application-intake Logic App
// records the verdict on the udcsp_application Dataverse row without
// having to re-run the agent (the LA does call it again for AI Act art.
// 14 audit registry — both calls show up in App Insights and Purview).
//
// Agent contract: see foundry/agents/eligibility/system-prompt.md.
// APIM route: services/apim/apis/eligibility-checks/openapi.yaml
//   POST /eligibility-checks/assessments
//   → 200 { recommendation, confidence, ruleResults[], missingEvidence[],
//           humanReviewRequired, citizenNotice, caseworkerSummary, lineage }
//
// We tolerate a partial response (the front never blocks on the agent
// being slow or unavailable — the citizen can still submit; the LA will
// then run the agent server-side on its own).

import { apiFetch } from '../api/client';

export type AgentRecommendation =
  | 'eligible'
  | 'not-eligible'
  | 'not-yet-eligible'
  | 'insufficient-data'
  | 'escalate';

export type FrontDecision = 'likely-eligible' | 'requires-review' | 'likely-ineligible';

export type RuleResult = {
  rule: string;
  passed: boolean;
  evidenceIds?: string[];
  details?: string;
};

export type EligibilityResponse = {
  recommendation: AgentRecommendation;
  confidence: number;
  ruleResults?: RuleResult[];
  missingEvidence?: string[];
  humanReviewRequired?: boolean;
  citizenNotice?: string;
  caseworkerSummary?: string;
  lineage?: { ruleVersion?: string; promptVersion?: string; datasetVersion?: string };
  // Set client-side when the call fails so the UI can show a friendly fallback.
  error?: string;
};

export function recommendationToDecision(r?: AgentRecommendation, c?: number): FrontDecision {
  if (r === 'eligible') return 'likely-eligible';
  if (r === 'not-eligible') return 'likely-ineligible';
  if (r === 'not-yet-eligible' || r === 'insufficient-data' || r === 'escalate') return 'requires-review';
  if (typeof c === 'number') {
    if (c >= 0.75) return 'likely-eligible';
    if (c >= 0.45) return 'requires-review';
    return 'likely-ineligible';
  }
  return 'requires-review';
}

export type EligibilityRequest = {
  applicationType: 'residency-transfer' | 'child-benefit' | 'tax-certificate';
  fromCountry: string;
  destinationCountry?: string;
  citizenLocale?: string;
  citizenUpn?: string;
  // Free-form context payload that the agent reads. Keep keys small so the
  // agent's deterministic rule packs (DK-CPR-arrival, SE-folkbokforing-1y…)
  // can match — see foundry/agents/eligibility/system-prompt.md.
  context: Record<string, unknown>;
  extractedFields?: Record<string, unknown>;
  documentBlobUrl?: string;
};

export async function runEligibility(req: EligibilityRequest): Promise<EligibilityResponse> {
  try {
    const r = await apiFetch<EligibilityResponse>('/eligibility-checks/assessments', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    return {
      recommendation: r.recommendation || 'escalate',
      confidence: typeof r.confidence === 'number' ? r.confidence : 0,
      ruleResults: r.ruleResults || [],
      missingEvidence: r.missingEvidence || [],
      humanReviewRequired: r.humanReviewRequired ?? true,
      citizenNotice: r.citizenNotice,
      caseworkerSummary: r.caseworkerSummary,
      lineage: r.lineage,
    };
  } catch (err) {
    return {
      recommendation: 'escalate',
      confidence: 0,
      humanReviewRequired: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
