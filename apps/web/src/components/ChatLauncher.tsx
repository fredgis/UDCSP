import { useEffect, useState } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { Link, useLocation } from 'react-router-dom';
import { ChatWidget } from './ChatWidget';
import { isAllowed, onConsentChange } from '../utils/consent';

/**
 * Floating "Citizen assistant" launcher visible on every authenticated page
 * except the chat-heavy ones (login, logout, demo scripts). Renders a small
 * pill button bottom-right; opens an embedded ChatWidget panel on click.
 *
 * Gated by the `aiAssistant` consent (Consent &amp; Privacy page). When the
 * citizen revokes that consent the launcher disappears within seconds —
 * pending requests in flight finish, no new ones are issued.
 */
export function ChatLauncher({ locale }: { locale: string }) {
  const isAuth = useIsAuthenticated();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(() => isAllowed('aiAssistant'));

  useEffect(() => onConsentChange(() => setAllowed(isAllowed('aiAssistant'))), []);

  const blocked = ['/login', '/logout-callback', '/'].includes(loc.pathname);
  if (blocked || !isAuth || !allowed) return null;

  return (
    <>
      <button
        type="button"
        className="chat-launcher__btn"
        aria-expanded={open}
        aria-controls="chat-launcher-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{open ? '✕' : '💬'}</span>
        <span className="visually-hidden">{open ? 'Close assistant' : 'Open citizen assistant'}</span>
      </button>
      {open && (
        <div id="chat-launcher-panel" className="chat-launcher__panel" role="dialog" aria-label="Citizen assistant">
          <p className="chat-launcher__consent-hint">
            AI consent active. Manage on <Link to="/consent">Consent &amp; privacy</Link>.
          </p>
          <ChatWidget locale={locale} />
        </div>
      )}
    </>
  );
}

