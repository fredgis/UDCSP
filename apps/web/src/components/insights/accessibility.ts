export type AccessibleTableCell = string | number;

export type AccessibleTableColumn = {
  key: string;
  label: string;
};

export type AccessibleTableRow = Record<string, AccessibleTableCell>;

export type AccessibleDataset = {
  label: string;
  data: number[];
};

export type AccessibleTable = {
  columns: AccessibleTableColumn[];
  rows: AccessibleTableRow[];
};

const numberFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export function formatAccessibleNumber(value: number): string {
  return numberFormatter.format(value);
}

export function buildSingleSeriesTable(
  labels: string[],
  values: number[],
  valueLabel: string,
): AccessibleTable {
  return {
    columns: [
      { key: 'label', label: 'Catégorie' },
      { key: 'value', label: valueLabel },
    ],
    rows: labels.map((label, index) => ({
      label,
      value: formatAccessibleNumber(values[index] ?? 0),
    })),
  };
}

export function buildMultiDatasetTable(labels: string[], datasets: AccessibleDataset[]): AccessibleTable {
  return {
    columns: [
      { key: 'label', label: 'Période' },
      ...datasets.map(dataset => ({ key: toTableKey(dataset.label), label: dataset.label })),
    ],
    rows: labels.map((label, index) => ({
      label,
      ...Object.fromEntries(
        datasets.map(dataset => [toTableKey(dataset.label), formatAccessibleNumber(dataset.data[index] ?? 0)]),
      ),
    })),
  };
}

export function toTableKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
