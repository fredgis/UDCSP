// Dataverse `task.description` is capped at 2000 chars. The intake LA stuffs
// the full submission JSON (form fields + extractedFields + eligibilityPreflight
// + documentBlobUrl) into that field prefixed by `citizenUpn: <upn> | text: `.
// When the payload exceeds 2000 chars it gets truncated mid-string, so a naive
// JSON.parse fails and the SPA loses access to documentBlobUrl, extractedFields
// and the rule-by-rule eligibility verdict.
//
// This module:
//   1. Strips the `citizenUpn: … | text:` prefix.
//   2. Attempts a clean JSON.parse first.
//   3. If that fails (truncation), repairs the tail by closing the open
//      string + array + object brackets and parses the result.
//   4. As a last resort, extracts known top-level fields with regex.
//
// The repaired object is "best-effort" — fields that were truncated lose
// their tail (e.g. an eligibility ruleResults[].details may stop mid-sentence)
// but everything BEFORE the cut survives, which is more than enough for the
// case detail page to show document, extracted fields, recommendation,
// confidence, and the rules that fit before the cut.

function repairTruncatedJson(s: string): string {
  // Track context: depth of { } and [ ], whether we're inside a "string".
  const stack: string[] = []; // entries are '{', '[' or '"'
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const top = stack[stack.length - 1];
    if (escape) { escape = false; continue; }
    if (top === '"') {
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { stack.pop(); continue; }
      continue;
    }
    if (ch === '"') { stack.push('"'); continue; }
    if (ch === '{' || ch === '[') { stack.push(ch); continue; }
    if (ch === '}' && top === '{') { stack.pop(); continue; }
    if (ch === ']' && top === '[') { stack.pop(); continue; }
  }
  let tail = '';
  // If still inside a string, terminate it. Append null-value placeholder so
  // the parent property stays valid.
  if (stack[stack.length - 1] === '"') {
    tail += '"';
    stack.pop();
  }
  // Some tails end with `,` or `, ` — strip them, JSON dislikes trailing commas.
  let head = s.replace(/[\s,]+$/u, '');
  // Some truncations land mid-key (e.g. `"emp`). If the very last token starts
  // with `"` but isn't a value, replace `"<incomplete>` → ``.
  // Detect: the last non-whitespace char after head was `"` (key not closed)
  // and we're inside `{` — drop the dangling key by walking back to the last `,` or `{`.
  if (stack.length > 0 && (head.endsWith('"') || /[":]\s*$/.test(head))) {
    const lastBoundary = Math.max(head.lastIndexOf(','), head.lastIndexOf('{'), head.lastIndexOf('['));
    if (lastBoundary > 0) head = head.substring(0, lastBoundary);
  }
  // Re-strip trailing commas/whitespace after the truncation cleanup above.
  head = head.replace(/[\s,]+$/u, '');
  // Close any remaining brackets in reverse order.
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i] === '{') tail += '}';
    else if (stack[i] === '[') tail += ']';
  }
  return head + tail;
}

function extractByRegex(body: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // Simple flat-string fields.
  for (const k of [
    'applicationType', 'country', 'citizenUpn', 'documentBlobUrl', 'documentBlobName',
    'storageAccount', 'attachedDocument', 'parentName', 'displayTitle',
    'fromCountry', 'destination', 'destinationCountry', 'moveDate',
  ]) {
    const m = new RegExp('"' + k + '"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"').exec(body);
    if (m) out[k] = m[1];
  }
  // recommendation / confidence inside eligibilityPreflight: surface to top level as proxy.
  const recM = /"recommendation"\s*:\s*"([^"]+)"/.exec(body);
  if (recM) (out as { recommendation?: string }).recommendation = recM[1];
  const confM = /"confidence"\s*:\s*([0-9.]+)/.exec(body);
  if (confM) (out as { confidence?: number }).confidence = parseFloat(confM[1]);
  return out;
}

export function parseDescription(desc?: string): Record<string, unknown> | null {
  if (!desc) return null;
  let body = desc.trim();
  const prefixIdx = body.indexOf('| text:');
  if (prefixIdx >= 0) body = body.substring(prefixIdx + '| text:'.length).trim();
  // Try clean parse first.
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>;
  } catch { /* fall through to repair */ }
  // Truncated: repair brackets and retry.
  try {
    const repaired = repairTruncatedJson(body);
    const parsed = JSON.parse(repaired);
    if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, unknown>;
  } catch { /* fall through to regex */ }
  // Last resort: regex-extract known top-level fields.
  const out = extractByRegex(body);
  return Object.keys(out).length > 0 ? out : null;
}

export type EligibilityRule = { rule: string; passed: boolean; evidenceIds?: string[]; details?: string };
export type EligibilitySnapshot = {
  recommendation?: string;
  confidence?: number;
  ruleResults?: EligibilityRule[];
  missingEvidence?: string[];
  humanReviewRequired?: boolean;
  citizenNotice?: string;
  caseworkerSummary?: string;
  lineage?: { ruleVersion?: string; promptVersion?: string; datasetVersion?: string };
};

export function extractEligibility(body: Record<string, unknown> | null): EligibilitySnapshot | undefined {
  if (!body) return undefined;
  const e = body.eligibilityPreflight as EligibilitySnapshot | undefined;
  if (e && (e.recommendation || typeof e.confidence === 'number' || (e.ruleResults?.length ?? 0) > 0)) {
    return e;
  }
  // Fall back to flat fields (regex path)
  const rec = (body as { recommendation?: string }).recommendation;
  const conf = (body as { confidence?: number }).confidence;
  if (rec || typeof conf === 'number') return { recommendation: rec, confidence: conf };
  return undefined;
}

const APP_TITLE: Record<string, string> = {
  'residency-transfer': 'Residency transfer',
  'child-benefit': 'Child & family benefit',
  'tax-certificate': 'Tax certificate',
};

const APP_ICON: Record<string, string> = {
  'residency-transfer': '🏠',
  'child-benefit': '👶',
  'tax-certificate': '📄',
};

export function humanTitle(applicationType?: string, fallback?: string): string {
  if (applicationType && APP_TITLE[applicationType]) return APP_TITLE[applicationType];
  if (fallback) {
    // Strip the [UDCSP-XX] prefix from raw subjects
    const stripped = fallback.replace(/^\[UDCSP-[A-Z]{2}\]\s*/, '');
    // Convert kebab-case to Title Case
    return stripped
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || 'Application';
  }
  return 'Application';
}

export function applicationIcon(applicationType?: string): string {
  return (applicationType && APP_ICON[applicationType]) || '📌';
}

export function countryFlag(country?: string): string {
  switch ((country || '').toLowerCase()) {
    case 'dk': return '🇩🇰';
    case 'se': return '🇸🇪';
    case 'no': return '🇳🇴';
    default: return '';
  }
}

const STATE_LABEL: Record<number, string> = { 0: 'Open', 1: 'Completed', 2: 'Canceled' };
const STATUSCODE_LABEL: Record<number, string> = {
  // Activity statuscode option-set (Dataverse default)
  1: 'Not started',
  2: 'In progress',
  3: 'Waiting on someone else',
  4: 'Completed',
  5: 'Canceled',
};

export function humanStatus(raw?: string, statecode?: number, statuscode?: number): string {
  if (raw && !raw.startsWith('statuscode ')) return raw;
  if (typeof statuscode === 'number' && STATUSCODE_LABEL[statuscode]) return STATUSCODE_LABEL[statuscode];
  if (raw && raw.startsWith('statuscode ')) {
    const n = parseInt(raw.substring('statuscode '.length), 10);
    if (Number.isFinite(n) && STATUSCODE_LABEL[n]) return STATUSCODE_LABEL[n];
  }
  if (typeof statecode === 'number' && STATE_LABEL[statecode]) return STATE_LABEL[statecode];
  return raw || 'Submitted';
}
