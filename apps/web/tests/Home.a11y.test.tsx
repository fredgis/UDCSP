import axe from 'axe-core';
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../src/pages/HomePage';
it('home page has no critical axe violations', async () => { const { container } = render(<MemoryRouter><HomePage locale="en" /></MemoryRouter>); const results = await axe.run(container); expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0); });
