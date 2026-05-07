import { describe, expect, it } from 'vitest';
import { supportedLanguages } from '../src/utils/language';
describe('supported languages', () => { it('covers 12 locales', () => { expect(supportedLanguages).toHaveLength(12); expect(supportedLanguages.map(l => l.code)).toContain('ar'); }); });
