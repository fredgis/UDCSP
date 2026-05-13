import { useState } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { useLocation } from 'react-router-dom';
import { ChatWidget } from './ChatWidget';

/**
 * Floating "Citizen assistant" launcher visible on every authenticated page
 * except the chat-heavy ones (login, logout, demo scripts). Renders a small
 * pill button bottom-right; opens an embedded ChatWidget panel on click.
 */
export function ChatLauncher({ locale }: { locale: string }) {
  const isAuth = useIsAuthenticated();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  // Hide the launcher on flows where it would distract or overlap (login,
  // logout, public home). Citizens see it the moment they reach a service
  // page — that is when contextual help matters.
  const blocked = ['/login', '/logout-callback', '/'].includes(loc.pathname);
  if (blocked || !isAuth) return null;

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
          <ChatWidget locale={locale} />
        </div>
      )}
    </>
  );
}
