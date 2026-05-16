import { ReactNode } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { Link, useLocation } from 'react-router-dom';
import { countries, getCountry } from './msalConfig';
import { Flag } from '../components/Flag';

const COUNTRY_LABEL: Record<string, string> = {
  dk: 'Denmark', se: 'Sweden', no: 'Norway',
};
const COUNTRY_EID: Record<string, { label: string; sub: string }> = {
  dk: { label: 'MitID', sub: 'Danish national eID' },
  se: { label: 'BankID', sub: 'Swedish national eID' },
  no: { label: 'BankID Norge', sub: 'Norwegian national eID' },
};

export function AuthGate({ children, title = 'Sign in required' }: { children: ReactNode; title?: string }) {
  const isAuth = useIsAuthenticated();
  const loc = useLocation();
  if (isAuth) return <>{children}</>;

  const country = getCountry();
  const known = countries.find((c) => c.code === country);
  const label = COUNTRY_LABEL[country] ?? country.toUpperCase();
  const eid = COUNTRY_EID[country] ?? { label: 'national eID', sub: '' };
  const returnTo = loc.pathname + (loc.search || '');

  return (
    <section aria-labelledby="gate-title" className="auth-gate">
      <div className="auth-gate__hero">
        <span className="auth-gate__country" aria-label={`${label} citizen portal`}>
          {known && <Flag countryCode={country} ariaLabel={`${label} flag`} />} {label}
        </span>
        <h1 id="gate-title">{title}</h1>
        <p className="auth-gate__lede">
          You're a few seconds away. Sign in with your <strong>{eid.label}</strong>{eid.sub ? ` (${eid.sub})` : ''} or with email &amp; password — we'll bring you straight back here.
        </p>

        <div className="auth-gate__cta">
          <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="button-primary auth-gate__primary">
            Sign in / create account
          </Link>
          <Link to="/" className="auth-gate__secondary">← Back to home</Link>
        </div>

        <p className="auth-gate__return">
          You'll return to <code>{returnTo}</code> automatically.
        </p>
      </div>

      <ul className="auth-gate__benefits" aria-label="Why you need to sign in">
        <li>
          <span className="auth-gate__icon" aria-hidden="true">🔐</span>
          <div>
            <strong>Your data stays in your country tenant</strong>
            <p>Cases, applications and consents live in the {label} External ID directory — no cross-border copies.</p>
          </div>
        </li>
        <li>
          <span className="auth-gate__icon" aria-hidden="true">🛂</span>
          <div>
            <strong>One identity, every service</strong>
            <p>Sign in once with {eid.label}; child benefit, residency transfer, tax certificate and case follow-up all unlock.</p>
          </div>
        </li>
        <li>
          <span className="auth-gate__icon" aria-hidden="true">🧠</span>
          <div>
            <strong>You stay in control</strong>
            <p>Granular consent controls, full audit trail, EU AI Act compliant — revoke at any time from <Link to="/consent">Consent center</Link>.</p>
          </div>
        </li>
      </ul>
    </section>
  );
}
