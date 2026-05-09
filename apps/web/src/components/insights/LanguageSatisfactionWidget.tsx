import { useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './styles.module.css';
import { buildMultiDatasetTable } from './accessibility';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export type SatisfactionPoint = {
  period: string;
  score: number;
};

export type LanguageSatisfactionWidgetProps = {
  locale: string;
  data: SatisfactionPoint[];
};

export function LanguageSatisfactionWidget({ locale, data }: LanguageSatisfactionWidgetProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(true);
  const labels = data.map(point => point.period);
  const scores = data.map(point => point.score);
  const datasetLabel = `CSAT ${locale}`;
  const table = buildMultiDatasetTable(labels, [{ label: datasetLabel, data: scores }]);

  const chartData = {
    labels,
    datasets: [
      {
        label: datasetLabel,
        data: visible ? scores : scores.map(() => 0),
        borderColor: '#12436d',
        backgroundColor: '#12436d',
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#12436d',
        pointRadius: 4,
        tension: prefersReducedMotion ? 0 : 0.25,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    animation: prefersReducedMotion ? false : { duration: 350 },
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { ticks: { color: '#0b0c0c' }, grid: { color: '#d0d7de' } },
      y: { min: 0, max: 5, ticks: { color: '#0b0c0c' }, grid: { color: '#d0d7de' } },
    },
  };

  return (
    <section className="insightsCard" aria-labelledby="language-satisfaction-title">
      <h2 id="language-satisfaction-title">Satisfaction linguistique</h2>
      <p>Données agrégées et anonymisées pour la langue {locale}.</p>
      <div
        className="sparklineRegion"
        role="img"
        aria-label={`Évolution du score CSAT anonymisé pour la langue ${locale}.`}
      >
        <Line data={chartData} options={options} aria-label="Courbe de satisfaction linguistique" />
      </div>
      <div className="legend" aria-label="Légende interactive de la satisfaction linguistique">
        <button aria-pressed={visible} className="legendButton" onClick={() => setVisible(current => !current)} type="button">
          <span className="legendSwatch" style={{ backgroundColor: '#12436d' }} />
          {datasetLabel}
        </button>
      </div>
      <table className="dataTable">
        <caption>Alternative textuelle de la satisfaction linguistique</caption>
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
