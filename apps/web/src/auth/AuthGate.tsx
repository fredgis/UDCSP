import { ReactNode } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { Link, useLocation } from 'react-router-dom';

export function AuthGate({ children, title = 'Sign in required' }: { children: ReactNode; title?: string }) {
  const isAuth = useIsAuthenticated();
  const loc = useLocation();
  if (isAuth) return <>{children}</>;
  return (
    <section aria-labelledby="gate-title" className="auth-gate">
      <h1 id="gate-title">{title}</h1>
      <p>
        This area is reserved for authenticated citizens. Sign in or create an account on your country's national identity tenant —
        we'll bring you back to <code>{loc.pathname}</code> right after.
      </p>
      <p>
        <Link to="/login" className="button-primary">Sign in / create account</Link>
      </p>
      <p style={{ color: 'var(--color-fg-soft)', fontSize: '.9rem' }}>
        Why? Your case data, applications and consent settings are personal — they live in <strong>your country tenant</strong> (DK, SE or NO External ID) and require your authenticated identity to be read or written.
      </p>
    </section>
  );
}
