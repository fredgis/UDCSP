import { useState } from 'react';
import { ArcElement, Chart as ChartJS, ChartOptions, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import './styles.module.css';
import { buildSingleSeriesTable } from './accessibility';

ChartJS.register(ArcElement, Tooltip, Legend);

export type ProcessingTimeIndicatorProps = {
  currentDays: number;
  slaDays?: number;
};

const gaugeSegments = [
  { label: 'Délai écoulé', color: '#12436d' },
  { label: 'SLA restant', color: '#207f3b' },
  { label: 'Dépassement SLA', color: '#8f1d21' },
];

export function ProcessingTimeIndicator({ currentDays, slaDays = 4 }: ProcessingTimeIndicatorProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hiddenSegments, setHiddenSegments] = useState<Set<string>>(() => new Set());
  const elapsed = Math.min(currentDays, slaDays);
  const remaining = Math.max(slaDays - currentDays, 0);
  const overdue = Math.max(currentDays - slaDays, 0);
  const values = [elapsed, remaining, overdue];
  const table = buildSingleSeriesTable(
    gaugeSegments.map(segment => segment.label),
    values,
    'Jours',
  );

  const chartData = {
    labels: gaugeSegments.map(segment => segment.label),
    datasets: [
      {
        data: values.map((value, index) => (hiddenSegments.has(gaugeSegments[index].label) ? 0 : value)),
        backgroundColor: gaugeSegments.map(segment => segment.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    animation: prefersReducedMotion ? false : { duration: 350 },
    circumference: 180,
    cutout: '72%',
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    rotation: 270,
  };

  return (
    <section className="insightsCard" aria-labelledby="processing-time-title">
      <h2 id="processing-time-title">Délai de traitement</h2>
      <p className={currentDays > slaDays ? 'statusWarning' : 'statusGood'}>
        Délai actuel: {currentDays} jours / SLA {slaDays} jours
      </p>
      <div
        className="gaugeRegion"
        role="img"
        aria-label={`Délai actuel ${currentDays} jours sur un SLA de ${slaDays} jours.`}
      >
        <Doughnut data={chartData} options={options} aria-label="Indicateur du délai de traitement" />
      </div>
      <div className="legend" aria-label="Légende interactive du délai de traitement">
        {gaugeSegments.map(segment => {
          const visible = !hiddenSegments.has(segment.label);
          return (
            <button
              aria-pressed={visible}
              className="legendButton"
              key={segment.label}
              onClick={() =>
                setHiddenSegments(current => {
                  const next = new Set(current);
                  if (next.has(segment.label)) next.delete(segment.label);
                  else next.add(segment.label);
                  return next;
                })
              }
              type="button"
            >
              <span className="legendSwatch" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </button>
          );
        })}
      </div>
      <table className="dataTable">
        <caption>Alternative textuelle de l'indicateur de délai</caption>
        <thead>
          <tr>
            {table.columns.map(column => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map(row => (
            <tr key={String(row.label)}>
              {table.columns.map(column => (
                <td key={column.key}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function usePrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
