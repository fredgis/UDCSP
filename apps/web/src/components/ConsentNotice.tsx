import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type ConsentKey, isAllowed, onConsentChange } from '../utils/consent';

const LABELS: Record<ConsentKey, { title: string; reason: string }> = {
  crossBorder: {
    title: 'Cross-border eligibility checks are off',
    reason: 'You will need to upload supporting documents from the other country yourself — the platform cannot query DK · SE · NO registers on your behalf.',
  },
  notifications: {
    title: 'Status notifications are off',
    reason: 'You will not receive emails or SMS when the status of this case changes — check this page periodically.',
  },
  aiAssistant: {
    title: 'AI citizen assistant is off',
    reason: 'The chat assistant is hidden. Help text is limited to static labels.',
  },
  dataExport: {
    title: 'Data export to a third party is off',
    reason: 'You cannot push a portable copy of this case to an external service.',
  },
  analytics: {
    title: 'Anonymous analytics are off',
    reason: 'No anonymous interaction data is collected on this session.',
  },
  platformAudit: {
    title: 'Audit logging is off',
    reason: 'Required by law — cannot be disabled.',
  },
};

/**
 * Inline banner that appears on a feature page when the citizen has revoked
 * the consent that backs the feature. Subscribes to consent changes so it
 * appears/disappears within seconds of a save on the Consent page.
 */
export function ConsentNotice({ keys }: { keys: ConsentKey[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => onConsentChange(() => setTick((t) => t + 1)), []);
  // tick re-renders the component on each consent save (no state lookup needed
  // beyond the call to isAllowed below)
  void tick;

  const blocked = keys.filter((k) => !isAllowed(k));
  if (blocked.length === 0) return null;
  return (
    <aside className="consent-notice" role="status">
      <strong>Some platform help is currently disabled by your consent settings.</strong>
      <ul>
        {blocked.map((k) => (
          <li key={k}><strong>{LABELS[k].title}</strong> — {LABELS[k].reason}</li>
        ))}
      </ul>
      <p>
        Manage these on the <Link to="/consent">Consent &amp; privacy</Link> page.
      </p>
    </aside>
  );
}
