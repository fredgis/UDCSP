import { Link } from 'react-router-dom';
const sample = [{ id: 'CASE-2026-001', title: 'Residency transfer', status: 'In review', updatedAt: '2026-05-07' }];
export function MyCasesPage() { return <section><h1>My cases</h1><ul>{sample.map(c => <li key={c.id}><Link to={`/cases/${c.id}`}>{c.title}</Link> — {c.status} — <time>{c.updatedAt}</time></li>)}</ul></section>; }
