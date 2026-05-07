import { useParams } from 'react-router-dom';
export function CaseDetailPage() { const { id } = useParams(); return <article><h1>Case {id}</h1><p>Status: In review. Decisions are made by authorised caseworkers.</p><ol><li>Application received</li><li>AI pre-assessment attached for human review</li><li>Awaiting partner confirmation</li></ol></article>; }
