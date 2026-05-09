// Smoke tests for the IVR loader. Verifies the post-audit-corrected schema
// (kind: UDCSP.Voice.Dialog) is honoured and the recording disclosure is
// parsed for the country's locale.

import { describe, it, expect } from 'vitest';
import { COUNTRY_LOCALES, loadIvrPack } from '../src/ivr-loader.js';

describe('ivr-loader', () => {
  it('maps countries to the right primary locale', () => {
    expect(COUNTRY_LOCALES.dk).toBe('da');
    expect(COUNTRY_LOCALES.se).toBe('sv');
    expect(COUNTRY_LOCALES.no).toBe('nb');
  });

  it('loads the welcome dialog with kind UDCSP.Voice.Dialog', () => {
    const pack = loadIvrPack('dk');
    expect(pack.welcome.kind).toBe('UDCSP.Voice.Dialog');
    expect(pack.welcome.prompts).toBeDefined();
    expect(pack.locale).toBe('da');
  });

  it('exposes a non-empty recording disclosure for the locale', () => {
    const pack = loadIvrPack('no');
    expect(pack.recordingDisclosure.length).toBeGreaterThan(0);
  });
});
