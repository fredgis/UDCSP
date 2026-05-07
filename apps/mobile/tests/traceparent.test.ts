import { traceparent } from '../src/api/client';
test('mobile traceparent format', () => { expect(traceparent()).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/); });
