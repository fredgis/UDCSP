import { beforeEach, describe, expect, it, vi } from 'vitest';

const CASE_KEY = 'udcsp.cases.v1';

const richCase = {
  id: 'case-1',
  title: 'Residency transfer',
  status: 'Submitted',
  updatedAt: '2026-08-11T12:00:00.000Z',
  country: 'dk',
  citizenUpn: 'alice@example.test',
  applicationType: 'residency-transfer',
  decision: 'likely-eligible',
  confidence: 0.91,
  estimatedDecisionDate: '2026-08-15',
  extractedFields: { passportNumber: 'P1234567' },
  documentBlobUrl: 'https://storage.example.test/citizen-uploads/passport.pdf',
  documentBlobName: 'passport.pdf',
  storageAccount: 'citizenstorage',
  eligibility: {
    recommendation: 'eligible',
    citizenNotice: 'Sensitive citizen notice',
    caseworkerSummary: 'Sensitive caseworker summary',
  },
  workflowSteps: [
    {
      name: 'eligibility',
      label: 'Eligibility Pre-Assessor',
      status: 'done' as const,
      detail: 'eligible · 91% confidence',
    },
  ],
};

describe('caseStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('persists only allow-listed offline metadata while retaining rich data in memory', async () => {
    const { appendCase, getCase } = await import('../src/utils/caseStore');

    appendCase(richCase);

    expect(getCase(richCase.id, richCase.citizenUpn)?.extractedFields).toEqual(richCase.extractedFields);
    const persisted = JSON.parse(window.localStorage.getItem(CASE_KEY) ?? '[]')[0] as Record<string, unknown>;
    expect(persisted).not.toHaveProperty('decision');
    expect(persisted).not.toHaveProperty('confidence');
    expect(persisted).not.toHaveProperty('extractedFields');
    expect(persisted).not.toHaveProperty('documentBlobUrl');
    expect(persisted).not.toHaveProperty('documentBlobName');
    expect(persisted).not.toHaveProperty('storageAccount');
    expect(persisted).not.toHaveProperty('eligibility');
    expect(persisted.workflowSteps).toEqual([
      {
        name: 'eligibility',
        label: 'Eligibility Pre-Assessor',
        status: 'done',
      },
    ]);
  });

  it('requires the signed-in citizen identity and drops rich data after reload', async () => {
    const initialStore = await import('../src/utils/caseStore');
    initialStore.appendCase(richCase);

    expect(initialStore.getCase(richCase.id, 'bob@example.test')).toBeUndefined();

    vi.resetModules();
    const reloadedStore = await import('../src/utils/caseStore');
    const reloaded = reloadedStore.getCase(richCase.id, richCase.citizenUpn);
    expect(reloaded).toBeDefined();
    expect(reloaded?.extractedFields).toBeUndefined();
    expect(reloaded?.documentBlobUrl).toBeUndefined();
    expect(reloaded?.eligibility).toBeUndefined();
  });

  it('scrubs sensitive fields from a legacy localStorage entry on read', async () => {
    window.localStorage.setItem(CASE_KEY, JSON.stringify([richCase]));
    const { getCase } = await import('../src/utils/caseStore');

    const migrated = getCase(richCase.id, richCase.citizenUpn);
    const persisted = window.localStorage.getItem(CASE_KEY) ?? '';

    expect(migrated?.extractedFields).toBeUndefined();
    expect(persisted).not.toContain('passportNumber');
    expect(persisted).not.toContain('citizenNotice');
    expect(persisted).not.toContain('caseworkerSummary');
  });

  it('removes the persisted and in-memory cache when cleared', async () => {
    const { appendCase, clearCases, getCase } = await import('../src/utils/caseStore');
    appendCase(richCase);

    clearCases();

    expect(window.localStorage.getItem(CASE_KEY)).toBeNull();
    expect(getCase(richCase.id, richCase.citizenUpn)).toBeUndefined();
  });
});
