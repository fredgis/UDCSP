import { expect, it } from 'vitest';
import { generateTraceparent } from '../src/utils/traceparent';
it('generates W3C traceparent', () => { expect(generateTraceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/); });
