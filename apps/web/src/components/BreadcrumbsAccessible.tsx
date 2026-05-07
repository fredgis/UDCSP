import { Link } from 'react-router-dom';
export function BreadcrumbsAccessible({ items }: { items: Array<{ label: string; to?: string }> }) { return <nav aria-label="Breadcrumb"><ol className="breadcrumbs">{items.map((item, i) => <li key={item.label}>{item.to && i < items.length - 1 ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>; }
