// Minimal offline cache of submitted applications keyed by citizen+country.
// Rich document and eligibility data stays in memory for the current SPA
// session only; after a reload the detail page re-hydrates it from APIM.

const KEY = 'udcsp.cases.v1';
const volatileCases = new Map<string, StoredCase>();

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

export type StoredCase = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  country: string;
  citizenUpn?: string;
  applicationType?: string;
  decision?: string;
  confidence?: number;
  estimatedDecisionDate?: string;
  extractedFields?: Record<string, unknown>;
  documentBlobUrl?: string;
  documentBlobName?: string;
  storageAccount?: string;
  eligibility?: EligibilitySnapshot;
  workflowSteps?: Array<{ name: string; label: string; status: 'done' | 'in-progress' | 'pending' | 'skipped'; at?: string; detail?: string }>;
};

function readAll(): StoredCase[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(isStoredCase);
    const sanitized = valid.map(toPersistedCase);
    if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
      writeAll(sanitized);
    }
    return sanitized;
  } catch {
    return [];
  }
}

function writeAll(list: StoredCase[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.map(toPersistedCase)));
  } catch {
    // storage may be disabled — silently ignore
  }
}

function isStoredCase(value: unknown): value is StoredCase {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<StoredCase>;
  return typeof c.id === 'string'
    && typeof c.title === 'string'
    && typeof c.status === 'string'
    && typeof c.updatedAt === 'string'
    && typeof c.country === 'string';
}

function toPersistedCase(c: StoredCase): StoredCase {
  return {
    id: c.id,
    title: c.title,
    status: c.status,
    updatedAt: c.updatedAt,
    country: c.country,
    citizenUpn: c.citizenUpn,
    applicationType: c.applicationType,
    estimatedDecisionDate: c.estimatedDecisionDate,
    workflowSteps: Array.isArray(c.workflowSteps)
      ? c.workflowSteps.map((step) => ({
          name: step.name,
          label: step.label,
          status: step.status,
          at: step.at,
        }))
      : undefined,
  };
}

function normalizeCitizen(citizenUpn: string | undefined): string {
  return citizenUpn?.trim().toLowerCase() ?? '';
}

function sameCitizen(left: string | undefined, right: string | undefined): boolean {
  const normalizedLeft = normalizeCitizen(left);
  return normalizedLeft.length > 0 && normalizedLeft === normalizeCitizen(right);
}

function withVolatileCase(c: StoredCase, citizenUpn: string): StoredCase {
  const volatile = volatileCases.get(c.id);
  return volatile && sameCitizen(volatile.citizenUpn, citizenUpn) ? volatile : c;
}

export function appendCase(c: StoredCase) {
  volatileCases.set(c.id, c);
  const all = readAll();
  // dedupe on id
  const filtered = all.filter((x) => x.id !== c.id);
  filtered.unshift(toPersistedCase(c));
  writeAll(filtered.slice(0, 50));
}

// Merge a (possibly partial) remote-derived case into the local store.
// Preserves any field already present locally unless the incoming value
// is non-empty. Rich fields are retained only in the in-memory copy and the
// localStorage copy remains the allow-listed offline fallback.
export function upsertCase(c: StoredCase) {
  const all = readAll();
  const idx = all.findIndex((x) => x.id === c.id && sameCitizen(x.citizenUpn, c.citizenUpn));
  if (idx < 0) {
    volatileCases.set(c.id, c);
    all.unshift(toPersistedCase(c));
    writeAll(all.slice(0, 50));
    return;
  }
  const volatile = volatileCases.get(c.id);
  const prev = volatile && sameCitizen(volatile.citizenUpn, c.citizenUpn) ? volatile : all[idx];
  const merged: StoredCase = {
    id: c.id,
    status: c.status || prev.status,
    updatedAt: c.updatedAt || prev.updatedAt,
    title: c.title || prev.title,
    country: c.country || prev.country,
    citizenUpn: c.citizenUpn || prev.citizenUpn,
    applicationType: c.applicationType || prev.applicationType,
    decision: c.decision || prev.decision,
    confidence: typeof c.confidence === 'number' ? c.confidence : prev.confidence,
    estimatedDecisionDate: c.estimatedDecisionDate || prev.estimatedDecisionDate,
    extractedFields: (c.extractedFields && Object.keys(c.extractedFields).length > 0) ? c.extractedFields : prev.extractedFields,
    documentBlobUrl: c.documentBlobUrl || prev.documentBlobUrl,
    documentBlobName: c.documentBlobName || prev.documentBlobName,
    storageAccount: c.storageAccount || prev.storageAccount,
    eligibility: c.eligibility ?? prev.eligibility,
    workflowSteps: (c.workflowSteps && c.workflowSteps.length > 0) ? c.workflowSteps : prev.workflowSteps,
  };
  volatileCases.set(c.id, merged);
  all[idx] = toPersistedCase(merged);
  writeAll(all);
}

export function listCases(country: string, citizenUpn: string): StoredCase[] {
  return readAll()
    .filter((c) => c.country === country && sameCitizen(c.citizenUpn, citizenUpn))
    .map((c) => withVolatileCase(c, citizenUpn));
}

export function getCase(id: string, citizenUpn: string): StoredCase | undefined {
  const stored = readAll().find((c) => c.id === id && sameCitizen(c.citizenUpn, citizenUpn));
  return stored ? withVolatileCase(stored, citizenUpn) : undefined;
}

export function updateCase(id: string, patch: Partial<StoredCase>): StoredCase | undefined {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  const current = volatileCases.get(id) ?? all[idx];
  const next = { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() };
  volatileCases.set(id, next);
  all[idx] = toPersistedCase(next);
  writeAll(all);
  return next;
}

export function removeCase(id: string) {
  volatileCases.delete(id);
  writeAll(readAll().filter((c) => c.id !== id));
}

export function wipeAllForCitizen(country: string, citizenUpn?: string) {
  for (const [id, c] of volatileCases) {
    if (c.country === country && (!citizenUpn || sameCitizen(c.citizenUpn, citizenUpn))) {
      volatileCases.delete(id);
    }
  }
  writeAll(readAll().filter((c) => !(c.country === country && (!citizenUpn || sameCitizen(c.citizenUpn, citizenUpn)))));
}

export function clearCases() {
  volatileCases.clear();
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // storage may be disabled — silently ignore
  }
}
