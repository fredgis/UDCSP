import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ApplicationStatusChart } from '../../src/components/insights';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <canvas aria-label="Mes demandes par statut" role="img" />,
}));

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockReturnValue({ matches: false }),
});

it('renders the status chart with an accessible data table alternative', () => {
  render(
    <ApplicationStatusChart
      data={[
        { status: 'Soumise', count: 2 },
        { status: 'En cours', count: 1 },
      ]}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Mes demandes par statut' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Mes demandes par statut' })).toBeInTheDocument();

  const table = screen.getByRole('table', {
    name: 'Alternative textuelle du graphique Mes demandes par statut',
  });
  expect(within(table).getByRole('columnheader', { name: 'Catégorie' })).toBeInTheDocument();
  expect(within(table).getByRole('cell', { name: 'Soumise' })).toBeInTheDocument();
  expect(within(table).getByRole('cell', { name: '2' })).toBeInTheDocument();
});
