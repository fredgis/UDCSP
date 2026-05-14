// Local cache of submitted applications keyed by citizen+country.
// The intake Logic App accepts POSTs but doesn't (yet) expose a GET listing,
// so we mirror successful submissions client-side so the citizen always sees
// what they just sent. The server list, when available, is merged on top.

const KEY = 'udcsp.cases.v1';

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
    return Array.isArray(parsed) ? (parsed as StoredCase[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: StoredCase[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage may be disabled — silently ignore
  }
}

export function appendCase(c: StoredCase) {
  const all = readAll();
  // dedupe on id
  const filtered = all.filter((x) => x.id !== c.id);
  filtered.unshift(c);
  writeAll(filtered.slice(0, 50));
}

// Merge a (possibly partial) remote-derived case into the local store.
// Preserves any field already present locally unless the incoming value
// is non-empty — so a rich apply-time entry (full workflowSteps,
// extractedFields, documentBlobUrl, eligibilityPreflight) is NOT clobbered
// by a slim re-hydration from a truncated Dataverse description.
export function upsertCase(c: StoredCase) {
  const all = readAll();
  const idx = all.findIndex((x) => x.id === c.id);
  if (idx < 0) {
    all.unshift(c);
    writeAll(all.slice(0, 50));
    return;
  }
  const prev = all[idx];
  const merged: StoredCase = {
    ...prev,
    // Always trust remote for these (server is authoritative)
    status: c.status || prev.status,
    updatedAt: c.updatedAt || prev.updatedAt,
    title: c.title || prev.title,
    // Only overwrite if the remote actually carries a value
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
  all[idx] = merged;
  writeAll(all);
}

export function listCases(country: string, citizenUpn?: string): StoredCase[] {
  return readAll().filter((c) => c.country === country && (!citizenUpn || c.citizenUpn === citizenUpn));
}

export function listAllCases(): StoredCase[] {
  return readAll();
}

export function getCase(id: string): StoredCase | undefined {
  return readAll().find((c) => c.id === id);
}

export function updateCase(id: string, patch: Partial<StoredCase>): StoredCase | undefined {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  const next = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  all[idx] = next;
  writeAll(all);
  return next;
}

export function removeCase(id: string) {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function wipeAllForCitizen(country: string, citizenUpn?: string) {
  writeAll(readAll().filter((c) => !(c.country === country && (!citizenUpn || c.citizenUpn === citizenUpn))));
}

export function clearCases() {
  writeAll([]);
}
