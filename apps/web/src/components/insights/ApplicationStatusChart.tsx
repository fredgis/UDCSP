import { useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './styles.module.css';
import { buildSingleSeriesTable } from './accessibility';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export type ApplicationStatusDatum = {
  status: string;
  count: number;
};

export type ApplicationStatusChartProps = {
  data: ApplicationStatusDatum[];
  title?: string;
};

const palette = ['#12436d', '#207f3b', '#801650', '#6f4e7c', '#8f1d21'];

export function ApplicationStatusChart({ data, title = 'Mes demandes par statut' }: ApplicationStatusChartProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(() => new Set());
  const labels = data.map(item => item.status);
  const table = buildSingleSeriesTable(
    labels,
    data.map(item => item.count),
    'Nombre de demandes',
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Demandes',
        data: data.map(item => (hiddenStatuses.has(item.status) ? 0 : item.count)),
        backgroundColor: data.map((_, index) => palette[index % palette.length]),
        borderColor: '#0b0c0c',
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    animation: prefersReducedMotion ? false : { duration: 350 },
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: { ticks: { color: '#0b0c0c' }, grid: { color: '#d0d7de' } },
      y: { beginAtZero: true, ticks: { color: '#0b0c0c', precision: 0 }, grid: { color: '#d0d7de' } },
    },
  };

  return (
    <section className="insightsCard" aria-labelledby="application-status-title">
      <h2 id="application-status-title">{title}</h2>
      <div className="chartRegion" role="img" aria-label={`${title}. Les données détaillées suivent dans le tableau.`}>
        <Bar data={chartData} options={options} aria-label={title} />
      </div>
      <div className="legend" aria-label="Légende interactive des statuts">
        {data.map((item, index) => {
          const visible = !hiddenStatuses.has(item.status);
          return (
            <button
              aria-pressed={visible}
              className="legendButton"
              key={item.status}
              onClick={() =>
                setHiddenStatuses(current => {
                  const next = new Set(current);
                  if (next.has(item.status)) next.delete(item.status);
                  else next.add(item.status);
                  return next;
                })
              }
              type="button"
            >
              <span className="legendSwatch" style={{ backgroundColor: palette[index % palette.length] }} />
              {item.status}
            </button>
          );
        })}
      </div>
      <table className="dataTable">
        <caption>Alternative textuelle du graphique Mes demandes par statut</caption>
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
